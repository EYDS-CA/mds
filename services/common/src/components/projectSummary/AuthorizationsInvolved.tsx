import React, { useContext, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  arrayPush,
  arrayRemove,
  change,
  Field,
  FieldArray,
  FormSection,
  getFormValues,
} from "redux-form";
import { Alert, Button, Checkbox, Col, Row, Tooltip, Typography } from "antd";
import InfoCircleOutlined from "@ant-design/icons/InfoCircleOutlined";
import PlusCircleFilled from "@ant-design/icons/PlusCircleFilled";
import {
  getDropdownProjectSummaryPermitTypes,
  getProjectSummaryDocumentTypesHash,
  getTransformedProjectSummaryAuthorizationTypes,
} from "@mds/common/redux/selectors/staticContentSelectors";
import { getAmsAuthorizationTypes } from "@mds/common/redux/selectors/projectSelectors";
import {
  digitCharactersOnly,
  minLength,
  maxLength,
  required,
  requiredList,
  requiredRadioButton,
} from "@mds/common/redux/utils/Validate";
import RenderField from "@mds/common/components/forms/RenderField";
import RenderRadioButtons from "@mds/common/components/forms/RenderRadioButtons";
import RenderGroupCheckbox, {
  normalizeGroupCheckBox,
} from "@mds/common/components/forms/RenderGroupCheckbox";
import RenderAutoSizeField from "@mds/common/components/forms/RenderAutoSizeField";
import RenderMultiSelect from "@mds/common/components/forms/RenderMultiSelect";
import { getPermits } from "@mds/common/redux/selectors/permitSelectors";
import { fetchPermits } from "@mds/common/redux/actionCreators/permitActionCreator";
import { createDropDownList } from "@mds/common/redux/utils/helpers";
import { FORM } from "@mds/common/constants/forms";
import RenderHiddenField from "../forms/RenderHiddenField";
import AuthorizationSupportDocumentUpload from "./AuthorizationSupportDocumentUpload";
import { IProjectSummaryDocument } from "@mds/common/interfaces";
import {
  renderTextColumn,
  renderDateColumn,
  renderCategoryColumn,
} from "@mds/common/components/common/CoreTableCommonColumns";
import DocumentTable from "@mds/common/components/documents/DocumentTable";
import { MineDocument } from "@mds/common/models/documents/document";
import { Link } from "react-router-dom";
import {
  PROJECT_SUMMARY_DOCUMENT_TYPE_CODE_STATE,
  ENVIRONMENTAL_MANAGMENT_ACT,
  WASTE_DISCHARGE_NEW_AUTHORIZATIONS_URL,
  WASTE_DISCHARGE_AMENDMENT_AUTHORIZATIONS_URL,
  isFieldDisabled,
} from "../..";
import { SystemFlagEnum } from "@mds/common/constants/enums";
import { getSystemFlag } from "@mds/common/redux/selectors/authenticationSelectors";
import { FormContext } from "../forms/FormWrapper";

const RenderEMAPermitCommonSections = ({ code, isAmendment, index, isDisabled }) => {
  const dispatch = useDispatch();
  const purposeLabel = isAmendment
    ? "Additional Amendment Request Information"
    : "Purpose of Application";
  const authType = isAmendment ? "AMENDMENT" : "NEW";
  const { authorizations, mine_guid, project_guid, project_summary_guid } = useSelector(
    getFormValues(FORM.ADD_EDIT_PROJECT_SUMMARY)
  );
  const codeAuthorizations = authorizations[code];
  const { AMENDMENT, NEW } = codeAuthorizations;
  const sectionValues = isAmendment ? AMENDMENT[index] : NEW[index];
  const [showExemptionSection, setshowExemptionSection] = useState(
    sectionValues?.exemption_requested || false
  );

  const projectSummaryDocumentTypesHash = useSelector(getProjectSummaryDocumentTypesHash);

  const onChange = (value, _newVal, _prevVal, _fieldName) => {
    setshowExemptionSection(value);
  };

  const removeAmendmentDocument = (
    amendmentDocumentsIndex: number,
    category: string,
    document_manager_guid: string
  ) => {
    const categorySpecificDocumentType = PROJECT_SUMMARY_DOCUMENT_TYPE_CODE_STATE[category];
    const categorySpecificDocuments = sectionValues[categorySpecificDocumentType];
    const categorySpecificDocumentIndex = categorySpecificDocuments?.findIndex(
      (doc) => document_manager_guid === doc.document_manager_guid
    );
    dispatch(
      arrayRemove(
        FORM.ADD_EDIT_PROJECT_SUMMARY,
        `authorizations.[${code}].${authType}[${index}].${categorySpecificDocumentType}`,
        categorySpecificDocumentIndex
      )
    );
    dispatch(
      arrayRemove(
        FORM.ADD_EDIT_PROJECT_SUMMARY,
        `authorizations.[${code}].${authType}[${index}].amendment_documents`,
        amendmentDocumentsIndex
      )
    );
  };

  const updateAmendmentDocument = (document: IProjectSummaryDocument) => {
    const category = document.category || document.project_summary_document_type_code;

    dispatch(
      arrayPush(
        FORM.ADD_EDIT_PROJECT_SUMMARY,
        `authorizations.[${code}].${authType}[${index}].${PROJECT_SUMMARY_DOCUMENT_TYPE_CODE_STATE[category]}`,
        document
      )
    );

    dispatch(
      arrayPush(
        FORM.ADD_EDIT_PROJECT_SUMMARY,
        `authorizations.[${code}].${authType}[${index}].amendment_documents`,
        document
      )
    );
  };

  const tableDocuments =
    sectionValues?.amendment_documents?.map(
      (doc) =>
        new MineDocument({
          ...doc,
          category: doc.project_summary_document_type_code || doc.category,
        })
    ) ?? [];

  const documentColumns = [
    renderTextColumn("document_name", "File Name"),
    renderCategoryColumn(
      "category",
      "Document Category",
      projectSummaryDocumentTypesHash,
      false,
      "N/A"
    ),
    renderDateColumn("upload_date", "Updated"),
    renderTextColumn("create_user", "Updated By"),
  ];

  return (
    <>
      <Field
        disabled={isDisabled}
        label={purposeLabel}
        name="authorization_description"
        required
        validate={[required, maxLength(4000)]}
        maximumCharacters={4000}
        minRows={2}
        component={RenderAutoSizeField}
        placeholder="e.g. To Discharge air emissions from x number of stacks at a sawmill."
      />
      <Field
        disabled={isDisabled}
        component={RenderRadioButtons}
        name="exemption_requested"
        required
        onChange={onChange}
        validate={[requiredRadioButton]}
        label={
          <>
            Pre-Application Exemption Request for Environmental Management Act application
            <Tooltip title="This request for an exemption is an option intended for applicants that have previous experience with permitting under the Environmental Management Act and do not require a meeting with the Ministry to clarify requirements.">
              <InfoCircleOutlined />
            </Tooltip>
          </>
        }
      />
      {showExemptionSection && (
        <div>
          <Field
            disabled={isDisabled}
            label="State the reason of exemption"
            name="exemption_reason"
            required
            validate={[required, maxLength(4000)]}
            maximumCharacters={4000}
            minRows={2}
            component={RenderAutoSizeField}
          />
          <Alert
            description={
              <>
                <b>If yes, a final application form is required in the supporting document below</b>
                . Note that exemptions aren&apos;t guaranteed. Incomplete applications may be
                returned without refund if they don&apos;t meet Ministry requirements. Ministry
                staff will contact you to discuss your exemption request.
              </>
            }
            showIcon
          />
        </div>
      )}
      <div className="margin-large--bottom">
        <Typography.Title level={5} className="margin-large--top">
          Upload Documents
        </Typography.Title>
        <Typography.Text>
          {" "}
          Submit the documents required for your amendment application.
        </Typography.Text>
      </div>
      <AuthorizationSupportDocumentUpload
        code={code}
        mineGuid={mine_guid}
        documents={tableDocuments}
        updateAmendmentDocument={updateAmendmentDocument}
        removeAmendmentDocument={removeAmendmentDocument}
        projectGuid={project_guid}
        projectSummaryGuid={project_summary_guid}
        showExemptionSection={showExemptionSection}
        isAmendment={isAmendment}
        amendmentChanges={sectionValues?.amendment_changes}
        isDisabled={isDisabled}
      />
      <DocumentTable
        documents={tableDocuments}
        documentParent="project summary authorization"
        documentColumns={documentColumns}
      />
    </>
  );
};

const RenderEMANewPermitSection = ({ code, isDisabled }) => {
  return (
    <div className="grey-box margin-medium--left margin-large--bottom">
      <FormSection name={`${code}.NEW[0]`}>
        <Field
          disabled={isDisabled}
          name="new_type"
          isVertical
          label="Authorization Type"
          customOptions={[
            {
              label: (
                <>
                  Permit
                  <br />
                  <span className="label-subtitle">
                    Authorization to discharge waste to the environment; an ongoing authorization.
                  </span>
                </>
              ),
              value: "PER",
            },
            {
              label: (
                <>
                  Approval
                  <br />
                  <span className="label-subtitle">
                    Temporary authorization to discharge waste to the environment for a maximum of
                    15 months.
                  </span>
                </>
              ),
              value: "APP",
            },
          ]}
          component={RenderRadioButtons}
          required
          validate={[requiredRadioButton]}
        />
        <Field
          disabled={isDisabled}
          label="Is this Authorization required for remediation of a contaminated site?"
          name="is_contaminated"
          required
          validate={[requiredRadioButton]}
          component={RenderRadioButtons}
        />
        <RenderEMAPermitCommonSections
          isDisabled={isDisabled}
          isAmendment={false}
          code={code}
          index={0}
        />
      </FormSection>
    </div>
  );
};

const RenderEMAAmendFieldArray = ({ fields, code, isDisabled, isEditMode }) => {
  const handleRemoveAmendment = (index: number) => {
    fields.remove(index);
  };

  return (
    <>
      {fields.map((amendment: string, index) => (
        <Col className="grey-box margin-large--top" key={amendment}>
          <FormSection name={amendment}>
            <Field
              label={
                <Row justify="space-between" style={{ flexBasis: "100%" }}>
                  <Col>
                    <Typography.Text>
                      Authorization Number &nbsp;&nbsp;&nbsp;
                      <a
                        href="https://j200.gov.bc.ca/pub/ams/Default.aspx?PossePresentation=DocumentSearch"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        AMS Lookup
                      </a>
                    </Typography.Text>
                  </Col>
                  {isEditMode && <Col>
                    <Button onClick={() => handleRemoveAmendment(index)}>Cancel</Button>
                  </Col>}
                </Row>
              }
              name="existing_permits_authorizations[0]"
              required
              validate={[required, minLength(2), maxLength(6), digitCharactersOnly]}
              help="Number only (e.g. PC12345 should be entered as 12345)"
              component={RenderField}
              isDisabled={isDisabled}
            />
            <Field
              label="Amendment Type"
              name="amendment_severity"
              help="As defined in the Environmental Management Act Public Notification Regulation"
              required
              validate={[requiredRadioButton]}
              component={RenderRadioButtons}
              customOptions={[
                { label: "Significant", value: "SIG" },
                { label: "Minor", value: "MIN" },
              ]}
              isDisabled={isDisabled}
            />
            <Field
              label="Amendment Changes Requested that relate to the British Columbia Environmental Act (Select all that apply)"
              name="amendment_changes"
              required
              validate={[required]}
              component={RenderGroupCheckbox}
              normalize={normalizeGroupCheckBox}
              options={[
                { label: "Increase Discharge Limit (<10%)", value: "ILT" },
                { label: "Increase Discharge Limit (>10%)", value: "IGT" },
                { label: "Decrease Discharge Limit", value: "DDL" },
                { label: "Name Change", value: "NAM" },
                { label: "Transfer", value: "TRA" },
                { label: "Modify Monitoring Requirements", value: "MMR" },
                { label: "Regulatory Change", value: "RCH" },
                { label: "Other", value: "OTH" },
              ]}
              isDisabled={isDisabled}
            />
            <Field
              label="Is this Authorization required for remediation of a contaminated site?"
              name="is_contaminated"
              required
              validate={[requiredRadioButton]}
              component={RenderRadioButtons}
              isDisabled={isDisabled}
            />
            <RenderEMAPermitCommonSections
              isDisabled={isDisabled}
              isAmendment={true}
              code={code}
              index={index}
            />
          </FormSection>
        </Col>
      ))}
    </>
  );
};

const RenderEMAAuthCodeFormSection = ({ code, isDisabled }) => {
  const { authorizations } = useSelector(getFormValues(FORM.ADD_EDIT_PROJECT_SUMMARY));
  const codeAuthorizations = authorizations[code] ?? [];
  const hasAmendments = codeAuthorizations.AMENDMENT?.length > 0;
  const hasNew = codeAuthorizations.NEW?.length > 0;
  const permitTypes = ["AMENDMENT", "NEW"];
  const dispatch = useDispatch();
  const { isEditMode } = useContext(FormContext);

  const addAmendment = () => {
    dispatch(arrayPush(FORM.ADD_EDIT_PROJECT_SUMMARY, `authorizations.${code}.AMENDMENT`, {}));
  };

  const handleChangeAuthType = (value, _newVal, prevVal, _fieldName) => {
    permitTypes.forEach((type) => {
      if (value.includes(type) && !prevVal.includes(type)) {
        dispatch(arrayPush(FORM.ADD_EDIT_PROJECT_SUMMARY, `authorizations.${code}.${type}`, {}));
      } else if (!value.includes(type) && prevVal.includes(type)) {
        dispatch(change(FORM.ADD_EDIT_PROJECT_SUMMARY, `authorizations.${code}.${type}`, []));
      }
    });
  };

  return (
    <div className="margin-large--left">
      <Field
        disabled={isDisabled}
        name={`${code}.types`}
        component={RenderGroupCheckbox}
        required
        validate={[requiredList]}
        normalize={normalizeGroupCheckBox}
        onDrop={(event) => {
          event.preventDefault();
        }}
        onChange={handleChangeAuthType}
        props={{
          label: (
            <span className="margin-large--top">
              What type of authorization is involved in your application?
            </span>
          ),
          options: [
            {
              disabled: hasAmendments,
              label: (
                <>
                  Amendment to an existing authorization
                  {hasAmendments && (
                    <Row
                      style={{ marginLeft: "-24px", marginRight: "-16px", cursor: "default" }}
                      gutter={[0, 16]}
                    >
                      <FieldArray
                        name={`${code}.AMENDMENT`}
                        component={RenderEMAAmendFieldArray}
                        props={{ code, isDisabled, isEditMode }}
                      />
                      {isEditMode && <Button
                        disabled={isDisabled}
                        onClick={addAmendment}
                        icon={<PlusCircleFilled />}
                        className="btn-sm-padding margin-large--bottom"
                      >
                        Add another amendment
                      </Button>}
                    </Row>
                  )}
                </>
              ),
              value: "AMENDMENT",
            },
            {
              label: "New",
              value: "NEW",
            },
          ],
        }}
      />
      {hasNew && <RenderEMANewPermitSection isDisabled={isDisabled} code={code} />}
    </div>
  );
};

const RenderMinesActPermitSelect = ({ isDisabled }) => {
  const dispatch = useDispatch();
  const formValues = useSelector(getFormValues(FORM.ADD_EDIT_PROJECT_SUMMARY));
  const { mine_guid } = formValues;
  const permits = useSelector(getPermits);
  const permitDropdown = createDropDownList(permits, "permit_no", "permit_guid");
  const permitMineGuid = permits[0]?.mine_guid;
  const [loaded, setLoaded] = useState(permits.length > 0 && permitMineGuid === mine_guid);

  useEffect(() => {
    if (mine_guid && (!loaded || permitMineGuid !== mine_guid)) {
      setLoaded(false);
      dispatch(fetchPermits(mine_guid)).then(() => {
        setLoaded(true);
      });
    }
  }, [mine_guid]);

  return (
    <Field
      disabled={isDisabled}
      name="existing_permits_authorizations"
      component={RenderMultiSelect}
      data={permitDropdown}
      loading={!loaded}
      label="If your application involved a change to an existing permit, please list the permits involved."
    />
  );
};

const RenderAuthCodeFormSection = ({ authorizationType, code, isDisabled }) => {
  const dropdownProjectSummaryPermitTypes = useSelector(getDropdownProjectSummaryPermitTypes);
  if (authorizationType === "ENVIRONMENTAL_MANAGMENT_ACT") {
    // AMS authorizations, have options of amend/new with more details
    return <RenderEMAAuthCodeFormSection isDisabled={isDisabled} code={code} />;
  }
  if (authorizationType === "OTHER_LEGISLATION") {
    return (
      <FormSection name={`${code}[0]`}>
        <Row>
          <Field
            disabled={isDisabled}
            name="authorization_description"
            label="If the legislation you're seeking isn't listed, please provide the details here"
            maximumCharacters={100}
            required
            validate={[required, maxLength(100)]}
            component={RenderAutoSizeField}
          />
        </Row>
      </FormSection>
    );
  }
  const isMinesAct = authorizationType === "MINES_ACT";

  // other authorizations, have single record so index with [0]
  return (
    <FormSection name={`${code}[0]`}>
      <Row className="grey-box margin-large--top margin-medium--bottom">
        <Field
          disabled={isDisabled}
          name="project_summary_permit_type"
          props={{
            options: dropdownProjectSummaryPermitTypes,
            label: "What type of permit is involved in your application?",
          }}
          component={RenderGroupCheckbox}
          required
          validate={[requiredList]}
          normalize={normalizeGroupCheckBox}
        />
        {isMinesAct ? (
          <RenderMinesActPermitSelect isDisabled={isDisabled} />
        ) : (
          <Field
            disabled={isDisabled}
            name="existing_permits_authorizations"
            normalize={(val) => val.split(",").map((v) => v.trim())}
            component={RenderField}
            label="If your application involved a change to an existing permit, please list the numbers of the permits involved."
            help="Please separate each permit with a comma"
          />
        )}
      </Row>
    </FormSection>
  );
};

export const AuthorizationsInvolved = () => {
  const dispatch = useDispatch();
  const transformedProjectSummaryAuthorizationTypes = useSelector(
    getTransformedProjectSummaryAuthorizationTypes
  );
  const { isEditMode } = useContext(FormContext);
  const amsAuthTypes = useSelector(getAmsAuthorizationTypes);
  const formValues = useSelector(getFormValues(FORM.ADD_EDIT_PROJECT_SUMMARY));

  const systemFlag = useSelector(getSystemFlag);
  const isCore = systemFlag === SystemFlagEnum.core;

  const handleChange = (e, code) => {
    if (e.target.checked) {
      let formVal;
      dispatch(arrayPush(FORM.ADD_EDIT_PROJECT_SUMMARY, `authorizationTypes`, code));
      if (amsAuthTypes.includes(code)) {
        formVal = { AMENDMENT: [], NEW: [], types: [] };
      } else if (code === "OTHER") {
        formVal = [
          { project_summary_authorization_type: code, project_summary_permit_type: ["OTHER"] },
        ];
      } else {
        formVal = [{ project_summary_authorization_type: code }];
      }
      dispatch(change(FORM.ADD_EDIT_PROJECT_SUMMARY, `authorizations[${code}]`, formVal));
    } else {
      const index = formValues.authorizationTypes.indexOf(code);
      dispatch(arrayRemove(FORM.ADD_EDIT_PROJECT_SUMMARY, `authorizationTypes`, index));
      dispatch(change(FORM.ADD_EDIT_PROJECT_SUMMARY, `authorizations[${code}]`, null));
    }
  };

  return (
    <div id="authorizations-involved">
      <Row gutter={[0, 16]}>
        <Typography.Title level={3}>Purpose and Authorization</Typography.Title>
        <Alert
          description="Select the authorization that you anticipate needing for this project. This is to assist in planning and may not be the complete list for the final application."
          type="warning"
          showIcon
        />
        <Field
          name="authorizationTypes"
          component={RenderHiddenField}
          required
          validate={[requiredList]}
          label={<Typography.Title level={4}>Regulatory Approval Type</Typography.Title>}
        >
          <FormSection name="authorizations">
            {transformedProjectSummaryAuthorizationTypes.map((authorization) => {
              return (
                <div key={authorization.code} className="margin-large--bottom">
                  <Typography.Title level={5}>{authorization.description}</Typography.Title>
                  {authorization.code === ENVIRONMENTAL_MANAGMENT_ACT && (
                    <Typography.Paragraph>
                      For registration under the Municipal Wastewater Regulation and Hazardous Waste
                      Regulation, please refer to the{" "}
                      <Link
                        to={{ pathname: WASTE_DISCHARGE_NEW_AUTHORIZATIONS_URL }}
                        target="_blank"
                      >
                        new authorization
                      </Link>{" "}
                      or{" "}
                      <Link
                        to={{ pathname: WASTE_DISCHARGE_AMENDMENT_AUTHORIZATIONS_URL }}
                        target="_blank"
                      >
                        authorization amendment
                      </Link>{" "}
                      guideline.
                    </Typography.Paragraph>
                  )}

                  {authorization.children.map((child) => {
                    const checked = formValues.authorizationTypes?.includes(child.code);
                    return (
                      <div key={child.code}>
                        <Row gutter={[0, 16]}>
                          <Col>
                            <Checkbox
                              disabled={!isEditMode || isFieldDisabled(systemFlag, formValues?.status_code, true)}
                              data-cy={`checkbox-authorization-${child.code}`}
                              value={child.code}
                              checked={checked}
                              onChange={(e) => handleChange(e, child.code)}
                            >
                              <b className={!isEditMode && "view-item-label"}>{child.description}</b>
                            </Checkbox>
                            {checked && (
                              <>
                                {child.code === "MINES_ACT_PERMIT" && (
                                  <Alert
                                    className="margin-large--y"
                                    message="You are submitting a Major Mine Application to the Chief Permitting Officer"
                                    description={
                                      <div className="list-position-outside">
                                        <ul>
                                          <li>
                                            For intent to depart from a Mines Act authorized mine
                                            plan and reclamation program, as per HSRC code 10.2.9,
                                            submit a{" "}
                                            {isCore ? (
                                              "Notice of Departure"
                                            ) : (
                                              <Link
                                                to={GLOBAL_ROUTES?.MINE_DASHBOARD.dynamicRoute(
                                                  formValues?.mine_guid,
                                                  "nods"
                                                )}
                                              >
                                                Notice of Departure
                                              </Link>
                                            )}{" "}
                                            through MineSpace
                                          </li>
                                          <li>
                                            For exploration work outside the permit mine area
                                            without expanding the production area, submit a Notice
                                            of Work application via FrontCounter BC to amend your MX
                                            or CX permit.
                                          </li>
                                          <li>
                                            For induced polarization surveys or exploration drilling
                                            within the permit mine area, submit a Notification of
                                            Deemed Authorization application via FrontCounter BC.
                                          </li>
                                        </ul>
                                      </div>
                                    }
                                    type="info"
                                    showIcon
                                  />
                                )}
                                <RenderAuthCodeFormSection
                                  isDisabled={isFieldDisabled(
                                    systemFlag,
                                    formValues?.status_code,
                                    true
                                  )}
                                  code={child?.code}
                                  authorizationType={authorization?.code}
                                />
                              </>
                            )}
                          </Col>
                        </Row>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </FormSection>
        </Field>
      </Row>
    </div>
  );
};

export default AuthorizationsInvolved;
