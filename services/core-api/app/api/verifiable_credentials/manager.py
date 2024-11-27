# for midware/business level actions between requests and data access
import json
import requests

from datetime import datetime, date
from dateutil.relativedelta import relativedelta
from uuid import uuid4, UUID
from sqlalchemy.exc import IntegrityError
from typing import List, Union, Tuple, Optional, Any
from pydantic import BaseModel, Field, ConfigDict
from openlocationcode.openlocationcode import encode as plus_code_encode
from hashlib import md5
from zoneinfo import ZoneInfo
from time import sleep
from typing import List
from flask import current_app

from app.tasks.celery import celery

from app.extensions import db
from app.config import Config
from app.api.utils.feature_flag import Feature, is_feature_enabled

from app.api.mines.permits.permit.models.permit import Permit
from app.api.mines.permits.permit_amendment.models.permit_amendment import PermitAmendment
from app.api.parties.party_appt.models.mine_party_appt import MinePartyAppointment
from app.api.verifiable_credentials.models.credentials import PartyVerifiableCredentialMinesActPermit
from app.api.verifiable_credentials.models.connection import PartyVerifiableCredentialConnection
from app.api.verifiable_credentials.models.orgbook_publish_status import PermitAmendmentOrgBookPublish
from app.api.services.traction_service import TractionService
from app.api.services.orgbook_publisher import OrgbookPublisherService

from untp_models import codes, base, conformity_credential as cc


class UNTPCCMinesActPermit(cc.ConformityAttestation):
    type: List[str] = ["ConformityAttestation", "MinesActPermit"]
    permitNumber: str


W3C_CRED_ID_PREFIX = f"{Config.ORGBOOK_PUBLISHER_BASE_URL}/credentials/"

permit_amendments_for_orgbook_query = """
    select pa.permit_amendment_guid, p.party_guid, pmt.permit_no
 
    from party_orgbook_entity poe
    inner join party p on poe.party_guid = p.party_guid
    inner join mine_party_appt mpa on p.party_guid = mpa.party_guid
    inner join permit pmt on pmt.permit_id = mpa.permit_id
    inner join permit_amendment pa on pa.permit_id = pmt.permit_id
    inner join mine m on pa.mine_guid = m.mine_guid
    
    where mpa.permit_id is not null
    and mpa.mine_party_appt_type_code = 'PMT'
    and mpa.deleted_ind = false
    and mpa.start_date <= pa.issue_date
    and (mpa.end_date > pa.issue_date OR mpa.end_date is null or mpa.end_date = '9999-12-31')
    and m.major_mine_ind = true
    and pa.deleted_ind = false
    and pmt.permit_status_code = 'O'
    and substring(pmt.permit_no,2,1) != 'X'

    group by pa.permit_amendment_guid, p.party_guid, pa.description, pa.issue_date, pa.permit_amendment_status_code, pmt.permit_no, mpa.permit_id, poe.party_guid, p.party_name, poe.name_text, poe.registration_id, m.mine_name, mine_party_appt_type_code
    order by pmt.permit_no, pa.issue_date;
"""


#this should probably be imported from somewhere.
class W3CCred(BaseModel):
    #based on VCDM 2.0. https://www.w3.org/TR/vc-data-model-2.0/
    model_config = ConfigDict(
        populate_by_name=True, json_encoders={datetime: lambda v: v.isoformat()})

    context: List[Union[str, dict]] = Field(
        alias="@context",
        default=[
            "https://www.w3.org/ns/credentials/v2",
            Config.UNTP_DIGITAL_CONFORMITY_CREDENTIAL_CONTEXT,
            Config.UNTP_BC_MINES_ACT_PERMIT_CONTEXT,
        ])
    id: str | None
    type: List[str]
    issuer: Union[str, dict[str, str]]
    validFrom: str
    credentialSubject: UNTPCCMinesActPermit
    credentialSchema: List[dict]


def convert_date_to_iso_datetime(dt: datetime | date) -> str:
    return datetime(dt.year, dt.month, dt.day, 0, 0, 0, tzinfo=ZoneInfo("UTC")).isoformat()


@celery.task()
def revoke_all_credentials_for_permit(permit_guid: str, mine_guid: str, reason: str):
    cred_exch = PartyVerifiableCredentialMinesActPermit.find_by_permit_guid_and_mine_guid(
        permit_guid, mine_guid)
    for ce in cred_exch:
        traction_svc = TractionService()
        connection = PartyVerifiableCredentialConnection.find_active_by_party_guid(ce.party_guid)
        if ce.cred_exch_state in PartyVerifiableCredentialMinesActPermit._active_credential_states:
            traction_svc.revoke_credential(connection.connection_id, ce.rev_reg_id, ce.cred_rev_id,
                                           reason)

            attempts = 0
            while not ce.cred_rev_id:
                sleep(1)
                db.session.refresh(cred_exch)
                attempts += 1
                if attempts > 60:
                    ce.error_description = "Never received webhook confirming revokation credential"
                    ce.save()
                    raise Exception("Never received webhook confirming revokation credential")

        if ce.cred_exch_state in PartyVerifiableCredentialMinesActPermit._pending_credential_states:
            traction_svc.send_issue_credential_problem_report(ce.cred_exch_id, "problem_report")
            #problem reports set the state to abandoned in both agents, cannot continue afterwards

    info_str = f"revoked all credentials for permit_guid={permit_guid} and mine_guid={mine_guid}"
    current_app.logger.warning(info_str)         # not sure where to find this.

    return info_str


@celery.task()
def offer_newest_amendment_to_current_permittee(permit_amendment_guid: str,
                                                cred_type: str = Config.CRED_DEF_ID_MINES_ACT_PERMIT
                                                ):
    """Revoke the existing credential and offer a new one with the newest amendment."""
    newest_amendment = PermitAmendment.find_by_permit_amendment_guid(permit_amendment_guid)

    permit = Permit.find_by_permit_guid(newest_amendment.permit_guid)
    if permit.current_permittee_digital_wallet_connection_state != "active":
        return "Permittee's wallet connection is not active, do not issue credential."

    connection = PartyVerifiableCredentialConnection.find_active_by_party_guid(
        permit.current_permittee_guid)

    attributes = VerifiableCredentialManager.collect_attributes_for_mines_act_permit_111(
        newest_amendment)

    traction_svc = TractionService()
    response = traction_svc.offer_mines_act_permit_111(connection.connection_id, attributes)
    map_vc = PartyVerifiableCredentialMinesActPermit(
        cred_exch_id=response["credential_exchange_id"],
        cred_type=cred_type,
        party_guid=permit.current_permittee_guid,
        permit_amendment_guid=newest_amendment.permit_amendment_guid)

    map_vc.save()

    info_str = f"offer new_cred_exchange{response['credential_exchange_id']} for permit_amendment_guid={newest_amendment.permit_amendment_guid}"
    current_app.logger.warning(info_str)         # not sure where to find this.

    return info_str


@celery.task()
def process_all_untp_map_for_orgbook():
    """Find all permit amendments connected to orgbook verified parties, preprocess and sign any new credentials."""

    # https://metabase-4c2ba9-prod.apps.silver.devops.gov.bc.ca/question/2937-permit-amendments-for-each-party-orgbook-entity

    permit_amendment_query_results = db.session.execute(
        permit_amendments_for_orgbook_query).fetchall()

    current_app.logger.info("Num of results from query to process:" +
                            str(len(permit_amendment_query_results)))

    traction_service = TractionService()
    public_did_dict = traction_service.fetch_current_public_did()
    public_did = Config.CHIEF_PERMITTING_OFFICER_DID_WEB
    public_verkey = public_did_dict["verkey"]

    assert public_did.startswith(
        "did:web:"
    ), f"Config.CHIEF_PERMITTING_OFFICER_DID_WEB = {Config.CHIEF_PERMITTING_OFFICER_DID_WEB} is not a did:web"
    current_app.logger.info("public did: " + public_did)

    records: List[Tuple[W3CCred,
                        PermitAmendmentOrgBookPublish]] = [] # list of tuples[payload, record]

    for row in permit_amendment_query_results:
        pa = PermitAmendment.find_by_permit_amendment_guid(row[0], unsafe=True)
        if not pa:
            current_app.logger.warning(
                f"Permit Amendment not found for permit_amendment_guid={row[0]}")
            continue

        pa_cred = VerifiableCredentialManager.produce_untp_cc_map_payload_without_id(public_did, pa)
        if not pa_cred:
            current_app.logger.warning(f"pa_cred could not be created")
            continue

        payload_hash = md5(pa_cred.model_dump_json(by_alias=True).encode('utf-8')).hexdigest()
        existing_paob = PermitAmendmentOrgBookPublish.find_by_unsigned_payload_hash(
            payload_hash, unsafe=True)

        if existing_paob:
            #this hash has already been seen, do not make new record or publish
            #this assumes acapy is not changing the result if the payload is unchanged
            continue

        new_credential_id = f"{Config.ORGBOOK_PUBLISHER_BASE_URL}/credentials/{uuid4()}"
        pa_cred.id = new_credential_id

        paob = PermitAmendmentOrgBookPublish(
            permit_amendment_guid=row[0],
            party_guid=row[1],
            unsigned_payload_hash=payload_hash,
            permit_number=pa_cred.credentialSubject.permitNumber,
            orgbook_entity_id=pa_cred.credentialSubject.issuedToParty.registeredId,
            orgbook_credential_id=new_credential_id,
        )
        records.append((pa_cred, paob))

    current_app.logger.info(f"public_verkey={public_verkey}")
    # send to traction to be signed
    for cred_payload, record in records:
        signed_cred = traction_service.sign_add_data_integrity_proof(
            Config.CHIEF_PERMITTING_OFFICER_DID_WEB_VERIFICATION_METHOD, cred_payload)
        if signed_cred:
            record.signed_credential = json.dumps(signed_cred["securedDocument"])
            record.sign_date = datetime.now()
        try:
            record.save()
        except IntegrityError:
            current_app.logger.warning(f"ignoring duplicate={str(record.unsigned_payload_hash)}")
            continue
        current_app.logger.info("bcreg_uri=" +
                                str(cred_payload.credentialSubject.issuedToParty.id) +
                                ", for permit_amendment_guid=" + str(row[0]))
        current_app.logger.warning("unsigned_hash=" + str(record.unsigned_payload_hash))

    current_app.logger.info("num of records created: " + str(len(records or [])))

    return [record for payload, record in records]


@celery.task()
def forward_all_pending_untp_vc_to_orgbook():
    """STUB for celery job to publis all pending vc to orgbook."""
    ## CORE signs and structures the credential, the publisher just validates and forwards it.
    records_to_forward = PermitAmendmentOrgBookPublish.find_all_unpublished(unsafe=True)
    ORGBOOK_W3C_CRED_FORWARD = f"{Config.ORGBOOK_PUBLISHER_BASE_URL}/credentials/forward"

    current_app.logger.warning(f"going to publish {len(records_to_forward)} records to orgbook")

    for record in records_to_forward:
        current_app.logger.warning(f"publishing record={json.loads(record.signed_credential)}")
        payload = {
            "verifiableCredential": json.loads(record.signed_credential),
            "options": {
                "entityId": record.orgbook_entity_id,
                "resourceId": record.permit_number,
                "credentialId": record.orgbook_credential_id,
                "credentialType": "BCMinesActPermitCredential"
            }
        }
        resp = requests.post(ORGBOOK_W3C_CRED_FORWARD, json=payload)
        if resp.status_code == 201:
            record.publish_state = True
        else:
            record.error_msg = resp.text
        record.save()


@celery.task()
def push_untp_map_data_to_publisher():
    ## This is a different process that passes the data to the publisher.
    ## the publisher structures the data and sends it to the orgbook.
    ## the publisher also manages the BitStringStatusLists.
    permit_amendment_query_results = db.session.execute(
        permit_amendments_for_orgbook_query).fetchall()

    failed_credentials: List[Tuple[str, str | None]] = []
    success_count = 0
    skipped_count = 0
    current_app.logger.info(f"num_records_to_process={len(permit_amendment_query_results)}")
    #token is valid for an hour currently.
    publisher_service = OrgbookPublisherService()

    for index, row in enumerate(permit_amendment_query_results):
        pa = PermitAmendment.find_by_permit_amendment_guid(row[0], unsafe=True)

        next_pa_guid: str | None = None
        valid_until_date: date | None = None
        # only valid until the next permit_amendment was issued
        try:
            if permit_amendment_query_results[index + 1][2] == row[2]: #ensure same permit_no
                next_pa_guid = permit_amendment_query_results[index + 1][0]
        except IndexError:
            pass

        if next_pa_guid:
            next_pa = PermitAmendment.find_by_permit_amendment_guid(next_pa_guid)
            valid_until_date = next_pa.issue_date

        if pa.permit_no[1] in ("X", "x"):
            current_app.logger.info(
                f"exclude exploration permit={pa.permit_no}, they cannot produce goods for sale")
            continue

        pa_cred = VerifiableCredentialManager.produce_untp_cc_map_payload_without_id(
            Config.CHIEF_PERMITTING_OFFICER_DID_WEB, pa)
        if not pa_cred:
            current_app.logger.warning(
                f"pa_cred could not be created for permit_amendment_guid={row[0]}")
            continue

        #only one assessment per credential
        publish_payload: dict[str, Any] = {
            "credential": {
                "type": "BCMinesActPermitCredential",
                "validFrom": convert_date_to_iso_datetime(pa.issue_date),
                "credentialSubject": {
                    "permitNumber": pa_cred.credentialSubject.permitNumber
                },
            },
            "options": {
                "entityId": pa_cred.credentialSubject.issuedToParty.registeredId,
                "cardinalityId": pa_cred.credentialSubject.permitNumber,
                "additionalData": {
                    "assessedFacility": [
                        f.model_dump(exclude_none=True)
                        for f in pa_cred.credentialSubject.assessment[0].assessedFacility
                    ],
                    "assessedProduct": [
                        p.model_dump(exclude_none=True)
                        for p in pa_cred.credentialSubject.assessment[0].assessedProduct
                    ],
                }
            }
        }
        #TODO: Combine continous permit_amendments where the contents of the credential and permittee did not change into one credential.
        if valid_until_date:
            publish_payload["credential"]["validUntil"] = convert_date_to_iso_datetime(
                valid_until_date)

        current_app.logger.debug(f"publishing record={publish_payload}")
        payload_hash = md5(json.dumps(publish_payload).encode('utf-8')).hexdigest()
        current_app.logger.debug(f"payload hash={payload_hash}")

        #produce a uuid for logging/tracing.
        publish_payload["options"]["credentialId"] = uuid4()

        publish_record = PermitAmendmentOrgBookPublish(
            unsigned_payload_hash=payload_hash,
            permit_amendment_guid=row[0],
            party_guid=row[1],
            signed_credential=f'Produced by publisher',
            publish_state=None,
            permit_number=pa_cred.credentialSubject.permitNumber,
            orgbook_entity_id=pa_cred.credentialSubject.issuedToParty.registeredId,
            orgbook_credential_id=None,
            error_msg=None)

        try:
            current_app.logger.debug('saving publish record locally...')
            publish_record.save()

            post_resp = publisher_service.publish_cred(publish_payload)

            publish_record.publish_state = post_resp.ok
            publish_record.error_msg = post_resp.text if not post_resp.ok else None
            if post_resp.ok:
                publish_record.orgbook_credential_id = post_resp.json()["credentialId"]

            publish_record.save()

        except IntegrityError:
            current_app.logger.info(
                f"credential hash collision, skipping cred for permit_amendment={row[0]}")

        if publish_record.error_msg:
            current_app.logger.warning(
                f"failed to publish unsigned_payload_id={publish_record.unsigned_payload_hash} error={publish_record.error_msg}"
            )
            current_app.logger.warning(f"..failed payload={publish_payload}")
            failed_credentials.append(
                (publish_record.unsigned_payload_hash, publish_record.error_msg))

        elif publish_record.orgbook_credential_id:
            current_app.logger.info(
                f"successful publish of unsigned_payload_id={publish_record.unsigned_payload_hash} url={publish_record.orgbook_credential_id}"
            )
            success_count += 1

        else:
            skipped_count += 1

    return f"num published={success_count}, num_skipped={skipped_count} num failed = {len(failed_credentials)}"


class VerifiableCredentialManager():

    def __init__(self):
        pass

    @classmethod
    def delete_any_unsuccessful_untp_push(cls, live: bool = False) -> int:
        if not live:
            records = PermitAmendmentOrgBookPublish.find_all_unpublished()
            delete_count = 0
            for record in records:
                current_app.logger.info(f"would delete {record}")
                delete_count += 1
        else:
            current_app.logger.info(f"LIVE DELETE")
            records = PermitAmendmentOrgBookPublish.delete_all_unpublished()
            delete_count = records
            db.session.commit()

        return delete_count

    @classmethod
    def collect_attributes_for_mines_act_permit_111(
            cls, permit_amendment: PermitAmendment) -> List[dict]:
        # collect information for schema
        # https://github.com/bcgov/bc-vcpedia/blob/main/credentials/bc-mines-act-permit/1.1.1/governance.md#261-schema-definition
        credential_attrs = {}

        #mine_types should related to the permits
        #all mine_types for all permits are used in mine.mine_type
        #but we only want the mine_type for this specific permit/permit_amendment.

        #not really a 'mine_type' if it's managed at the permit level.
        mine_type = [
            mt for mt in permit_amendment.permit.site_properties
            if mt.mine_guid == permit_amendment.mine_guid
        ][0] if permit_amendment.permit.site_properties else None

        #provide permit object the permit_amendment mine_guid
        permit_amendment.permit._context_mine = permit_amendment.mine_guid

        mine_disturbance_list = []
        mine_commodity_list = []

        if mine_type:
            mine_disturbance_list = [
                mtd.mine_disturbance_literal for mtd in mine_type.mine_type_detail
                if mtd.mine_disturbance_code
            ]

            mine_commodity_list = [
                mtd.mine_commodity_literal for mtd in mine_type.mine_type_detail
                if mtd.mine_commodity_code
            ]

        mine_status_xref = permit_amendment.mine.mine_status[0].mine_status_xref

        credential_attrs["permit_no"] = permit_amendment.permit_no
        credential_attrs["permit_status"] = permit_amendment.permit.permit_status_code_description
        credential_attrs["permittee_name"] = permit_amendment.permit.current_permittee
        credential_attrs[
            "mine_operation_status"] = mine_status_xref.mine_operation_status.description
        credential_attrs[
            "mine_operation_status_reason"] = mine_status_xref.mine_operation_status_reason.description if mine_status_xref.mine_operation_status_reason else None
        credential_attrs[
            "mine_operation_status_sub_reason"] = mine_status_xref.mine_operation_status_sub_reason.description if mine_status_xref.mine_operation_status_sub_reason else None
        credential_attrs["mine_disturbance"] = ", ".join(
            mine_disturbance_list) if mine_disturbance_list else None
        credential_attrs["mine_commodity"] = ", ".join(
            mine_commodity_list) if mine_commodity_list else None
        credential_attrs["mine_no"] = permit_amendment.mine.mine_no
        credential_attrs["issue_date"] = int(permit_amendment.issue_date.strftime("%Y%m%d"))
        # https://github.com/hyperledger/aries-rfcs/tree/main/concepts/0441-present-proof-best-practices#dates-and-predicates
        credential_attrs["latitude"] = permit_amendment.mine.latitude
        credential_attrs["longitude"] = permit_amendment.mine.longitude
        credential_attrs["bond_total"] = permit_amendment.permit.active_bond_total
        credential_attrs["tsf_operating_count"] = len([
            tsf for tsf in permit_amendment.mine.mine_tailings_storage_facilities
            if tsf.tsf_operating_status_code == "OPT"
        ])
        credential_attrs["tsf_care_and_maintenance_count"] = len([
            tsf for tsf in permit_amendment.mine.mine_tailings_storage_facilities
            if tsf.tsf_operating_status_code == "CAM"
        ])

        # offer credential
        # "mime-type":"text/plain",
        # NB Orbit does not expect this removing for now

        attributes = [{
            "name": str(attr),
            "value": str(val),
        } for attr, val in credential_attrs.items()]

        return attributes

    @classmethod
    def produce_map_01_credential_payload(cls, did: str, permit_amendment: PermitAmendment):
        #use w3c vcdm issue_date, not as an attribute in the credential
        #https://www.w3.org/TR/vc-data-model/
        id = permit_amendment.issue_date
        #convert to datetime with tzinfo
        issuance_date = datetime(id.year, id.month, id.day, 0, 0, 0, tzinfo=ZoneInfo("UTC"))
        credential = {
            "@context":
            ["https://www.w3.org/2018/credentials/v1", {
                "@vocab": "urn:bcgov:attributes#"
            }],
            "type": ["VerifiableCredential"],
            "issuer": {
                "id": did,
            },
            "issuanceDate": issuance_date.isoformat(),
            "credentialSubject": {
                a["name"]: a["value"]
                for a in cls.collect_attributes_for_mines_act_permit_111(permit_amendment)
                if a["name"] != "issue_date"
            }
        }
        return credential

    @classmethod
    def produce_untp_cc_map_payload_without_id(cls, did: str,
                                               permit_amendment: PermitAmendment) -> W3CCred | None:
        """Produce payload for Mines Act Permit UNTP Conformity Credential from permit amendment and did."""

        #attributes in anoncreds but not in untp
        # "latitude": permit_amendment.mine.latitude, but in pluscode
        # "longitude": permit_amendment.mine.longitude, but in pluscode

        # "bond_total"
        # "mine_disturbance"
        # "mine_operation_status"
        # "mine_operation_status_reason"
        # "mine_operation_status_sub_reason"
        # "tsf_operating_count"
        # "tsf_care_and_maintenance_count"

        pmt_appts: List[MinePartyAppointment] = permit_amendment.permittee_appointments

        permit_amendment_issue_date = permit_amendment.issue_date if isinstance(
            permit_amendment.issue_date, date) else permit_amendment.issue_date.date()

        def ensure_start_date_type(d) -> date:
            if not d:
                return date(1900, 0, 0)
            elif isinstance(d, date):
                return d
            elif isinstance(d, datetime):
                return d.date()
            else:
                raise TypeError(
                    f"mine_party_appointment.start_date is neither `date` or `datetime` object, it's {type(d)}"
                )

        #remove all appointments after the issue_date then take the top one, there are overlapping entries that may not be handled here.
        curr_appt = [
            pa for pa in pmt_appts
            if ensure_start_date_type(pa.start_date) <= permit_amendment_issue_date
        ][0]

        orgbook_entity = curr_appt.party.party_orgbook_entity
        if not orgbook_entity:
            if curr_appt.party:
                current_app.logger.warning(
                    f"No Orgbook Entity for party_guid={curr_appt.party.party_guid}, could not produce Mines Act Permit UNTP CC"
                )
            else:
                current_app.logger.error(
                    f"No party for mine_party_appointment_id={curr_appt.mine_party_appt_id}, that shouldn't be possible"
                )
            return None

        untp_party_cpo = base.Identifier(
            id="did:web:untp.traceability.site:parties:regulators:CHIEF-PERMITTING-OFFICER",
            name="Chief Permitting Officer of Mines",
            registeredId=
            "did:web:untp.traceability.site:parties:regulators:CHIEF-PERMITTING-OFFICER",
            idScheme=base.IdentifierScheme(
                id="https://w3c-ccg.github.io/did-method-web/", name="DID Web"))

        orgbook_cred_url = f"https://orgbook.gov.bc.ca/entity/{orgbook_entity.registration_id}/credential/{orgbook_entity.credential_id}"

        untp_party_business = base.Party(
            id=orgbook_cred_url,
            name=orgbook_entity.name_text,
            registeredId=str(orgbook_entity.registration_id))

        facility = cc.Facility(
            id=None,
            name=permit_amendment.mine.mine_name,
            registeredId=permit_amendment.mine.mine_no,
            locationInformation=
            f'https://plus.codes/{plus_code_encode(permit_amendment.mine.latitude, permit_amendment.mine.longitude)}',
            address=None,
            IDverifiedByCAB=True)

        #TODO, can CORE identify commodities by their UNCEFACT code?
        #remove duplicates
        product_names = list(set([c for c in permit_amendment.mine.commodities]))
        products = [cc.Product(id=None, name=c, IDverifiedByCAB=False) for c in product_names]

        issue_date = permit_amendment.issue_date

        untp_assessment = cc.ConformityAssessment(
            id=None,
            assessmentDate=issue_date,
            referenceRegulation=cc.Regulation(
                id="https://www.bclaws.gov.bc.ca/civix/document/id/complete/statreg/96293_01",
                name="BC Mines Act",
                jurisdictionCountry="CA",
                administeredBy=base.Identifier(
                    id="https://www2.gov.bc.ca/gov/content/home",
                    name="Government of British Columbia",
                    registeredId="BC-GOV",
                    idScheme=base.IdentifierScheme(
                        id="https://www2.gov.bc.ca/gov/content/home", name="BC-GOV")),
                effectiveDate=datetime(2024, 5, 14, tzinfo=ZoneInfo("UTC")).isoformat()),
            conformityTopic=codes.ConformityTopicCode.Governance_Compliance,
            assessedFacility=[facility],
            assessedProduct=products)

        cred = UNTPCCMinesActPermit(
            id=None,
            name="Credential for permitNumber=" + permit_amendment.permit_no,
            permitNumber=permit_amendment.permit_no,
            assessmentLevel=codes.AssessmentLevelCode.GovtApproval,
            attestationType=codes.AttestationType.Certification,
            scope=cc.ConformityAssessmentScheme(
                id=
                "https://bcgov.github.io/digital-trust-toolkit/docs/governance/mining/bc-mines-act-permit/1.1.1/governance",
                name="BC Mines Act Permit Credential (1.1.1) Governance Documentation"),
            authorisation=[
                base.Endorsement(
                    id=
                    "https://www2.gov.bc.ca/gov/content/industry/mineral-exploration-mining/permitting/mines-contact-info",
                    name="BC Chief Permitting Officer of Mines",
                    issuingAuthority=untp_party_cpo)
            ],
            issuedToParty=untp_party_business,
            assessment=[untp_assessment])

        w3c_cred = W3CCred(
            id=None,                                                                                # to be populated after hashing.
            type=[
                "VerifiableCredential", "DigitalConformityCredential", "BCMinesActPermitCredential"
            ],
            issuer={"id": did},
            validFrom=convert_date_to_iso_datetime(
                permit_amendment.issue_date),                                                       #vcdm1.1, will change to 'validFrom' in vcdm2.0
            credentialSubject=cred,
            credentialSchema=[{
                "id": Config.UNTP_DIGITAL_CONFORMITY_CREDENTIAL_CONTEXT,
                "type": "JsonSchema"
            }])

        return w3c_cred
