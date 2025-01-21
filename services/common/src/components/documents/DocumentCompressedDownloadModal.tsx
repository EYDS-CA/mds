import React, { FC } from "react";
import { Modal, Typography } from "antd";
import { CheckCircleOutlined } from "@ant-design/icons";
import { downloadFileFromDocumentManager } from "@mds/core-web/common/utils/actionlessNetworkCalls";
import { COLOR } from "@mds/common/constants/styles";

interface DocumentCompressedDownloadModalProps {
  isModalVisible: boolean;
  closeCompressNotification: () => void;
  documentManagerGuid: string;
  entityTitle: string;
}
export const DocumentCompressedDownloadModal: FC<DocumentCompressedDownloadModalProps> = (
  props
) => (
  <Modal
    title=""
    open={props.isModalVisible}
    onOk={() =>
      downloadFileFromDocumentManager({ document_manager_guid: props.documentManagerGuid })
    }
    onCancel={props.closeCompressNotification}
    okText="Download"
    cancelText="Cancel"
    width={500}
    bodyStyle={{ minHeight: "150px" }}
    style={{ padding: "40px" }}
    zIndex={1500}
  >
    <Typography.Paragraph strong>
      <CheckCircleOutlined style={{ color: COLOR.successGreen, fontSize: "20px", marginRight: "10px" }} />
      Files ready for download
    </Typography.Paragraph>
    <Typography.Paragraph style={{ fontSize: "90%", marginLeft: "30px" }}>
      {props.entityTitle} selected documents are ready for download.
    </Typography.Paragraph>
  </Modal>
);

export default DocumentCompressedDownloadModal;
