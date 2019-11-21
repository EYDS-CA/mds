// Redux reducers
export const CREATE_MINE_RECORD = "CREATE_MINE_RECORD";
export const CREATE_MINE_TYPE = "CREATE_MINE_TYPE";
export const GET_MINE_RECORDS = "GET_MINE_RECORDS";
export const GET_MINE_RECORD = "GET_MINE_RECORD";
export const GET_SUBSCRIBED_MINES = "GET_SUBSCRIBED_MINES";
export const GET_MINE_NAME_LIST = "GET_MINE_NAME_LIST";
export const GET_MINE_BASIC_INFO_LIST = "GET_MINE_BASIC_INFO_LIST";
export const GET_STATUS_OPTIONS = "GET_STATUS_OPTIONS";
export const GET_REGION_OPTIONS = "GET_REGION_OPTIONS";
export const UPDATE_MINE_RECORD = "UPDATE_MINE_RECORD";
export const CREATE_TSF = "CREATE_TSF";
export const EDIT_TSF_REPORT = "EDIT_TSF_REPORT";
export const GET_MINE_DOCUMENTS = "GET_MINE_DOCUMENTS";
export const MINES = "MINES";
export const GET_MINE_TSF_REQUIRED_REPORTS = "GET_MINE_TSF_REQUIRED_REPORTS";
export const GET_MINE_VERIFIED_STATUS = "GET_MINE_VERIFIED_STATUS";
export const SET_MINE_VERIFIED_STATUS = "SET_MINE_VERIFIED_STATUS";

// mineTypes
export const GET_TENURE_TYPES = "GET_TENURE_TYPES";
export const GET_DISTURBANCE_OPTIONS = "GET_DISTURBANCE_OPTIONS";
export const GET_COMMODITY_OPTIONS = "GET_COMMODITY_OPTIONS";
export const REMOVE_MINE_TYPE = "REMOVE_MINE_TYPE";

export const AUTHENTICATION = "AUTHENTICATION";
export const STATIC_CONTENT = "STATIC_CONTENT";

export const CREATE_PARTY = "CREATE_PARTY";
export const UPDATE_PARTY = "UPDATE_PARTY";
export const PARTIES = "PARTIES";
export const GET_PARTIES = "GET_PARTIES";
export const GET_PARTY = "GET_PARTY";
export const DELETE_PARTY = "DELETE_PARTY";
export const ADD_MINE_MANAGER = "ADD_MINE_MANAGER";
export const ADD_PERMITTEE = "ADD_PERMITTEE";
export const GET_INSPECTORS = "GET_INSPECTORS";

export const MODAL = "MODAL";
export const GET_PARTY_RELATIONSHIP_TYPES = "GET_PARTY_RELATIONSHIP_TYPES";
export const ADD_PARTY_RELATIONSHIP = "ADD_PARTY_RELATIONSHIP";
export const FETCH_PARTY_RELATIONSHIPS = "FETCH_PARTY_RELATIONSHIPS";
export const REMOVE_PARTY_RELATIONSHIP = "REMOVE_PARTY_RELATIONSHIP";
export const UPDATE_PARTY_RELATIONSHIP = "UPDATE_PARTY_RELATIONSHIP";
export const ADD_DOCUMENT_TO_RELATIONSHIP = "ADD_DOCUMENT_TO_RELATIONSHIP";
export const REMOVE_DOCUMENT_FROM_RELATIONSHIP = "REMOVE_DOCUMENT_FROM_RELATIONSHIP";

// Compliance reducer
export const COMPLIANCE = "COMPLIANCE";
export const GET_MINE_COMPLIANCE_INFO = "GET_MINE_COMPLIANCE_INFO";

// Minespace reducer
export const MINESPACE = "MINESPACE";
export const GET_MINESPACE_USER = "GET_MINESPACE_USER";
export const CREATE_MINESPACE_USER = "CREATE_MINESPACE_USER";
export const DELETE_MINESPACE_USER = "DELETE_MINESPACE_USER";
export const GET_MINESPACE_USER_MINES = "GET_MINESPACE_USER_MINES";

// Static content
export const GET_PROVINCE_CODES = "GET_PROVINCE_CODES";
export const GET_COMPLIANCE_CODES = "GET_COMPLIANCE_CODES";

// Permit reducer
export const PERMITS = "PERMITS";
export const CREATE_PERMIT = "CREATE_PERMIT";
export const GET_PERMITS = "GET_PERMITS";
export const UPDATE_PERMIT = "UPDATE_PERMIT";
export const CREATE_PERMIT_AMENDMENT = "CREATE_PERMIT_AMENDMENT";
export const UPDATE_PERMIT_AMENDMENT = "UPDATE_PERMIT_AMENDMENT";
export const GET_PERMIT_STATUS_OPTIONS = "GET_PERMIT_STATUS_OPTIONS";
export const UPDATE_PERMIT_AMENDMENT_DOCUMENT = "UPDATE_PERMIT_AMENDMENT_DOCUMENT";

// Search
export const GET_SEARCH_OPTIONS = "GET_SEARCH_OPTIONS";
export const GET_SEARCH_RESULTS = "GET_SEARCH_RESULTS";
export const GET_SEARCH_BAR_RESULTS = "GET_SEARCH_BAR_RESULTS";
export const CLEAR_SEARCH_BAR_RESULTS = "CLEAR_SEARCH_BAR_RESULTS";
export const SEARCH = "SEARCH";

// Mine subscription
export const SUBSCRIBE = "SUBSCRIBE";
export const UNSUBSCRIBE = "UNSUBSCRIBE";

// Variances
export const VARIANCES = "VARIANCES";
export const CREATE_MINE_VARIANCE = "CREATE_MINE_VARIANCE";
export const GET_VARIANCES = "GET_VARIANCES";
export const GET_VARIANCE = "GET_VARIANCE";
export const ADD_DOCUMENT_TO_VARIANCE = "ADD_DOCUMENT_TO_VARIANCE";
export const REMOVE_DOCUMENT_FROM_VARIANCE = "REMOVE_DOCUMENT_FROM_VARIANCE";
export const GET_VARIANCE_STATUS_OPTIONS = "GET_VARIANCE_STATUS_OPTIONS";
export const GET_VARIANCE_DOCUMENT_CATEGORY_OPTIONS = "GET_VARIANCE_DOCUMENT_CATEGORY_OPTIONS";
export const UPDATE_MINE_VARIANCE = "UPDATE_MINE_VARIANCE";

// CORE USERS
export const USERS = "USERS";
export const GET_CORE_USERS = "GET_CORE_USERS";

// Incidents
export const GET_INCIDENTS = "GET_INCIDENTS";
export const INCIDENTS = "INCIDENTS";
export const CREATE_MINE_INCIDENT = "CREATE_MINE_INCIDENT";
export const GET_MINE_INCIDENTS = "GET_MINE_INCIDENTS";
export const UPDATE_MINE_INCIDENT = "UPDATE_MINE_INCIDENT";
export const GET_INCIDENT_DOCUMENT_TYPE_OPTIONS = "GET_INCIDENT_DOCUMENT_TYPE_OPTIONS";
export const GET_MINE_INCIDENT_FOLLOWUP_ACTION_OPTIONS =
  "GET_MINE_INCIDENT_FOLLOWUP_ACTION_OPTIONS";
export const GET_MINE_INCIDENT_DETERMINATION_OPTIONS = "GET_MINE_INCIDENT_DETERMINATION_OPTIONS";
export const GET_MINE_INCIDENT_STATUS_CODE_OPTIONS = "GET_MINE_INCIDENT_STATUS_CODE_OPTIONS";
export const GET_MINE_INCIDENT_CATEGORY_CODE_OPTIONS = "GET_MINE_INCIDENT_CATEGORY_CODE_OPTIONS";

// Reports
export const REPORTS = "REPORTS";
export const UPDATE_MINE_REPORT = "UPDATE_MINE_REPORT";
export const CREATE_MINE_REPORT = "CREATE_MINE_REPORT";
export const DELETE_MINE_REPORT = "DELETE_MINE_REPORT";
export const GET_MINE_REPORTS = "GET_MINE_REPORTS";
export const GET_MINE_REPORT_DEFINITION_OPTIONS = "GET_MINE_REPORT_DEFINITION_OPTIONS";
export const GET_MINE_REPORT_STATUS_OPTIONS = "GET_MINE_REPORT_STATUS_OPTIONS";

// Report Comments
export const GET_MINE_REPORT_COMMENTS = "GET_MINE_REPORT_COMMENTS";
export const UPDATE_MINE_REPORT_COMMENT = "UPDATE_MINE_REPORT_COMMENT";
export const CREATE_MINE_REPORT_COMMENT = "CREATE_MINE_REPORT_COMMENT";
export const DELETE_MINE_REPORT_COMMENT = "DELETE_MINE_REPORT_COMMENT";

// notice of work
export const NOTICE_OF_WORK = "NOTICE_OF_WORK";
export const GET_NOTICE_OF_WORK_APPLICATIONS = "GET_NOTICE_OF_WORK_APPLICATIONS";
export const GET_NOTICE_OF_WORK_APPLICATION = "GET_NOTICE_OF_WORK_APPLICATION";
export const GET_MINE_NOTICE_OF_WORK_APPLICATIONS = "GET_NOTICE_OF_WORK_APPLICATIONS";
export const CREATE_NOTICE_OF_WORK_APPLICATION = "CREATE_NOTICE_OF_WORK_APPLICATION";
export const GET_IMPORTED_NOTICE_OF_WORK_APPLICATION = "GET_IMPORTED_NOTICE_OF_WORK_APPLICATION";
export const GET_ORIGINAL_NOTICE_OF_WORK_APPLICATION = "GET_ORIGINAL_NOTICE_OF_WORK_APPLICATION";
export const GET_NOTICE_OF_WORK_ACTIVITY_TYPE_OPTIONS = "GET_NOTICE_OF_WORK_ACTIVITY_TYPE_OPTIONS";
