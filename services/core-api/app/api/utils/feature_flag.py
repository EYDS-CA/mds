from enum import Enum

from app.config import Config
from flagsmith import Flagsmith
from flask import current_app


class Feature(Enum):
    TSF_V2 = 'tsf_v2'
    MAJOR_PROJECT_REPLACE_FILE = 'major_project_replace_file'
    MINE_APPLICATION_FILE_UDPATE_ALERTS = 'mine_application_file_update_alerts'
    TRACTION_VERIFIABLE_CREDENTIALS = 'verifiable_credentials'
    #if enabled the credential offer will be the current development state of all the 2.0 changes, Q1 2024
    VC_ANONCREDS_20 = 'vc_mines_act_permit_20'   # pending anoncred content differences.
    VC_ANONCREDS_CORE = "vc_anoncreds_core"
    VC_ANONCREDS_MINESPACE = "vc_anoncreds_minespace"
    VC_W3C = "vc_w3c"
    CODE_REQUIRED_REPORTS = 'code_required-reports'
    PERMIT_DOCUMENT_KEYWORD_SEARCH = 'permit_document_keyword_search'
    AMS_AGENT = 'ams_agent'

    def __str__(self):
        return self.value


flagsmith = Flagsmith(
    environment_key=Config.FLAGSMITH_KEY,
    api_url=Config.FLAGSMITH_URL,
)


def is_feature_enabled(feature):
    try:
        feature = str(feature).strip()
        flags = flagsmith.get_environment_flags()

        return feature in flags.flags and flags.is_feature_enabled(feature)
    except Exception as e:
        current_app.logger.error(f'Failed to look up feature flag for: {feature}. ' + str(e))
        return False
