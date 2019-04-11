from decimal import Decimal
import uuid
from datetime import datetime
import json

from flask import request, make_response, current_app
from flask_restplus import Resource, reqparse, inputs
from sqlalchemy_filters import apply_sort, apply_pagination, apply_filters
from werkzeug.exceptions import BadRequest, InternalServerError, NotFound

from ...status.models.mine_status import MineStatus
from ...status.models.mine_status_xref import MineStatusXref

from ..models.mine_type import MineType
from ..models.mine_type_detail import MineTypeDetail

from ..models.mine import Mine
from ..models.mineral_tenure_xref import MineralTenureXref
from ...location.models.mine_location import MineLocation
from ...location.models.mine_map_view_location import MineMapViewLocation
from ....utils.random import generate_mine_no
from app.extensions import api, cache, db
from ....utils.access_decorators import requires_role_mine_view, requires_role_mine_create, requires_any_of, MINE_VIEW, MINESPACE_PROPONENT
from ....utils.resources_mixins import UserMixin, ErrorMixin
from ....constants import MINE_MAP_CACHE, TIMEOUT_12_HOURS
# FIXME: Model import from outside of its namespace
# This breaks micro-service architecture and is done
# for search performance until search can be refactored
from ....permits.permit.models.permit import Permit


class MineResource(Resource, UserMixin, ErrorMixin):
    parser = reqparse.RequestParser()
    parser.add_argument(
        'mine_name', type=str, help='Name of the mine.', trim=True, store_missing=False)
    parser.add_argument(
        'mine_note',
        type=str,
        help='Any additional notes to be added to the mine.',
        trim=True,
        store_missing=False)
    parser.add_argument(
        'tenure_number_id',
        type=int,
        help='Tenure number for the mine.',
        trim=True,
        store_missing=False)
    parser.add_argument(
        'longitude',
        type=lambda x: Decimal(x) if x else None,
        help='Longitude point for the mine.',
        store_missing=False)
    parser.add_argument(
        'latitude',
        type=lambda x: Decimal(x) if x else None,
        help='Latitude point for the mine.',
        store_missing=False)
    parser.add_argument(
        'mine_status',
        action='split',
        help=
        'Status of the mine, to be given as a comma separated string value. Ex: status_code, status_reason_code, status_sub_reason_code ',
        store_missing=False)
    parser.add_argument(
        'major_mine_ind',
        type=inputs.boolean,
        help='Indication if mine is major_mine_ind or regional. Accepts "true", "false", "1", "0".',
        store_missing=False)
    parser.add_argument(
        'mine_region', type=str, help='Region for the mine.', trim=True, store_missing=False)

    @api.doc(
        params={
            'mine_no_or_guid':
            'Mine number or guid. If not provided a paginated list of mines will be returned.',
            'sort_field':
            'enum[mine_name, mine_no, mine_operation_status_code, mine_region] Default: mine_name',
            'sort_dir':
            'enum[asc, desc] Default: asc'
        })

    @requires_any_of([MINE_VIEW, MINESPACE_PROPONENT])
    def get(self, mine_no_or_guid=None):
        if mine_no_or_guid:
            mine = Mine.find_by_mine_no_or_guid(mine_no_or_guid)
            if mine:
                return mine.json()
            return self.create_error_payload(404, 'Mine not found'), 404
        else:
            # Handle MapView request
            _map = request.args.get('map', None, type=str)
            if _map and _map.lower() == 'true':

                # Below caches the mine map response object in redis with a timeout.
                # Generating and jsonifying the map data takes 4-7 seconds with 50,000 points,
                # so caching seems justified.
                #
                # TODO: Use some custom representation of this data vs JSON. The
                # json string is massive (with 50,000 points: 16mb uncompressed, 2.5mb compressed).
                # A quick test using delimented data brings this down to ~1mb compressed.
                map_result = cache.get(MINE_MAP_CACHE)
                last_modified = cache.get(MINE_MAP_CACHE + '_LAST_MODIFIED')
                if not map_result:
                    records = MineMapViewLocation.query.filter(MineMapViewLocation.latitude != None)
                    last_modified = datetime.utcnow()

                    # jsonify then store in cache
                    map_result = json.dumps(
                        {
                            'mines': list((map(lambda x: x.json_for_map(), records)))
                        },
                        separators=(',', ':'))
                    cache.set(MINE_MAP_CACHE, map_result, timeout=TIMEOUT_12_HOURS)
                    cache.set(
                        MINE_MAP_CACHE + '_LAST_MODIFIED', last_modified, timeout=TIMEOUT_12_HOURS)

                # It's more efficient to store the json to avoid re-initializing all of the objects
                # and jsonifying on every request, so a flask response is returned to prevent
                # flask_restplus from jsonifying the data again, which would mangle the json.
                response = make_response(map_result)
                response.headers['content-type'] = 'application/json'

                # While we're at it, let's set a last modified date and have flask return not modified
                # if it hasn't so the client doesn't download it again unless needed.
                response.last_modified = last_modified
                response.make_conditional(request)

                return response

            paginated_mine_query, pagination_details = self.apply_filter_and_search(request.args)
            mines = paginated_mine_query.all()
            return {
                'mines': list(map(lambda x: x.json_for_list(), mines)),
                'current_page': pagination_details.page_number,
                'total_pages': pagination_details.num_pages,
                'items_per_page': pagination_details.page_size,
                'total': pagination_details.total_results,
            }

    def apply_filter_and_search(self, args):
        sort_models = {
            'mine_name': 'Mine',
            'mine_no': 'Mine',
            'mine_region': 'Mine',
            'mine_operation_status_code': 'MineStatusXref'
        }
        # Handle ListView request
        items_per_page = args.get('per_page', 25, type=int)
        page = args.get('page', 1, type=int)
        sort_field = args.get('sort_field', 'mine_name', type=str)
        sort_dir = args.get('sort_dir', 'asc', type=str)
        sort_model = sort_models.get(sort_field)
        search_term = args.get('search', None, type=str)
        # Filters to be applied
        commodity_filter_terms = args.get('commodity', None, type=str)
        status_filter_term = args.get('status', None, type=str)
        tenure_filter_term = args.get('tenure', None, type=str)
        region_code_filter_term = args.get('region', None, type=str)
        major_mine_filter_term = args.get('major', None, type=str)
        tsf_filter_term = args.get('tsf', None, type=str)
        # Base query:
        mines_query = Mine.query
        # Filter by search_term if provided
        if search_term:
            search_term = search_term.strip()
            name_filter = Mine.mine_name.ilike('%{}%'.format(search_term))
            number_filter = Mine.mine_no.ilike('%{}%'.format(search_term))
            permit_filter = Permit.permit_no.ilike('%{}%'.format(search_term))
            mines_name_query = Mine.query.filter(name_filter | number_filter)
            permit_query = Mine.query.join(Permit).filter(permit_filter)
            mines_query = mines_name_query.union(permit_query)
        # Filter by Major Mine, if provided
        if major_mine_filter_term == "true" or major_mine_filter_term == "false":
            major_mine_filter = Mine.major_mine_ind.is_(major_mine_filter_term == "true")
            major_mine_query = Mine.query.filter(major_mine_filter)
            mines_query = mines_query.intersect(major_mine_query)
        # Filter by TSF, if provided
        if tsf_filter_term == "true" or tsf_filter_term == "false":
            tsf_filter = Mine.mine_tailings_storage_facilities != None if tsf_filter_term == "true" else \
                Mine.mine_tailings_storage_facilities == None
            tsf_query = Mine.query.filter(tsf_filter)
            mines_query = mines_query.intersect(tsf_query)
        # Filter by region, if provided
        if region_code_filter_term:
            region_filter_term_array = region_code_filter_term.split(',')
            region_filter = Mine.mine_region.in_(region_filter_term_array)
            region_query = Mine.query.filter(region_filter)
            mines_query = mines_query.intersect(region_query)
        # Filter by commodity if provided
        if commodity_filter_terms:
            commodity_filter_term_array = commodity_filter_terms.split(',')
            commodity_filter = MineTypeDetail.mine_commodity_code.in_(commodity_filter_term_array)
            mine_type_active_filter = MineType.active_ind.is_(True)
            commodity_query = Mine.query \
                .join(MineType) \
                .join(MineTypeDetail) \
                .filter(commodity_filter, mine_type_active_filter)
            mines_query = mines_query.intersect(commodity_query)
        # Create a filter on tenure if one is provided
        if tenure_filter_term:
            tenure_filter_term_array = tenure_filter_term.split(',')
            tenure_filter = MineType.mine_tenure_type_code.in_(tenure_filter_term_array)
            mine_type_active_filter = MineType.active_ind.is_(True)
            tenure_query = Mine.query \
                .join(MineType) \
                .filter(tenure_filter, mine_type_active_filter)
            mines_query = mines_query.intersect(tenure_query)
        # Create a filter on mine status if one is provided
        if status_filter_term:
            status_filter_term_array = status_filter_term.split(',')
            status_filter = MineStatusXref.mine_operation_status_code.in_(status_filter_term_array)
            status_reason_filter = MineStatusXref.mine_operation_status_reason_code.in_(
                status_filter_term_array)
            status_subreason_filter = MineStatusXref.mine_operation_status_sub_reason_code.in_(
                status_filter_term_array)
            all_status_filter = status_filter | status_reason_filter | status_subreason_filter
            status_query = Mine.query \
                .join(MineStatus) \
                .join(MineStatusXref) \
                .filter(all_status_filter)
            mines_query = mines_query.intersect(status_query)
        deleted_filter = [{'field': 'deleted_ind', 'op': '==', 'value': 'False'}]
        mines_query = apply_filters(mines_query, deleted_filter)

        # Apply sorting
        if sort_model and sort_field and sort_dir:
            mines_query = mines_query.outerjoin(MineStatus).outerjoin(MineStatusXref)
            sort_criteria = [{'model': sort_model, 'field': sort_field, 'direction': sort_dir}]
            mines_query = apply_sort(mines_query, sort_criteria)

        return apply_pagination(mines_query, page, items_per_page)

    def mine_operation_code_processor(self, mine_status, index):
        try:
            return mine_status[index].strip()
        except IndexError:
            return None

    def mine_status_processor(self, mine_status, mine):
        if not mine_status:
            return mine.mine_status

        current_app.logger.info(f'updating mine no={mine.mine_no} to new_status={mine_status}')
        try:
            mine_status_xref = MineStatusXref.find_by_codes(
                self.mine_operation_code_processor(mine_status, 0),
                self.mine_operation_code_processor(mine_status, 1),
                self.mine_operation_code_processor(mine_status, 2))
            if not mine_status_xref:
                raise BadRequest(
                    'Invalid status_code, reason_code, and sub_reason_code combination.')

            existing_status = mine.mine_status[0] if mine.mine_status else None
            if existing_status:
                if existing_status.mine_status_xref_guid == mine_status_xref.mine_status_xref_guid:
                    return existing_status

                existing_status.expiry_date = datetime.today()
                existing_status.active_ind = False
                existing_status.save()

            new_status = MineStatus(mine_status_xref_guid=mine_status_xref.mine_status_xref_guid)
            mine.mine_status.append(new_status)
            new_status.save()

        except AssertionError as e:
            self.raise_error(400, 'Error: {}'.format(e))
        mine.save(commit=False)
        return new_status

    def _throw_error_if_mine_exists(self, mine_name):
        # query the mine tables and check if that mine name exists
        if mine_name:
            name_filter = Mine.mine_name.ilike(mine_name.strip())
            mines_name_query = Mine.query.filter(name_filter)
            mines_with_name = mines_name_query.all()
            if len(mines_with_name) > 0:
                raise BadRequest(f'Mine No: {mines_with_name[0].mine_no} already has that name.')

    @api.expect(parser)
    @requires_role_mine_create
    def post(self, mine_no_or_guid=None):
        if mine_no_or_guid:
            self.raise_error(400, 'Error: Unexpected mine number in Url.'), 400

        data = self.parser.parse_args()

        lat = data.get('latitude')
        lon = data.get('longitude')
        if (lat and not lon) or (not lat and lon):
            raise BadRequest('latitude and longitude must both be empty, or both provided')

        # query the mine tables and check if that mine name exists
        self._throw_error_if_mine_exists(data.get('mine_name'))
        mine = Mine(
            mine_no=generate_mine_no(),
            mine_name=data.get('mine_name'),
            mine_note=data.get('mine_note'),
            major_mine_ind=data.get('major_mine_ind'),
            mine_region=data.get('mine_region'))

        db.session.add(mine)

        if lat and lon:
            mine.mine_location = MineLocation(latitude=lat, longitude=lon)
            cache.delete(MINE_MAP_CACHE)

        mine_status = self.mine_status_processor(data.get('mine_status'), mine)
        db.session.commit()

        return {
            'mine_guid': str(mine.mine_guid),
            'mine_no': mine.mine_no,
            'mine_name': mine.mine_name,
            'mine_note': mine.mine_note,
            'major_mine_ind': mine.major_mine_ind,
            'latitude': str(mine.mine_location.latitude) if mine.mine_location else None,
            'longitude': str(mine.mine_location.longitude) if mine.mine_location else None,
            'mine_status': mine_status.json() if mine_status else None,
            'mine_region': mine.mine_region if mine.mine_region else None,
        }

    @api.expect(parser)
    @requires_role_mine_create
    def put(self, mine_no_or_guid):
        mine = Mine.find_by_mine_no_or_guid(mine_no_or_guid)
        if not mine:
            raise NotFound("Mine not found")

        data = self.parser.parse_args()

        tenure = data.get('tenure_number_id')

        lat = data.get('latitude')
        lon = data.get('longitude')
        if (lat and not lon) or (not lat and lon):
            raise BadRequest('latitude and longitude must both be empty, or both provided')

        # if (not tenure and not (lat and lon) and not mine_name and not mine_note and not status
        #         and not region and major_mine_ind is None):
        #     self.raise_error(400, 'Error: No fields filled.')

        # Mine Detail
        if 'mine_name' in data and mine.mine_name != data['mine_name']:
            self._throw_error_if_mine_exists(data['mine_name'])
            mine.mine_name = data['mine_name']
        if 'mine_note' in data:
            mine.mine_note = data['mine_note']
        if 'major_mine_ind' in data:
            mine.major_mine_ind = data['major_mine_ind']
        if 'mine_region' in data:
            mine.mine_region = data['mine_region']
        mine.save()

        # Tenure validation
        if tenure:
            tenure_exists = MineralTenureXref.find_by_tenure(tenure)
            if tenure_exists:
                if tenure_exists.mine_guid == mine.mine_guid:
                    raise BadRequest('Error: Field tenure_id already exists for this mine.')

            tenure = MineralTenureXref(
                mineral_tenure_xref_guid=uuid.uuid4(),
                mine_guid=mine.mine_guid,
                tenure_number_id=tenure)

            tenure.save()

        if mine.mine_location:
            #update existing record
            if "latitude" in data:
                mine.mine_location.latitude = data['latitude']
            if "longitude" in data:
                mine.mine_location.longitude = data['longitude']
            mine.mine_location.save()

        elif data.get('latitude') and data.get('longitude') and not mine.mine_location:
            mine.mine_location = MineLocation(
                latitude=data['latitude'], longitude=data['longitude'])
            mine.save()
            cache.delete(MINE_MAP_CACHE)

        # Status validation
        self.mine_status_processor(data.get('mine_status'), mine)
        return mine.json()


class MineListSearch(Resource):
    @api.doc(
        params={
            'name': 'Search term in mine name.',
            'term': 'Search term in mine name, mine number, and permit.'
        })
    @requires_any_of([MINE_VIEW, MINESPACE_PROPONENT])
    def get(self):
        name_search = request.args.get('name')
        search_term = request.args.get('term')
        if search_term:
            mines = Mine.find_by_name_no_permit(search_term)
        else:
            mines = Mine.find_by_mine_name(name_search)
        result = list(map(lambda x: {**x.json_by_name(), **x.json_by_location()}, mines))
        return {'mines': result}
