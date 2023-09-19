from datetime import datetime
from pytz import timezone

from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.schema import Sequence

from app.api.utils.models_mixins import Base, SoftDeleteMixin, AuditMixin, PermitMixin
from sqlalchemy import func

from app.extensions import db


class ExplosivesPermitAmendment(SoftDeleteMixin, AuditMixin, PermitMixin, Base):
    __tablename__ = 'explosives_permit_amendment'

    explosives_permit_amendment_guid = db.Column(
        UUID(as_uuid=True), primary_key=True, server_default=db.FetchedValue())
    explosives_permit_amendment_id = db.Column(
        db.Integer, server_default=db.FetchedValue(), nullable=False, unique=True)

    permit_number = db.Column(db.String)

    explosives_permit_id = db.Column(
        db.Integer, db.ForeignKey('explosives_permit.explosives_permit_id'), nullable=False)

    explosives_permit = db.relationship(
        'ExplosivesPermit',
        primaryjoin='ExplosivesPermit.explosives_permit_id == ExplosivesPermitAmendment.explosives_permit_id',
        backref='explosives_permit_amendments'
    )

    def __repr__(self):
        return f'<{self.__class__.__name__} {self.explosives_permit_amendment_id}>'

    @classmethod
    def get_next_application_number(cls):
        now = datetime.now(timezone('US/Pacific'))
        month = now.strftime('%m')
        year = now.strftime('%Y')

        sequence = Sequence('explosives_permit_application_number_sequence')
        next_value = sequence.next_value()
        return func.concat(next_value, f'-{year}-{month}')

    @classmethod
    def create(cls,
               mine,
               permit_guid,
               explosives_permit_id,
               application_date,
               originating_system,
               latitude,
               longitude,
               description,
               issue_date,
               expiry_date,
               permit_number,
               issuing_inspector_party_guid,
               mine_manager_mine_party_appt_id,
               permittee_mine_party_appt_id,
               is_closed,
               closed_reason,
               closed_timestamp,
               now_application_guid=None,
               add_to_session=True):

        application_number = None
        received_timestamp = None

        if originating_system == 'MMS':
            application_status = 'APP'
        else:
            application_status = 'REC'
            application_number = ExplosivesPermitAmendment.get_next_application_number()
            received_timestamp = datetime.utcnow()
            is_closed = False
            permit_number = None
            issue_date = None
            expiry_date = None
        if is_closed:
            if closed_timestamp is None:
                closed_timestamp = datetime.utcnow()
        else:
            closed_reason = None
            closed_timestamp = None

        explosives_permit_amendment = cls(
            permit_guid=permit_guid,
            explosives_permit_id=explosives_permit_id,
            application_status=application_status,
            application_number=application_number,
            received_timestamp=received_timestamp,
            application_date=application_date,
            originating_system=originating_system,
            latitude=latitude,
            longitude=longitude,
            description=description,
            issue_date=issue_date,
            expiry_date=expiry_date,
            permit_number=permit_number,
            issuing_inspector_party_guid=issuing_inspector_party_guid,
            mine_manager_mine_party_appt_id=mine_manager_mine_party_appt_id,
            permittee_mine_party_appt_id=permittee_mine_party_appt_id,
            is_closed=is_closed,
            closed_reason=closed_reason,
            closed_timestamp=closed_timestamp,
            now_application_guid=now_application_guid)

        mine.explosives_permits_amendments.append(explosives_permit_amendment)

        if add_to_session:
            explosives_permit_amendment.save(commit=False)
        return explosives_permit_amendment

    def delete(self, commit=True):
        super(ExplosivesPermitAmendment, self).delete(commit)

    @classmethod
    def find_by_explosives_permit_amendment_guid(cls, explosives_permit_amendment_guid):
        return cls.query.filter_by(
            explosives_permit_amendment_guid=explosives_permit_amendment_guid, deleted_ind=False).one_or_none()

    def update(self,
               permit_guid,
               now_application_guid,
               issuing_inspector_party_guid,
               mine_manager_mine_party_appt_id,
               permittee_mine_party_appt_id,
               application_status,
               issue_date,
               expiry_date,
               decision_reason,
               is_closed,
               closed_reason,
               closed_timestamp,
               latitude,
               longitude,
               application_date,
               description,
               add_to_session=True):

        # Update simple properties.
        self.permit_guid = permit_guid
        self.now_application_guid = now_application_guid
        self.issuing_inspector_party_guid = issuing_inspector_party_guid
        self.mine_manager_mine_party_appt_id = mine_manager_mine_party_appt_id
        self.permittee_mine_party_appt_id = permittee_mine_party_appt_id
        self.application_date = application_date
        self.description = description
        self.issue_date = issue_date
        self.expiry_date = expiry_date
        self.latitude = latitude
        self.longitude = longitude

        # Check for permit closed changes.
        self.is_closed = is_closed
        if is_closed:
            self.closed_reason = closed_reason
            self.closed_timestamp = closed_timestamp if closed_timestamp else datetime.utcnow()
            self.application_status = 'REJ'
        else:
            self.closed_reason = None
            self.closed_timestamp = None

            # Check for application status changes or application is Approved to regenerate permit and letter.
        if application_status:
            if application_status != 'REC' and application_status != 'APP':
                self.decision_timestamp = datetime.utcnow()
                self.decision_reason = decision_reason

        self.application_status = application_status

        if add_to_session:
            self.save(commit=False)
        return self
