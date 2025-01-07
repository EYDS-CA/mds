import React, { useEffect } from "react";
import { Col, Row, Typography } from "antd";
import { useSelector, useDispatch } from "react-redux";
import { Field, getFormValues, change } from "redux-form";

import RenderField from "@mds/common/components/forms/RenderField";
import { getDropdownProvinceOptions } from "@mds/common/redux/selectors/staticContentSelectors";
import RenderSelect from "@mds/common/components/forms/RenderSelect";

import {
  email,
  maxLength,
  phoneNumber,
  required,
  postalCodeWithCountry,
} from "@mds/common/redux/utils/Validate";
import { normalizePhone } from "@mds/common/redux/utils/helpers";
import { FORM, CONTACTS_COUNTRY_OPTIONS, IProjectSummaryForm } from "../..";

const { Title, Paragraph } = Typography;

export const PaymentContact = ({ isDisabled }) => {
  const dispatch = useDispatch();
  const formValues = useSelector(getFormValues(FORM.ADD_EDIT_PROJECT_SUMMARY)) as IProjectSummaryForm;
  const { payment_contact } = formValues;
  const provinceOptions = useSelector(getDropdownProvinceOptions);

  useEffect(() => {
    if (payment_contact?.party_type_code !== "PER" || !payment_contact?.party_type_code) {
      dispatch(change(FORM.ADD_EDIT_PROJECT_SUMMARY, "payment_contact.party_type_code", "PER"));
    }
    if (!payment_contact?.address) {
      dispatch(
        change(FORM.ADD_EDIT_PROJECT_SUMMARY, "payment_contact.address[0].address_line_1", undefined)
      );
      dispatch(
        change(FORM.ADD_EDIT_PROJECT_SUMMARY, "payment_contact.address[0].address_type_code", undefined)
      );
      dispatch(
        change(FORM.ADD_EDIT_PROJECT_SUMMARY, "payment_contact.address[0].sub_division_code", undefined)
      );
      dispatch(change(FORM.ADD_EDIT_PROJECT_SUMMARY, "payment_contact.address[0].city", undefined));
      dispatch(change(FORM.ADD_EDIT_PROJECT_SUMMARY, "payment_contact.address[0].post_code", undefined));
    }
  }, [payment_contact?.party_type_code, payment_contact?.address]);

  const paymentContactAddress = payment_contact?.address || [];
  const isMailingInternational = paymentContactAddress[0]?.address_type_code === "INT";

  return (
    <div style={{ paddingTop: 12 }}>
      <Title level={4}>Contact for Payment</Title>
      <Paragraph>
        Provide contact information for the responsible person for application payments.
      </Paragraph>
      <Row gutter={16}>
        <Col md={12} sm={24}>
          <Field
            disabled={isDisabled}
            name="payment_contact.first_name"
            label="First Name"
            required
            validate={[required]}
            component={RenderField}
          />
        </Col>
        <Col md={12} sm={24}>
          <Field
            disabled={isDisabled}
            name="payment_contact.party_name"
            label="Last Name"
            required
            validate={[required]}
            component={RenderField}
          />
        </Col>
      </Row>
      <Row gutter={16}>
        <Col md={8} sm={19}>
          <Field
            disabled={isDisabled}
            name="payment_contact.phone_no"
            label="Contact Number"
            required
            component={RenderField}
            validate={[phoneNumber, maxLength(12), required]}
            normalize={normalizePhone}
          />
        </Col>
        <Col md={4} sm={5}>
          <Field name="payment_contact.phone_ext" label="Ext." component={RenderField} disabled={isDisabled} />
        </Col>
        <Col md={12} sm={24}>
          <Field
            disabled={isDisabled}
            name="payment_contact.email"
            label="Email Address"
            required
            validate={[required, email]}
            component={RenderField}
          />
        </Col>
      </Row>
      <Title level={5}>Mailing Address</Title>
      <Row gutter={16}>
        <Col md={19} sm={24}>
          <Field
            disabled={isDisabled}
            name="payment_contact.address[0].address_line_1"
            label="Street"
            required
            validate={[required, maxLength(100)]}
            component={RenderField}
          />
        </Col>
        <Col md={5} sm={24}>
          <Field
            validate={[maxLength(5)]}
            disabled={isDisabled}
            name="payment_contact.address[0].suite_no"
            label="Unit #"
            component={RenderField}
          />
        </Col>
      </Row>
      <Row gutter={16}>
        <Col md={12} sm={24}>
          <Field
            disabled={isDisabled}
            name="payment_contact.address[0].address_type_code"
            label="Country"
            required
            validate={[required]}
            data={CONTACTS_COUNTRY_OPTIONS}
            component={RenderSelect}
          />
        </Col>
        <Col md={12} sm={24}>
          <Field
            disabled={isDisabled}
            name="payment_contact.address[0].sub_division_code"
            label="Province"
            required={!isMailingInternational}
            validate={!isMailingInternational ? [required] : []}
            data={provinceOptions.filter(
              (p) => p.subType === payment_contact?.address?.[0]?.address_type_code
            )}
            component={RenderSelect}
          />
        </Col>
      </Row>

      <Row gutter={16}>
        <Col md={12} sm={24}>
          <Field
            disabled={isDisabled}
            name="payment_contact.address[0].city"
            label="City"
            required
            validate={[required]}
            component={RenderField}
          />
        </Col>
        <Col md={12} sm={24}>
          <Field
            disabled={isDisabled}
            name="payment_contact.address[0].post_code"
            label="Postal Code"
            component={RenderField}
            required
            validate={[
              postalCodeWithCountry(payment_contact?.address?.[0]?.address_type_code),
              maxLength(10),
            ]}
          />
        </Col>
      </Row>
    </div>
  );
};
