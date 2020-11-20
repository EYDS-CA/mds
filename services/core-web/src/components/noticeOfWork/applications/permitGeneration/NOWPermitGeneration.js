import React, { Component } from "react";
import PropTypes from "prop-types";
import moment from "moment";
import { isEmpty } from "lodash";
import { Button, Popconfirm } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";
import { formatDate } from "@common/utils/helpers";
import { getFormValues, reset } from "redux-form";
import { getNoticeOfWorkApplicationTypeOptions } from "@common/selectors/staticContentSelectors";
import {
  fetchPermits,
  updatePermitAmendment,
  fetchDraftPermitByNOW,
} from "@common/actionCreators/permitActionCreator";
import {
  getDraftPermitForNOW,
  getDraftPermitAmendmentForNOW,
} from "@common/selectors/permitSelectors";
import * as FORM from "@/constants/forms";
import * as Permission from "@/constants/permissions";
import CustomPropTypes from "@/customPropTypes";
import GeneratePermitForm from "@/components/Forms/permits/GeneratePermitForm";
import { EDIT_OUTLINE } from "@/constants/assets";
import NullScreen from "@/components/common/NullScreen";
import * as routes from "@/constants/routes";
import NOWSideMenu from "@/components/noticeOfWork/applications/NOWSideMenu";
import LoadingWrapper from "@/components/common/wrappers/LoadingWrapper";
import NOWActionWrapper from "@/components/noticeOfWork/NOWActionWrapper";
import NOWStatusIndicator from "@/components/noticeOfWork/NOWStatusIndicator";
import NOWProgressActions from "@/components/noticeOfWork/NOWProgressActions";
import { CoreTooltip } from "@/components/common/CoreTooltip";
import NOWProgressStatus from "@/components/noticeOfWork/NOWProgressStatus";

/**
 * @class NOWPermitGeneration - contains the form and information to generate a permit document form a Notice of Work
 */

const propTypes = {
  noticeOfWork: CustomPropTypes.importedNOWApplication.isRequired,
  appOptions: PropTypes.arrayOf(CustomPropTypes.options).isRequired,
  handleGenerateDocumentFormSubmit: PropTypes.func.isRequired,
  documentType: PropTypes.objectOf(PropTypes.any).isRequired,
  toggleEditMode: PropTypes.func.isRequired,
  isViewMode: PropTypes.bool.isRequired,
  fixedTop: PropTypes.bool.isRequired,
  reset: PropTypes.func.isRequired,
  fetchPermits: PropTypes.func.isRequired,
  updatePermitAmendment: PropTypes.func.isRequired,
  fetchDraftPermitByNOW: PropTypes.func.isRequired,
  formValues: CustomPropTypes.permitGenObj.isRequired,
  draftPermit: CustomPropTypes.permit.isRequired,
  draftPermitAmendment: CustomPropTypes.permitAmendment.isRequired,
  isAmendment: PropTypes.bool.isRequired,
};

const defaultProps = {};

const originalPermit = "OGP";

const regionHash = {
  SE: "Cranbrook",
  SC: "Kamloops",
  NE: "Prince George",
  NW: "Smithers",
  SW: "Victoria",
};

export class NOWPermitGeneration extends Component {
  state = {
    isDraft: false,
    permitGenObj: {},
    isLoaded: false,
    permittee: {},
  };

  componentDidMount() {
    this.fetchDraftPermit();

    const permittee = this.props.noticeOfWork.contacts.filter(
      (contact) => contact.mine_party_appt_type_code_description === "Permittee"
    )[0];
    this.setState({ permittee });
  }

  componentDidUpdate = (prevProps) => {
    if (prevProps.noticeOfWork !== this.props.noticeOfWork) {
      this.fetchDraftPermit();
    }
  };

  fetchDraftPermit = () => {
    this.props.fetchPermits(this.props.noticeOfWork.mine_guid);
    this.handleDraftPermit();
  };

  handleDraftPermit = () => {
    this.props
      .fetchDraftPermitByNOW(
        this.props.noticeOfWork.mine_guid,
        this.props.noticeOfWork.now_application_guid
      )
      .then(() => {
        if (!isEmpty(this.props.draftPermitAmendment)) {
          const permitGenObj = this.createPermitGenObject(
            this.props.noticeOfWork,
            this.props.draftPermit,
            this.props.draftPermitAmendment
          );
          this.setState({ isDraft: !isEmpty(this.props.draftPermitAmendment), permitGenObj });
        }
        this.setState({ isLoaded: true });
      });
  };

  createPermitGenObject = (noticeOfWork, draftPermit, amendment = {}) => {
    const permitGenObject = {
      permit_number: "",
      issue_date: moment().format("MMM DD YYYY"),
      auth_end_date: "",
      regional_office: regionHash[noticeOfWork.mine_region],
      current_date: moment().format("Do"),
      current_month: moment().format("MMMM"),
      current_year: moment().format("YYYY"),
      conditions: "",
      lead_inspector_title: "Inspector of Mines",
    };
    permitGenObject.mine_no = noticeOfWork.mine_no;

    const permittee = noticeOfWork.contacts.filter(
      (contact) => contact.mine_party_appt_type_code_description === "Permittee"
    )[0];

    const originalAmendment = draftPermit.permit_amendments.filter(
      (org) => org.permit_amendment_type_code === originalPermit
    )[0];

    const addressLineOne =
      !isEmpty(permittee) &&
      !isEmpty(permittee.party.address[0]) &&
      permittee.party.address[0].address_line_1
        ? `${permittee.party.address[0].address_line_1}\n`
        : "";
    const addressLineTwo =
      !isEmpty(permittee) && !isEmpty(permittee.party.address[0])
        ? `${permittee.party.address[0].city || ""} ${permittee.party.address[0]
            .sub_division_code || ""} ${permittee.party.address[0].post_code || ""}`
        : "";
    const mailingAddress = `${addressLineOne}${addressLineTwo}`;
    permitGenObject.permittee = !isEmpty(permittee) ? permittee.party.name : "";
    permitGenObject.permittee_email = !isEmpty(permittee) ? permittee.party.email : "";
    permitGenObject.permittee_mailing_address = mailingAddress;
    permitGenObject.property = noticeOfWork.property_name;
    permitGenObject.mine_location = `Latitude: ${noticeOfWork.latitude}, Longitude: ${noticeOfWork.longitude}`;
    permitGenObject.application_date = noticeOfWork.submitted_date;
    permitGenObject.permit_number = draftPermit.permit_no;
    permitGenObject.auth_end_date = noticeOfWork.proposed_end_date;
    permitGenObject.original_permit_issue_date = isEmpty(originalAmendment)
      ? ""
      : originalAmendment.issue_date;
    permitGenObject.application_type = this.props.appOptions.filter(
      (option) => option.notice_of_work_type_code === noticeOfWork.notice_of_work_type_code
    )[0].description;
    permitGenObject.lead_inspector = noticeOfWork.lead_inspector.name;
    permitGenObject.regional_office = !amendment.regional_office
      ? regionHash[noticeOfWork.mine_region]
      : amendment.regional_office;

    return permitGenObject;
  };

  createDocList = (noticeOfWork) => {
    return noticeOfWork.documents
      .filter((document) => document.is_final_package)
      .map((document) => ({
        document_name: document.mine_document.document_name,
        document_upload_date: formatDate(document.mine_document.upload_date),
      }));
  };

  handlePermitGenSubmit = () => {
    const newValues = this.props.formValues;
    if (this.props.isAmendment) {
      newValues.original_permit_issue_date = formatDate(
        this.props.formValues.original_permit_issue_date
      );
    }
    newValues.auth_end_date = formatDate(this.props.formValues.auth_end_date);
    this.props.handleGenerateDocumentFormSubmit(this.props.documentType, {
      ...newValues,
      document_list: this.createDocList(this.props.noticeOfWork),
    });
  };

  handleCancelDraftEdit = () => {
    this.props.reset(FORM.GENERATE_PERMIT);
    this.props.toggleEditMode();
  };

  handleSaveDraftEdit = () => {
    this.setState({ isLoaded: false });
    const payload = {
      lead_inspector_title: this.props.formValues.lead_inspector_title,
      regional_office: this.props.formValues.regional_office,
    };
    this.props
      .updatePermitAmendment(
        this.props.noticeOfWork.mine_guid,
        this.props.draftPermit.permit_guid,
        this.props.draftPermitAmendment.permit_amendment_guid,
        payload
      )
      .then(() => {
        this.handleDraftPermit();
        this.props.toggleEditMode();
      });
  };

  renderEditModeNav = () => {
    const nowType = this.props.noticeOfWork.type_of_application
      ? `(${this.props.noticeOfWork.type_of_application})`
      : "";
    return this.props.isViewMode ? (
      <div className="inline-flex block-mobile padding-md">
        <h2>
          {`Draft Permit ${nowType}`}
          <CoreTooltip
            title="This page contains all the information that will appear in the permit when it is
                    issued. The Conditions sections are pre-populated with conditions based on the
                    permit type. You can add or remove any condition."
          />
        </h2>
        <NOWProgressActions tab="DFT" handleDraftPermit={this.handleDraftPermit} />
        {this.state.isDraft && (
          <>
            <NOWActionWrapper permission={Permission.EDIT_PERMITS} tab="DFT">
              <Button type="secondary" onClick={this.props.toggleEditMode}>
                <img alt="EDIT_OUTLINE" className="padding-small--right" src={EDIT_OUTLINE} />
                Edit
              </Button>
            </NOWActionWrapper>
            <Button
              className="full-mobile"
              type="secondary"
              onClick={this.handlePermitGenSubmit}
              disabled={isEmpty(this.state.permittee)}
              title={
                isEmpty(this.state.permittee)
                  ? "The application must have a permittee assigned before viewing the draft."
                  : ""
              }
            >
              <DownloadOutlined className="padding-small--right icon-sm" />
              Download Draft
            </Button>
          </>
        )}
      </div>
    ) : (
      <div className="center padding-md">
        <div className="inline-flex flex-center block-mobile">
          <Popconfirm
            placement="bottomRight"
            title="You have unsaved changes, Are you sure you want to cancel?"
            onConfirm={this.handleCancelDraftEdit}
            okText="Yes"
            cancelText="No"
          >
            <Button type="secondary" className="full-mobile">
              Cancel
            </Button>
          </Popconfirm>
          <Button type="primary" className="full-mobile" onClick={this.handleSaveDraftEdit}>
            Save
          </Button>
        </div>
      </div>
    );
  };

  render() {
    const isProcessed =
      this.props.noticeOfWork.now_application_status_code === "AIA" ||
      this.props.noticeOfWork.now_application_status_code === "WDN" ||
      this.props.noticeOfWork.now_application_status_code === "REJ";
    return isProcessed ? (
      <div>
        <div className={this.props.fixedTop ? "view--header fixed-scroll" : "view--header"}>
          {this.renderEditModeNav()}
          <NOWStatusIndicator type="banner" tabSection="DFT" isEditMode={!this.props.isViewMode} />
        </div>
        <div
          className={
            this.props.fixedTop
              ? "view--content with-fixed-top side-menu--content"
              : "view--content side-menu--content"
          }
        >
          <h3 style={{ textAlign: "center", paddingTop: "20px" }}>
            This application has been processed.
          </h3>
        </div>
      </div>
    ) : (
      <div>
        <div className={this.props.fixedTop ? "view--header fixed-scroll" : "view--header"}>
          {this.renderEditModeNav()}
          <NOWStatusIndicator type="banner" tabSection="DFT" isEditMode={!this.props.isViewMode} />
          <NOWProgressStatus tab="DFT" />
        </div>
        <div className={this.props.fixedTop ? "side-menu--fixed" : "side-menu"}>
          <NOWSideMenu
            route={routes.NOTICE_OF_WORK_APPLICATION}
            noticeOfWorkType={this.props.noticeOfWork.notice_of_work_type_code}
            tabSection="draft-permit"
          />
        </div>
        <div
          className={
            this.props.fixedTop ? "side-menu--content with-fixed-top" : "side-menu--content"
          }
        >
          <LoadingWrapper condition={this.state.isLoaded}>
            {!this.state.isDraft ? (
              <NullScreen type="draft-permit" />
            ) : (
              <GeneratePermitForm
                initialValues={this.state.permitGenObj}
                isAmendment={this.props.isAmendment}
                noticeOfWork={this.props.noticeOfWork}
                isViewMode={this.props.isViewMode}
              />
            )}
          </LoadingWrapper>
        </div>
      </div>
    );
  }
}

NOWPermitGeneration.propTypes = propTypes;
NOWPermitGeneration.defaultProps = defaultProps;

const mapStateToProps = (state) => ({
  appOptions: getNoticeOfWorkApplicationTypeOptions(state),
  formValues: getFormValues(FORM.GENERATE_PERMIT)(state),
  draftPermit: getDraftPermitForNOW(state),
  draftPermitAmendment: getDraftPermitAmendmentForNOW(state),
});

const mapDispatchToProps = (dispatch) =>
  bindActionCreators(
    {
      reset,
      fetchPermits,
      updatePermitAmendment,
      fetchDraftPermitByNOW,
    },
    dispatch
  );

export default connect(mapStateToProps, mapDispatchToProps)(NOWPermitGeneration);
