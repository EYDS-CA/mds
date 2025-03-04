import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { compose } from "redux";
import { Field, reduxForm, getFormValues } from "redux-form";
import { connect } from "react-redux";
import { Button, Col, Row, Popconfirm, Typography, Divider, Checkbox, Form } from "antd";
import { resetForm } from "@common/utils/helpers";
import * as FORM from "@/constants/forms";
import ProjectDecisionPackageFileUpload from "@/components/mine/Projects/ProjectDecisionPackageFileUpload";

const propTypes = {
  projectGuid: PropTypes.string.isRequired,
  contentTitle: PropTypes.string.isRequired,
  instructions: PropTypes.string.isRequired,
  modalType: PropTypes.string.isRequired,
  submitting: PropTypes.bool.isRequired,
  formValues: PropTypes.objectOf(PropTypes.any).isRequired,
  closeModal: PropTypes.func.isRequired,
  handleSubmit: PropTypes.func.isRequired,
  change: PropTypes.func.isRequired,
};

export const UploadProjectDecisionPackageDocumentForm = (props) => {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [addFilesToDecisionPackage, setAddFilesToDecisionPackage] = useState(false);
  const isDecisionPackageEligible = props.modalType === "upload-document";

  const onFileLoad = (fileName, document_manager_guid) => {
    setUploadedFiles([
      ...uploadedFiles,
      {
        document_name: fileName,
        document_manager_guid,
      },
    ]);
  };

  const onRemoveFile = (err, fileItem) => {
    if (err) {
      console.log(err);
    }

    if (fileItem.serverId) {
      setUploadedFiles(
        uploadedFiles.filter((file) => file.document_manager_guid !== fileItem.serverId)
      );
    }
  };

  useEffect(() => {
    props.change("uploadedFiles", uploadedFiles);
  }, [uploadedFiles]);

  return (
    <Form layout="vertical">
      <Row gutter={16}>
        <Col>
          <Typography.Title level={4}>{props.contentTitle}</Typography.Title>
          <Typography.Text>{props.instructions}</Typography.Text>
          <br />
          <br />
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={24}>
          <Field
            id="uploadedFiles"
            name="uploadedFiles"
            onFileLoad={onFileLoad}
            onRemoveFile={onRemoveFile}
            projectGuid={props.projectGuid}
            component={ProjectDecisionPackageFileUpload}
          />
        </Col>
      </Row>
      {isDecisionPackageEligible && (
        <>
          <Row>
            <Col>
              <Divider />
              <Checkbox
                checked={addFilesToDecisionPackage}
                onChange={() => setAddFilesToDecisionPackage(!addFilesToDecisionPackage)}
              >
                These files are to be added to the decision package
              </Checkbox>
            </Col>
          </Row>
        </>
      )}
      <div className="right center-mobile">
        <Popconfirm
          placement="topRight"
          title="Are you sure you want to cancel?"
          onConfirm={props.closeModal}
          okText="Yes"
          cancelText="No"
          disabled={props.submitting}
        >
          <Button className="full-mobile" type="secondary" disabled={props.submitting}>
            Cancel
          </Button>
        </Popconfirm>
        <Button
          className="full-mobile"
          type="primary"
          disabled={props?.formValues?.uploadedFiles?.length === 0}
          onClick={(event) =>
            props.handleSubmit(event, props?.formValues?.uploadedFiles, {
              addFilesToDecisionPackage,
              isDecisionPackageEligible,
            })
          }
          loading={props.submitting}
        >
          Update
        </Button>
      </div>
    </Form>
  );
};

UploadProjectDecisionPackageDocumentForm.propTypes = propTypes;

const mapStateToProps = (state) => ({
  formValues: getFormValues(FORM.UPDATE_PROJECT_DECISION_PACKAGE_DOCUMENT)(state) || {},
});

export default compose(
  connect(mapStateToProps),
  reduxForm({
    form: FORM.UPDATE_PROJECT_DECISION_PACKAGE_DOCUMENT,
    touchOnBlur: false,
    enableReinitialize: true,
    onSubmitSuccess: resetForm(FORM.UPDATE_PROJECT_DECISION_PACKAGE_DOCUMENT),
  })
)(UploadProjectDecisionPackageDocumentForm);
