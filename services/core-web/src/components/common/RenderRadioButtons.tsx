import React, { FC } from "react";
import { Form, Radio, Space } from "antd";
import { IRadioOption } from "@mds/common/interfaces";

/**
 * @class RenderRadioButtons - Ant Design `Radio` component used for boolean values in redux-form.
 */

const defaultProps = {
  disabled: false,
  customOptions: null,
};

interface RenderRadioButtonsProps {
  id: string | number;
  label: string;
  meta: any;
  disabled: boolean;
  input: any;
  isVertical?: boolean;
  customOptions: IRadioOption[];
}

const RenderRadioButtons: FC<RenderRadioButtonsProps> = (props) => {
  const { meta, label, disabled, input, id, customOptions, isVertical } = props;

  const options = customOptions ?? [
    { label: "Yes", value: true },
    { label: "No", value: false },
  ];

  const handleRadioChange = (e) => {
    input.onChange(e.target.value);
  };

  return (
    <Form.Item
      validateStatus={meta.touched ? (meta.error && "error") || (meta.warning && "warning") : ""}
      help={
        meta.touched &&
        ((meta.error && <span>{meta.error}</span>) || (meta.warning && <span>{meta.warning}</span>))
      }
      label={label}
    >
      <Radio.Group
        disabled={disabled}
        name={input.name}
        value={input.value}
        onChange={handleRadioChange}
        id={id as string}
      >
        <Space direction={isVertical ? "vertical" : "horizontal"}>
          {options.map((option) => {
            return (
              <Radio key={option.value} value={option.value}>
                {option.label}
              </Radio>
            );
          })}
        </Space>
      </Radio.Group>
    </Form.Item>
  );
};

RenderRadioButtons.defaultProps = defaultProps;

export default RenderRadioButtons;
