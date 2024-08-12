import React, { FC, useState } from "react";
import { useDispatch } from "react-redux";
import { GenericDocTableProps } from "@mds/common/interfaces/document/documentTableProps.interface";
import CoreTable from "../../common/CoreTable";
import { uploadDateColumn, uploadedByColumn } from "../DocumentColumns";
import {
  ITableAction,
  renderActionsColumn,
  renderTaggedColumn,
} from "../../common/CoreTableCommonColumns";
import { openModal } from "@mds/common/redux/actions/modalActions";
import ViewSpatialDetailModal from "./ViewSpatialDetailModal";
import DocumentCompression from "../DocumentCompression";
import { MineDocument } from "@mds/common/models/documents/document";
import { spatialBundlesFromFiles } from "@mds/common/redux/slices/spatialDataSlice";
import { downloadFileFromDocumentManager } from "@mds/common/redux/utils/actionlessNetworkCalls";
import { ISpatialBundle } from "@mds/common/interfaces/document/spatialBundle.interface";
import { IMineDocument } from "@mds/common/interfaces";

interface SpatialDocumentTableProps extends GenericDocTableProps<ISpatialBundle> {
  documents: IMineDocument[];
  categoryText?: string; // if set, will display a category column with this text
}

const SpatialDocumentTable: FC<SpatialDocumentTableProps> = ({ documents, categoryText }) => {
  const dispatch = useDispatch();
  const [isCompressionModalVisible, setIsCompressionModalVisible] = useState(false);

  const mineDocuments = documents.map((doc) => new MineDocument(doc));
  const spatial_bundles = spatialBundlesFromFiles(documents);

  const downloadSpatialBundle = () => {
    setIsCompressionModalVisible(true);
  };

  const viewSpatialBundle = (_, record) => {
    dispatch(
      openModal({
        props: {
          title: "View Spatial Data",
          spatialDocuments: record.bundleFiles,
        },
        content: ViewSpatialDetailModal,
      })
    );
  };
  const recordActionsFilter = (record, allActions) => {
    if (record.isParent) {
      return record.isSingleFile
        ? allActions.filter((a) => a.key !== "download-all")
        : allActions.filter((a) => a.key !== "download");
    }
    return [];
  };

  const actions: ITableAction[] = [
    {
      key: "download",
      label: "Download",
      clickFunction: (_, record) => downloadFileFromDocumentManager(record),
    },
    { key: "download-all", label: "Download All", clickFunction: downloadSpatialBundle },
    { key: "view-detail", label: "View Details", clickFunction: viewSpatialBundle },
  ];

  const categoryColumn = categoryText
    ? [
        {
          key: "category",
          title: "Category",
          render: () => <div title="Category">{categoryText}</div>,
        },
      ]
    : [];

  const columns = [
    renderTaggedColumn("document_name", "bundleSize", "File Name"),
    ...categoryColumn,
    uploadDateColumn("upload_date", "Last Modified"),
    uploadedByColumn("create_user", "Created By"),
    renderActionsColumn({ actions, recordActionsFilter }),
  ];

  return (
    <>
      <DocumentCompression
        mineDocuments={mineDocuments}
        setCompressionModalVisible={setIsCompressionModalVisible}
        isCompressionModalVisible={isCompressionModalVisible}
        showDownloadWarning={false}
      />
      <CoreTable
        dataSource={spatial_bundles}
        columns={columns}
        expandProps={{
          getDataSource: (record) => record.bundleFiles,
          recordDescription: "file information",
          childrenColumnName: "bundleFiles",
          matchChildColumnsToParent: true,
          rowExpandable: (record) => !record.isSingleFile && record.isParent,
        }}
      />
    </>
  );
};

export default SpatialDocumentTable;
