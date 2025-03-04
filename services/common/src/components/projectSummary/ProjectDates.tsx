import React from "react";
import { useSelector } from "react-redux";
import { Field, getFormValues } from "redux-form";
import { Col, Row, Typography } from "antd";
import {
  dateNotBeforeOther,
  dateNotAfterOther,
  dateInFuture,
} from "@mds/common/redux/utils/Validate";
import Callout from "@mds/common/components/common/Callout";
import { FORM, isFieldDisabled } from "@mds/common/constants";
import RenderDate from "@mds/common/components/forms/RenderDate";
import { getSystemFlag } from "@mds/common/redux/selectors/authenticationSelectors";

export const ProjectDates = () => {
  const formValues = useSelector(getFormValues(FORM.ADD_EDIT_PROJECT_SUMMARY));
  const {
    expected_permit_application_date,
    expected_draft_irt_submission_date,
    expected_permit_receipt_date,
  } = formValues;
  const systemFlag = useSelector(getSystemFlag);

  return (
    <>
      <Typography.Title level={3}>Project Dates</Typography.Title>
      <Row gutter={[0, 16]}>
        <Col>
          <Callout
            message={
              <>
                These dates are for guidance and planning purposes only and do not reflect actual
                delivery dates. The{" "}
                <a
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Major Mines Permitting Office"
                  href="https://www2.gov.bc.ca/gov/content/industry/mineral-exploration-mining/permitting/major-mines-permitting-office"
                >
                  Major Mines Office
                </a>{" "}
                will work with you on a more definitive schedule.
              </>
            }
          />
        </Col>
        <Col span={24}>
          <Field
            id="expected_draft_irt_submission_date"
            name="expected_draft_irt_submission_date"
            label="When do you anticipate submitting a draft Information Requirements Table?"
            placeholder="Please select date"
            component={RenderDate}
            allowClear
            validate={[dateInFuture, dateNotAfterOther(expected_permit_application_date, "the expected permit application date")]}
            disabled={isFieldDisabled(systemFlag, formValues?.status_code)}
          />
        </Col>
        <Col span={24}>
          <Field
            id="expected_permit_application_date"
            name="expected_permit_application_date"
            label="When do you anticipate submitting a permit application?"
            placeholder="Please select date"
            component={RenderDate}
            allowClear
            validate={[dateInFuture, dateNotBeforeOther(expected_draft_irt_submission_date, "the expected draft IRT submission date")]}
            disabled={isFieldDisabled(systemFlag, formValues?.status_code)}
          />
        </Col>
        <Col span={24}>
          <Field
            id="expected_permit_receipt_date"
            name="expected_permit_receipt_date"
            label="When do you hope to receive your permit/amendment(s)?"
            placeholder="Please select date"
            component={RenderDate}
            allowClear
            validate={[dateInFuture, dateNotBeforeOther(expected_permit_application_date, "the expected permit application date")]}
            disabled={isFieldDisabled(systemFlag, formValues?.status_code)}
          />
        </Col>
        <Col span={24}>
          <Field
            id="expected_project_start_date"
            name="expected_project_start_date"
            label="When do you anticipate starting work on this project?"
            placeholder="Please select date"
            component={RenderDate}
            allowClear
            validate={[dateInFuture, dateNotBeforeOther(expected_permit_receipt_date, "the expected permit receipt date")]}
            disabled={isFieldDisabled(systemFlag, formValues?.status_code)}
          />
        </Col>
      </Row>
    </>
  );
};

export default ProjectDates;
