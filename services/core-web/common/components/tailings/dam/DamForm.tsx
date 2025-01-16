import {
  CONSEQUENCE_CLASSIFICATION_STATUS_CODE,
  DAM_OPERATING_STATUS,
  DAM_TYPES,
} from "@mds/common/constants/strings";
import { Col, Popconfirm, Row, Typography } from "antd";
import {
  decimalPlaces,
  lat,
  lon,
  maxDigits,
  maxLength,
  number,
  required,
  requiredList,
} from "@mds/common/redux/utils/Validate";
import { useHistory, useParams } from "react-router-dom";

import { Field } from "redux-form";
import React, { FC } from "react";
import { EDIT_TAILINGS_STORAGE_FACILITY } from "@/constants/routes";
import { renderConfig } from "@/components/common/config";
import { ITailingsStorageFacility, IDam } from "@mds/common";

interface DamFormProps {
  tsf: ITailingsStorageFacility;
  dam?: IDam;
  canEditTSF: boolean;
  isEditMode: boolean;
  canEditDam: boolean;
}

interface Params {
  tailingsStorageFacilityGuid: string;
  mineGuid: string;
}

const DamForm: FC<DamFormProps> = (props) => {
  const { tsf, dam, canEditTSF, isEditMode, canEditDam } = props;
  const history = useHistory();
  const { tailingsStorageFacilityGuid, mineGuid } = useParams<Params>();
  const canEditTSFAndEditMode = canEditTSF && canEditDam;
  const returnUrl = EDIT_TAILINGS_STORAGE_FACILITY.dynamicRoute(
    tailingsStorageFacilityGuid,
    mineGuid,
    "associated-dams",
    isEditMode
  );

  const handleBack = () => {
    history.push(returnUrl);
  };

  return (
    <div>
      <div className="margin-large--bottom">
        <Typography.Title level={4}>Associated Dams - {dam.dam_name}</Typography.Title>
        <Popconfirm
          title={`Are you sure you want to cancel ${
            tailingsStorageFacilityGuid ? "updating this" : "creating a new"
          } dam?
        All unsaved data on this page will be lost.`}
          cancelText="No"
          okText="Yes"
          placement="right"
          onConfirm={handleBack}
        >
          <Typography.Link className="associated-dams-link">
            Return to all Associated Dams of {tsf.mine_tailings_storage_facility_name}.
          </Typography.Link>
        </Popconfirm>
      </div>

      <Field
        id="dam_type"
        name="dam_type"
        label="Dam Type"
        component={renderConfig.SELECT}
        data={DAM_TYPES}
        required
        validate={[requiredList]}
        disabled={!canEditTSFAndEditMode}
      />
      <Field
        id="dam_name"
        name="dam_name"
        label="Dam Name"
        component={renderConfig.FIELD}
        required
        validate={[required, maxLength(60)]}
        disabled={!canEditTSFAndEditMode}
      />
      <Row gutter={16}>
        <Col span={12}>
          <Field
            id="latitude"
            name="latitude"
            label="Latitude"
            component={renderConfig.FIELD}
            required
            validate={[required, lat]}
            disabled={!canEditTSFAndEditMode}
          />
        </Col>
        <Col span={12}>
          <Field
            id="longitude"
            name="longitude"
            label="Longitude"
            component={renderConfig.FIELD}
            required
            validate={[required, lon]}
            disabled={!canEditTSFAndEditMode}
          />
        </Col>
      </Row>
      <Field
        id="operating_status"
        name="operating_status"
        label="Operating Status"
        component={renderConfig.SELECT}
        data={DAM_OPERATING_STATUS}
        required
        validate={[requiredList]}
        disabled={!canEditTSFAndEditMode}
      />
      <Field
        id="consequence_classification"
        name="consequence_classification"
        label="Dam Consequence Classification"
        component={renderConfig.SELECT}
        data={CONSEQUENCE_CLASSIFICATION_STATUS_CODE}
        required
        validate={[requiredList]}
        disabled={!canEditTSFAndEditMode}
      />
      <Field
        id="permitted_dam_crest_elevation"
        name="permitted_dam_crest_elevation"
        label="Permitted Dam Crest Elevation (meters above sea level)"
        component={renderConfig.FIELD}
        required
        validate={[required, decimalPlaces(2), number, maxDigits(10)]}
        disabled={!canEditTSFAndEditMode}
      />
      <Field
        id="current_dam_height"
        name="current_dam_height"
        label="Current Dam Height (downstream toe to crest in meters)"
        component={renderConfig.FIELD}
        required
        validate={[required, decimalPlaces(2), number, maxDigits(10)]}
        disabled={!canEditTSFAndEditMode}
      />
      <Field
        id="current_elevation"
        name="current_elevation"
        label="Current Elevation (elevation at the top of the dam in meters)"
        component={renderConfig.FIELD}
        required
        validate={[required, decimalPlaces(2), number, maxDigits(10)]}
        disabled={!canEditTSFAndEditMode}
      />
      <Field
        id="max_pond_elevation"
        name="max_pond_elevation"
        label="Maximum Pond Elevation (meters above sea level recorded in the previous 12 months)"
        component={renderConfig.FIELD}
        required
        validate={[required, decimalPlaces(2), number, maxDigits(10)]}
        disabled={!canEditTSFAndEditMode}
      />
      <Field
        id="min_freeboard_required"
        name="min_freeboard_required"
        label="Minimum Freeboard Required (water surface to the crest of the dam, in meters)"
        component={renderConfig.FIELD}
        required
        validate={[required, decimalPlaces(2), number, maxDigits(10)]}
        disabled={!canEditTSFAndEditMode}
      />
    </div>
  );
};

export default DamForm;
