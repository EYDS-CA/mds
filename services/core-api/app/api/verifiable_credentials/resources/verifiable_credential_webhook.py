import enum
from flask import current_app, request
from flask_restplus import Resource
from app.api.utils.include.user_info import User

from app.extensions import api

from app.api.utils.resources_mixins import UserMixin
from app.api.services.traction_service import TractionService

from app.api.verifiable_credentials.models.connection import PartyVerifiableCredentialConnection
from app.api.verifiable_credentials.models.credentials import PartyVerifiableCredentialMinesActPermit

PRESENT_PROOF = "present_proof"
CONNECTIONS = "connections"
CREDENTIAL_OFFER = "issue_credential"
OUT_OF_BAND = "out_of_band"

class VerifiableCredentialWebhookResource(Resource, UserMixin):
    @api.doc(description='Endpoint to recieve webhooks from Traction.', params={})
    def post(self, topic):
        User._test_mode = True  #webhook handling has no row level auth
        webhook_body = request.get_json()
        current_app.logger.warning(f"TRACTION WEBHOOK <topic={topic}>: {webhook_body}")
        if topic == CONNECTIONS:
            connection_id = webhook_body['connection_id']
            vc_conn = PartyVerifiableCredentialConnection.query.unbound_unsafe().filter_by(connection_id=connection_id).first()
            assert vc_conn, f"{connection_id} not found"
            new_state = webhook_body["state"]
            if new_state != vc_conn.connection_state:
                vc_conn.connection_state=new_state
                vc_conn.save()
                current_app.logger.debug(f"Updated party_vc_conn connection_id={connection_id} with state={new_state}")
        if topic == OUT_OF_BAND:
            invitation_id = webhook_body["invi_msg_id"]
            vc_conn = PartyVerifiableCredentialConnection.query.unbound_unsafe().filter_by(invitation_id=invitation_id).first()
            assert vc_conn, f"{invitation_id} not found"
            new_state = webhook_body["state"]
            if new_state != vc_conn.connection_state:
                vc_conn.connection_state=new_state
                vc_conn.save()
                current_app.logger.debug(f"Updated party_vc_conn invitation_id={invitation_id} with state={new_state}")
        if topic == CREDENTIAL_OFFER:
            cred_exch_id = webhook_body["credential_exchange_id"]
            cred_exch_record = PartyVerifiableCredentialMinesActPermit.query.unbound_unsafe().filter_by(cred_exch_id=cred_exch_id).first()
            assert cred_exch_record
            new_state = webhook_body["state"]
            if new_state != cred_exch_record.cred_exch_state:
                cred_exch_record.cred_exch_state=new_state
                cred_exch_record.save()
                current_app.logger.debug(f"Updated cred_exch_record cred_exch_id={cred_exch_id} with state={new_state}")

        else:
            current_app.logger.info(f"unknown topic={topic}")
