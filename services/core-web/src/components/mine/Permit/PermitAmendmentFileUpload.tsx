import React, { FC } from "react";
import { Field } from "redux-form";
import { PERMITS } from "@mds/common/constants/API";
import FileUpload from "@/components/common/FileUpload";
import { DOCUMENT, EXCEL } from "@/constants/fileTypes";

interface PermitAmendmentFileUploadProps {
  onFileLoad: (arg1: string, arg2: string) => any;
  onRemoveFile: (arg1: any, arg2: any) => any;
  mineGuid: string;
  allowMultiple: boolean;
}

export const PermitAmendmentFileUpload: FC<PermitAmendmentFileUploadProps> = (props) => (
  <Field
    id="fileUpload"
    name="fileUpload"
    component={FileUpload}
    uploadUrl={`${PERMITS(props.mineGuid)}/amendments/documents`}
    acceptedFileTypesMap={{ ...DOCUMENT, ...EXCEL }}
    onFileLoad={props.onFileLoad}
    onRemoveFile={props.onRemoveFile}
    allowRevert
    allowMultiple={props.allowMultiple}
  />
);

export default PermitAmendmentFileUpload;
