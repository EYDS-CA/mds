import logging
import os
import traceback

from flask import current_app
from opentelemetry import trace


class CustomFormatter(logging.Formatter):
    def format(self, record):
        KEY_CLOAK_CLIENT_ID = None
        def get_key_cloak_client_id():
            try:
                # Check if the request is a valid HTTP request
                if current_app and hasattr(current_app, 'extensions'):
                    from app.extensions import getJwtManager
                    from flask import request

                    # Check if the request has a bearer token
                    bearer_token = request.headers.get('Authorization')
                    if bearer_token and bearer_token.startswith('Bearer '):
                        if getJwtManager().audience:
                            return getJwtManager().audience
            except Exception as e:
                #print error only when there is a major error with implementation of getJwtManager()
                print(traceback.format_exc())

            return None

        def get_traceid_from_telemetry():
            current_span = trace.get_current_span()
            if current_span:
                traceid = current_span.get_span_context().trace_id
                return traceid
            return None

        # Get the traceid from the telemetry
        traceid = get_traceid_from_telemetry()

        # Add the traceid to the log message
        record.traceid = traceid
        if get_key_cloak_client_id() and not KEY_CLOAK_CLIENT_ID:
            KEY_CLOAK_CLIENT_ID = get_key_cloak_client_id()

        # Call the parent formatter to format the log message
        formatted_message = super().format(record)

        # Add the traceid, keycloak client id and message to the formatted log message
        formatted_message = f'{formatted_message} [trace_id={traceid} client={KEY_CLOAK_CLIENT_ID}]: {record.message}'

        return formatted_message

class Config(object):
    # Environment config
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev')
    BASE_PATH = os.environ.get('BASE_PATH', '')
    DB_HOST = os.environ.get('DB_HOST', 'localhost')
    DB_USER = os.environ.get('DB_USER', 'user')
    DB_PASS = os.environ.get('DB_PASS', 'pass')
    DB_PORT = os.environ.get('DB_PORT', 5432)
    DB_NAME = os.environ.get('DB_NAME', 'db_name')
    DB_URL = f"postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

    ENVIRONMENT_NAME = os.environ.get('ENVIRONMENT_NAME', 'dev')

    # SqlAlchemy config
    SQLALCHEMY_DATABASE_URI = DB_URL
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {"pool_pre_ping": True}

    JWT_OIDC_WELL_KNOWN_CONFIG = os.environ.get(
        'JWT_OIDC_WELL_KNOWN_CONFIG',
        'https://localhost:8080/auth/realms/mds/.well-known/openid-configuration')
    JWT_OIDC_AUDIENCE = os.environ.get('JWT_OIDC_AUDIENCE', 'mds')
    JWT_OIDC_ALGORITHMS = os.environ.get('JWT_OIDC_ALGORITHMS', 'RS256')

    # Cache settings
    CACHE_TYPE = os.environ.get('CACHE_TYPE', 'redis')
    CACHE_REDIS_HOST = os.environ.get('CACHE_REDIS_HOST', 'redis')
    CACHE_REDIS_PORT = os.environ.get('CACHE_REDIS_PORT', 6379)
    CACHE_REDIS_PASS = os.environ.get('CACHE_REDIS_PASS', 'redis-password')
    CACHE_REDIS_URL = 'redis://:{0}@{1}:{2}'.format(CACHE_REDIS_PASS, CACHE_REDIS_HOST,
                                                    CACHE_REDIS_PORT)

    # Celery settings
    CELERY_RESULT_BACKEND = f'db+postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}'
    CELERY_BROKER_URL = f'redis://:{CACHE_REDIS_PASS}@{CACHE_REDIS_HOST}:{CACHE_REDIS_PORT}/'

    DOCUMENT_MANAGER_URL = os.environ.get('DOCUMENT_MANAGER_URL',
                                          'http://document_manager_backend:5001')
    UPLOADED_DOCUMENT_DEST = os.environ.get('UPLOADED_DOCUMENT_DEST', '/app/document_uploads')

    MAX_CONTENT_LENGTH = 750 * 1024 * 1024
    JSONIFY_PRETTYPRINT_REGULAR = False

    TUSD_URL = os.environ.get('TUSD_URL', 'http://tusd:1080/files/')

    DOCUMENT_UPLOAD_CHUNK_SIZE_BYTES = int(
        os.environ.get('DOCUMENT_UPLOAD_CHUNK_SIZE_BYTES', '1048576'))

    # NROS
    NROS_CLIENT_SECRET = os.environ.get('NROS_CLIENT_SECRET', None)
    NROS_CLIENT_ID = os.environ.get('NROS_CLIENT_ID', None)
    NROS_TOKEN_URL = os.environ.get('NROS_TOKEN_URL', None)

    # vFCBC
    VFCBC_CLIENT_SECRET = os.environ.get('VFCBC_CLIENT_SECRET', None)
    VFCBC_CLIENT_ID = os.environ.get('VFCBC_CLIENT_ID', None)

    # Document hosting settings
    OBJECT_STORE_ENABLED = bool(int(os.environ.get('OBJECT_STORE_ENABLED', '0')))
    OBJECT_STORE_HOST = os.environ.get('OBJECT_STORE_HOST', '')
    OBJECT_STORE_ACCESS_KEY_ID = os.environ.get('OBJECT_STORE_ACCESS_KEY_ID', '')
    OBJECT_STORE_ACCESS_KEY = os.environ.get('OBJECT_STORE_ACCESS_KEY', '')
    OBJECT_STORE_BUCKET = os.environ.get('OBJECT_STORE_BUCKET', '')
    S3_PREFIX = os.environ.get('S3_PREFIX', 'mds-files-local/')

    CORE_API_URL = os.environ.get('CORE_API_URL', 'http://mds_backend:5000')

    # Authentication
    AUTHENTICATION_URL = os.environ.get('AUTHENTICATION_URL', '')
    CLIENT_ID = os.environ.get('CLIENT_ID', '')
    CLIENT_SECRET = os.environ.get('CLIENT_SECRET', '')
    GRANT_TYPE = os.environ.get('GRANT_TYPE', 'client_credentials')

    # celery REST API
    CELERY_REST_API_URL = os.environ.get('CELERY_REST_API_URL', '')
    FLOWER_USER = os.environ.get('FLOWER_USER', '')
    FLOWER_USER_PASSWORD = os.environ.get('FLOWER_USER_PASSWORD', '')

    FLASK_LOGGING_LEVEL = os.environ.get('FLASK_LOGGING_LEVEL',
                                         'INFO')  # ['DEBUG','INFO','WARN','ERROR','CRITICAL']
    WERKZEUG_LOGGING_LEVEL = os.environ.get('WERKZEUG_LOGGING_LEVEL',
                                            'CRITICAL')  # ['DEBUG','INFO','WARN','ERROR','CRITICAL']
    DISPLAY_WERKZEUG_LOG = os.environ.get('DISPLAY_WERKZEUG_LOG',
                                          True)
    
    GEOMARK_URL_BASE = os.environ.get('GEOMARK_URL_BASE', 'https://test.apps.gov.bc.ca/pub/geomark')
    GEOMARK_SECRET_KEY = os.environ.get('GEOMARK_SECRET_KEY', None)
    GEOMARK_GROUP = os.environ.get('GEOMARK_GROUP', None)
    GEOMARK_PERSIST = os.environ.get('GEOMARK_PERSIST', 'true') == 'true'

    LOGGING_DICT_CONFIG = {
        'version': 1,
        'formatters': {
            'default': {
                '()': CustomFormatter,
                'format': '%(asctime)s %(levelname)s [%(name)s] [%(filename)s:%(lineno)d]',
            }
        },
        'handlers': {
            'console': {
                'class': 'logging.StreamHandler',
                'stream': 'ext://sys.stdout',
                'formatter': 'default',
                'level': 'DEBUG'
            }
        },
        'root': {
            'level': FLASK_LOGGING_LEVEL,
            'handlers': ['console']
        },
        'loggers': {
            'werkzeug': {
                'level': WERKZEUG_LOGGING_LEVEL,
                'handlers': ['console'],
                'propagate': DISPLAY_WERKZEUG_LOG
            }
        }
    }

    def JWT_ROLE_CALLBACK(jwt_dict):
        return (jwt_dict.get('client_roles') or [])


class TestConfig(Config):
    TESTING = os.environ.get('TESTING', True)
    CACHE_TYPE = "simple"

    DB_NAME = os.environ.get('DB_NAME_TEST', 'db_name_test')
    DB_URL = f"postgresql://{Config.DB_USER}:{Config.DB_PASS}@{Config.DB_HOST}:{Config.DB_PORT}/{DB_NAME}"
    SQLALCHEMY_DATABASE_URI = DB_URL

    JWT_OIDC_TEST_MODE = True
    JWT_OIDC_TEST_AUDIENCE = os.environ.get('JWT_OIDC_TEST_AUDIENCE', None)
    JWT_OIDC_TEST_CLIENT_SECRET = os.environ.get('JWT_OIDC_TEST_CLIENT_SECRET', None)
    JWT_OIDC_TEST_ISSUER = os.environ.get('JWT_OIDC_TEST_ISSUER', None)

    KID_KEY = os.environ.get('JWT_OIDC_KEY_KID', None)
    KTY_KEY = os.environ.get('JWT_OIDC_KEY_KTY', None)
    ALG_KEY = os.environ.get('JWT_OIDC_KEY_ALG', None)
    USE_KEY = os.environ.get('JWT_OIDC_KEY_USE', None)
    N_KEY = os.environ.get('JWT_OIDC_KEY_N', None)
    E_KEY = os.environ.get('JWT_OIDC_KEY_E', None)
    D_KEY = os.environ.get('JWT_OIDC_KEY_D', None)
    P_KEY = os.environ.get('JWT_OIDC_KEY_P', None)
    Q_KEY = os.environ.get('JWT_OIDC_KEY_Q', None)
    DP_KEY = os.environ.get('JWT_OIDC_KEY_DP', None)
    DQ_KEY = os.environ.get('JWT_OIDC_KEY_DQ', None)
    QI_KEY = os.environ.get('JWT_OIDC_KEY_QI', None)

    # Dummy Private Keys for testing purposes, can replace these keys with any other generated key.
    JWT_OIDC_TEST_KEYS = {
        "keys": [{
            "kid":KID_KEY,
            "kty":KTY_KEY,
            "alg":ALG_KEY,
            "use":USE_KEY,
            "n":N_KEY,
            "e":E_KEY
        }]
    }
    # Dummy Private Keys for testing purposes.
    JWT_OIDC_TEST_PRIVATE_KEY_JWKS = {
        "keys": [{
            "kid":KID_KEY,
            "kty":KTY_KEY,
            "alg":ALG_KEY,
            "use":USE_KEY,
            "kty":KTY_KEY,
            "n":N_KEY,
            "e":E_KEY,
            "d":D_KEY,
            "p":P_KEY,
            "q":Q_KEY,
            "dp":DP_KEY,
            "dq":DQ_KEY,
            "qi":QI_KEY
        }]
    }
    # Dummy Private Key, for testing purposes.
    JWT_OIDC_TEST_PRIVATE_KEY_PEM = os.environ.get('JWT_OIDC_TEST_PRIVATE_KEY_PEM', None)
