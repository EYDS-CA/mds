import React, { FC, useEffect, useMemo, useState } from "react";
import { useHistory, useParams } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { Alert, Button, Col, Collapse, Row, Skeleton, Space, Typography } from "antd";
import FileOutlined from "@ant-design/icons/FileOutlined";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowsFromLine,
  faArrowsToLine,
  faBan,
  faBarsStaggered,
  faCheckCircle,
  faClock
} from "@fortawesome/pro-light-svg-icons";
import { getPermitConditionCategoryOptions } from "@mds/common/redux/selectors/staticContentSelectors";
import PermitConditionLayer from "./PermitConditionLayer";
import {
  getConditionsWithRequirements,
  IMineReportPermitRequirement,
  IPermitAmendment,
  IPermitCondition,
  IPermitConditionCategory,
} from "@mds/common/interfaces/permits";
import { VIEW_MINE_PERMIT_AMENDMENT } from "@/constants/routes";
import ScrollSidePageWrapper from "@mds/common/components/common/ScrollSidePageWrapper";
import { useFeatureFlag } from "@mds/common/providers/featureFlags/useFeatureFlag";
import { Feature } from "@mds/common/utils/featureFlag";
import CoreButton from "@mds/common/components/common/CoreButton";
import {
  getPermitExtractionByGuid,
  PermitExtractionStatus,
} from "@mds/common/redux/slices/permitServiceSlice";
import {
  RenderExtractionError,
  RenderExtractionProgress,
  RenderExtractionStart,
} from "./PermitConditionExtraction";
import { getMineReportPermitRequirements } from "@mds/common/redux/selectors/permitSelectors";
import ReportPermitRequirementForm from "@/components/Forms/reports/ReportPermitRequirementForm";
import PermitConditionCategoryEditModal from "./PermitConditionCategoryEditModal";
import { closeModal, openModal } from "@mds/common/redux/actions/modalActions";
import { uniqBy } from "lodash";
import {
  createPermitAmendmentConditionCategory,
  deletePermitAmendmentConditionCategory,
  fetchPermits,
  updatePermitAmendmentConditionCategory,
  updatePermitCondition,
} from "@mds/common/redux/actionCreators/permitActionCreator";
import { EditPermitConditionCategoryInline } from "./PermitConditionCategory";
import { searchConditionCategories } from "@mds/common/redux/slices/permitConditionCategorySlice";
import { PreviewPermitAmendmentDocument } from "./PreviewPermitAmendmentDocument";
import { formatPermitConditionStep } from "@mds/common/utils/helpers";
import SubConditionForm from "./SubConditionForm";
import { getIsFetching } from "@mds/common/redux/reducers/networkReducer";
import { NetworkReducerTypes } from "@mds/common/constants/networkReducerTypes";
import PermitConditionReviewAssignment from "@/components/mine/Permit/PermitConditionReviewAssignment";
import { getUser } from "@mds/common/redux/slices/userSlice";
import { createDropDownList } from "@common/utils/helpers";
import { PERMIT_CONDITION_STATUS_CODE } from "@mds/common/constants/enums";
import { PermitReviewBanner } from "./PermitReviewBanner";
import { COLOR } from "@/constants/styles";
import { PermitConditionsProvider } from "./PermitConditionsContext";
import PermitConditionReportRequirements from "./PermitConditionReportRequirements";
import { useAppDispatch } from "@mds/common/redux/rootState";

const { Title } = Typography;

interface PermitConditionProps {
  latestAmendment: IPermitAmendment;
  previousAmendment: IPermitAmendment;
  isReviewComplete: boolean;
  isExtracted: boolean;
  currentAmendment: IPermitAmendment;
  canStartExtraction: boolean;
  userCanEdit: boolean;
}

const PermitConditions: FC<PermitConditionProps> = ({
  isReviewComplete,
  isExtracted,
  latestAmendment,
  currentAmendment,
  previousAmendment,
  canStartExtraction,
  userCanEdit,
}) => {
  const { isFeatureEnabled } = useFeatureFlag();
  const dispatch = useAppDispatch();
  const user = useSelector(getUser);
  const history = useHistory();

  const userIsAssigned = (category?: IPermitConditionCategory): boolean => {
    return user?.sub && (user.sub === category?.assigned_review_user?.sub);
  };


  const canEditPermitConditions = (category: IPermitConditionCategory): boolean =>
    isFeatureEnabled(Feature.MODIFY_PERMIT_CONDITIONS) && userCanEdit && userIsAssigned(category);

  const { id: mineGuid, permitGuid } = useParams<{
    id: string;
    permitGuid: string;
    mineGuid: string;
  }>();
  const pdfSplitViewEnabled = isFeatureEnabled(Feature.PERMIT_CONDITIONS_PDF_SPLIT_VIEW);
  const [isExpanded, setIsExpanded] = useState(false);
  const [viewPdf, setViewPdf] = useState(false);
  const [selectedCondition, setSelectedCondition] = useState<IPermitCondition | null>(null);
  const [editingConditionGuid, setEditingConditionGuid] = useState<string>();
  const [addingToCategoryCode, setAddingToCategoryCode] = useState<string>();

  const mineReportPermitRequirements: IMineReportPermitRequirement[] = useSelector(
    getMineReportPermitRequirements(permitGuid)
  );

  console.log('CurrentAmendment', currentAmendment?.permit_amendment_guid);

  const isLoading = useSelector(getIsFetching(NetworkReducerTypes.GET_PERMITS));

  const permitConditions = currentAmendment?.conditions;
  const permitExtraction = useSelector(
    getPermitExtractionByGuid(currentAmendment?.permit_amendment_id)
  );

  const refreshData = async () => {
    await dispatch(fetchPermits(mineGuid));
  };

  useEffect(() => {
    dispatch(searchConditionCategories({}));
  }, []);

  const defaultPermitConditionCategories = useSelector(getPermitConditionCategoryOptions);
  const condWithoutConditionsText = defaultPermitConditionCategories?.map((cat) => {
    return {
      ...cat,
      description: cat.description.replace("Conditions", "").trim(),
    };
  });

  const isExtractionInProgress =
    permitExtraction?.task_status === PermitExtractionStatus.in_progress;
  const isExtractionComplete = permitExtraction?.task_status === PermitExtractionStatus.complete;

  const permitConditionCategoryOptions: IPermitConditionCategory[] = uniqBy(
    currentAmendment?.condition_categories.concat(condWithoutConditionsText) ?? [],
    "condition_category_code"
  );

  const PERMIT_CONDITION_STATUS = {
    complete: { icon: faCheckCircle, color: "color-success", text: "Complete" },
    in_progress: { icon: faClock, color: "color-primary", text: "In Progress" },
    not_started: { icon: faBan, color: "color-gov-grey", text: "Not Started" }
  }

  const getPermitConditionCategories = (categories, conditions) => {
    return categories
      .map((cat) => {
        const catConditions =
          conditions?.filter((c) => c.condition_category_code === cat.condition_category_code) ??
          [];

        const isDefaultConditionCategory = !!condWithoutConditionsText?.find(
          (x) => x.condition_category_code === cat.condition_category_code
        );
        if (!catConditions.length && isDefaultConditionCategory) {
          return null;
        }

        // Recursive function to get the full path of steps
        const getStepPath = (condition, parentPath = ""): IPermitCondition => {
          const formattedStep = formatPermitConditionStep(condition.step);

          const currentPath = parentPath
            ? `${parentPath}${formattedStep}`
            : `${cat.description} - ${formattedStep}`;
          const stepPath = currentPath.replace(/\.+$/, "");

          const mineReportPermitRequirement = mineReportPermitRequirements.find(
            (requirement) => requirement.permit_condition_id === condition.permit_condition_id
          );

          // If condition has sub-conditions, recursively add step paths
          const sub_conditions =
            condition.sub_conditions?.map((subCondition) =>
              getStepPath(subCondition, currentPath)
            ) ?? [];

          return {
            ...condition,
            formattedStep,
            stepPath,
            mineReportPermitRequirement,
            sub_conditions,
          };
        };

        // Initialize the step paths for all top-level conditions
        const formattedConditions = catConditions.map((condition) => getStepPath(condition));

        const category = {
          href: cat.condition_category_code.toLowerCase().replace("-", ""),
          titleText: cat.description,
          conditions: formattedConditions || [],
          condition_category_code: cat.condition_category_code,
          condition_category: cat,
        };
        const categoryTitle = `${formatPermitConditionStep(cat.step)} ${cat.description}`;
        if (isReviewComplete) {
          return {
            ...category,
            title: (
              <Typography.Text style={{ fontSize: "16px", fontWeight: "600" }}>
                {categoryTitle}
              </Typography.Text>
            ),
          };
        }
        //Set the text and icon based on the Status of all the top level conditions
        const statuses = catConditions.map(con => con.permit_condition_status_code);
        const allComplete = statuses.every(s => s === PERMIT_CONDITION_STATUS_CODE.COM);
        const someComplete = statuses.some(s => s === PERMIT_CONDITION_STATUS_CODE.COM);

        let status = PERMIT_CONDITION_STATUS.not_started;

        if (allComplete) {
          status = PERMIT_CONDITION_STATUS.complete;
        } else if (someComplete) {
          status = PERMIT_CONDITION_STATUS.in_progress;
        }

        return {
          ...category,
          icon: <FontAwesomeIcon icon={status.icon} className={status.color} style={{ fontSize: "20px" }} />,
          title: (
            <Typography.Text style={{ fontSize: "16px", fontWeight: "600" }}>
              {categoryTitle}
            </Typography.Text>
          ),
          description: (
            <Space direction="vertical">
              <Typography.Text>{status.text}</Typography.Text>
              <Typography.Text className="faded-text">{cat.assigned_review_user?.display_name ? "Assigned to " + cat.assigned_review_user.display_name : "Not Assigned"}</Typography.Text>
            </Space>
          ),
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.condition_category.display_order - b.condition_category.display_order);
  };
  const permitConditionCategories = useMemo(
    () => getPermitConditionCategories(permitConditionCategoryOptions, permitConditions),
    [permitConditionCategoryOptions, permitConditions]
  );

  const scrollSideMenuProps = {
    menuOptions: permitConditionCategories,
    featureUrlRoute: VIEW_MINE_PERMIT_AMENDMENT.hashRoute,
    featureUrlRouteArguments: [mineGuid, permitGuid, currentAmendment?.permit_amendment_guid, "conditions"],
  };

  const customCategories = createDropDownList(
    currentAmendment?.condition_categories ?? [],
    "description",
    "condition_category_code"
  );

  const standardCategories = createDropDownList(
    condWithoutConditionsText,
    "description",
    "condition_category_code"
  );

  const dropdownCategories = [{
    groupName: "Custom Categories",
    opt: customCategories
  }, {
    groupName: "Standard Categories",
    opt: standardCategories
  }]

  const bannerHeight = 30;
  const topOffset = 99 + 45 + bannerHeight; // header + tab nav

  const handleAddCondition = async () => {
    setAddingToCategoryCode(null);
    await refreshData();
  };

  const handleEditReportRequirement = (values) => {
    console.log("not implemented", values);
  };

  const toggleViewPdf = () => {
    setViewPdf(!viewPdf);
  };

  const openCreateCategoryModal = (event) => {
    event.preventDefault();
    dispatch(
      openModal({
        props: {
          title: `Add Condition Category`,
          handleSubmit: async (category) => {
            await dispatch(
              createPermitAmendmentConditionCategory(
                mineGuid,
                permitGuid,
                currentAmendment.permit_amendment_guid,
                {
                  ...category,
                  display_order: permitConditionCategories.length,
                }
              )
            );

            dispatch(closeModal());
          },
        },
        content: PermitConditionCategoryEditModal,
      })
    );
  };

  const handleUpdateConditionCategory = (category: IPermitConditionCategory) => {
    dispatch(
      updatePermitAmendmentConditionCategory(
        mineGuid,
        permitGuid,
        currentAmendment.permit_amendment_guid,
        category
      )
    );
  };

  const handleDeleteConditionCategory = (category: IPermitConditionCategory) => {
    dispatch(
      deletePermitAmendmentConditionCategory(
        mineGuid,
        permitGuid,
        currentAmendment.permit_amendment_guid,
        category.condition_category_code
      )
    );
  };

  const handleMove = (category: IPermitConditionCategory, newOrder: number) => {
    const updatedCat = {
      ...category,
      display_order: newOrder,
    };

    dispatch(
      updatePermitAmendmentConditionCategory(
        mineGuid,
        permitGuid,
        currentAmendment.permit_amendment_guid,
        updatedCat
      )
    );
  };

  const handleMoveCondition = async (condition: IPermitCondition, isMoveUp: boolean) => {
    const newOrder = isMoveUp ? condition.display_order - 1 : condition.display_order + 1;
    const updatedCond = {
      ...condition,
      display_order: newOrder,
    };

    await dispatch(
      updatePermitCondition(
        condition.permit_condition_guid,
        currentAmendment.permit_amendment_guid,
        updatedCond
      )
    );
    await refreshData();
  };
  const viewPermitAmendment = (e) => {
    e.preventDefault();
    history.push(VIEW_MINE_PERMIT_AMENDMENT.dynamicRoute(mineGuid, permitGuid, latestAmendment?.permit_amendment_guid, "conditions"));
  }


  const LatestAmendmentWarning: FC = () => {
    return latestAmendment?.permit_amendment_guid !== currentAmendment?.permit_amendment_guid ? (
      <Col span={24}>
        {!latestAmendment?.conditions?.length ? <Alert
          message="Extract and review the latest permit amendment"
          description="The current permit conditions reflect the last permit reviewed and verified. Minespace users are seeing the last reviewed version. Conditions not amended will remain unchanged."
          type="warning"
          action={
            <Button onClick={viewPermitAmendment}>
              Extract Permit Conditions
            </Button>
          }
          showIcon /> :
          <Alert
            message="Review and update the latest permit amendment conditions"
            description="MineSpace users will continue to see the last reviewed and verified permit conditions until the new amendment completes review."
            type="warning"
            action={
              <Button onClick={viewPermitAmendment}>
                Review Permit Conditions
              </Button>
            }
            showIcon />
        }
      </Col>) : <></>;

  }

  const isViewingLatestAmendment = latestAmendment?.permit_amendment_guid === currentAmendment?.permit_amendment_guid;

  if (isViewingLatestAmendment && isExtractionInProgress) {
    return <><LatestAmendmentWarning /><RenderExtractionProgress /></>;
  }
  if (isViewingLatestAmendment && !isExtractionComplete && permitExtraction?.task_status === "Error Extracting") {
    return <><LatestAmendmentWarning /><RenderExtractionError /></>;
  }
  if (isViewingLatestAmendment && canStartExtraction) {
    return <><LatestAmendmentWarning /><RenderExtractionStart /></>;
  }

  const showLoading = !currentAmendment || isLoading;



  const AddConditionModalContent = (
    <Typography.Paragraph
      className="no_link_styling grey"
      style={{ fontSize: "14px", textAlign: "center" }}
    >
      {showLoading ? (
        <Skeleton active paragraph={{ rows: 1 }} />
      ) : (
        <Typography.Link onClick={openCreateCategoryModal} className="fade-in" title="Add Condition Category">
          + Add Condition Category
        </Typography.Link>
      )}
    </Typography.Paragraph>
  );

  const canViewPdfSplitScreen =
    viewPdf && pdfSplitViewEnabled && permitExtraction?.permit_amendment_document_guid;
  const hasConditions = latestAmendment?.conditions?.length > 0;
  return (<>
    {hasConditions && <PermitReviewBanner isExtracted={isExtracted} height={bannerHeight} isReviewComplete={isReviewComplete} />}
    <PermitConditionsProvider value={{ mineGuid, permitGuid, latestAmendment, previousAmendment }}>
      <Row>
        <Col span={canViewPdfSplitScreen ? 16 : 24}>
          <ScrollSidePageWrapper
            header={null}
            headerHeight={topOffset}
            menuProps={scrollSideMenuProps}
            extraItems={userCanEdit && isExtracted ? AddConditionModalContent : null}
            view={isReviewComplete ? "anchor" : "steps"}
            content={
              <Row align="middle" justify="space-between" gutter={[10, 16]}>
                <LatestAmendmentWarning />
                <Col span={24}>
                  <Title className="margin-none" level={2}>
                    Permit Conditions
                  </Title>
                </Col>

                <Col>
                  <Row gutter={10}>
                    <Col>
                      <CoreButton
                        disabled={showLoading}
                        type="tertiary"
                        className="fa-icon-container"
                        icon={
                          <FontAwesomeIcon icon={isExpanded ? faArrowsToLine : faArrowsFromLine} />
                        }
                        onClick={() => setIsExpanded(!isExpanded)}
                      >
                        {isExpanded ? "Collapse" : "Expand"} All Conditions
                      </CoreButton>
                    </Col>
                    <Col>
                      <CoreButton
                        type="tertiary"
                        icon={<FileOutlined />}
                        disabled={showLoading}
                        onClick={toggleViewPdf}
                      >
                        Open Permit in Document Viewer
                      </CoreButton>
                    </Col>
                  </Row>
                </Col>

                <Col>
                  <CoreButton
                    type="tertiary"
                    className="fa-icon-container"
                    disabled={showLoading}
                    icon={<FontAwesomeIcon icon={faBarsStaggered} />}
                  >
                    Reorder
                  </CoreButton>
                </Col>
                <Col span={24}>
                  <div className="core-page-content">
                    <Row gutter={[16, 16]}>
                      {showLoading && <Skeleton active paragraph={{ rows: 10 }} />}

                      {permitConditionCategories.map((category, idx) => {
                        const conditionsWithRequirements: IPermitCondition[] =
                          getConditionsWithRequirements(category.conditions);
                        return (
                          <React.Fragment key={category.href}>
                            <Col span={24}>
                              <Row justify="space-between">
                                <Title level={3} className="margin-none" id={category.href}>
                                  <EditPermitConditionCategoryInline
                                    canEdit={isExtracted && canEditPermitConditions(category.condition_category)}
                                    onDelete={handleDeleteConditionCategory}
                                    onChange={handleUpdateConditionCategory}
                                    moveUp={(cat) => handleMove(cat, idx - 1)}
                                    moveDown={(cat) => handleMove(cat, idx + 1)}
                                    currentPosition={idx}
                                    categoryCount={permitConditionCategories.length}
                                    category={category.condition_category}
                                    conditionCount={category?.conditions.length || 0}
                                  />
                                </Title>
                                {canEditPermitConditions(category.condition_category) && isExtracted && (
                                  <CoreButton
                                    type="primary"
                                    disabled={
                                      Boolean(addingToCategoryCode) || Boolean(editingConditionGuid)
                                    }
                                    onClick={() =>
                                      setAddingToCategoryCode(category.condition_category_code)
                                    }
                                  >
                                    Add Condition
                                  </CoreButton>
                                )}
                              </Row>
                              {isFeatureEnabled(Feature.MODIFY_PERMIT_CONDITIONS) && userCanEdit && (
                                <PermitConditionReviewAssignment
                                  category={category?.condition_category}
                                  refreshData={refreshData}
                                />
                              )}
                            </Col>
                            {category.conditions.map((sc, idx) => (
                              <Col span={24} key={sc.permit_condition_id} className="fade-in">
                                <PermitConditionLayer
                                  previousAmendment={previousAmendment}
                                  isExtracted={isExtracted}
                                  permitAmendmentGuid={currentAmendment?.permit_amendment_guid}
                                  condition={sc}
                                  isExpanded={isExpanded}
                                  handleMoveCondition={handleMoveCondition}
                                  currentPosition={idx}
                                  conditionCount={category.conditions.length}
                                  canEditPermitConditions={canEditPermitConditions(category.condition_category)}
                                  setEditingConditionGuid={setEditingConditionGuid}
                                  editingConditionGuid={editingConditionGuid ?? addingToCategoryCode}
                                  refreshData={refreshData}
                                  conditionSelected={setSelectedCondition}
                                  categoryOptions={dropdownCategories}
                                  mineGuid={mineGuid}
                                  permitAmendment={latestAmendment}
                                />
                              </Col>
                            ))}
                            {addingToCategoryCode === category.condition_category_code && (
                              <Col span={24}>
                                <SubConditionForm
                                  conditionCategory={category}
                                  permitAmendmentGuid={currentAmendment.permit_amendment_guid}
                                  handleCancel={() => setAddingToCategoryCode(null)}
                                  onSubmit={handleAddCondition}
                                  categoryOptions={dropdownCategories}
                                /></Col>)}
                            {conditionsWithRequirements?.length > 0 && (
                              <div className="report-collapse-container ">
                                <Title level={4} className="primary-colour">
                                  Report Requirements
                                </Title>
                                <PermitConditionReportRequirements
                                  conditionsWithRequirements={conditionsWithRequirements}
                                  handleEditReportRequirement={handleEditReportRequirement}
                                  permitGuid={permitGuid}
                                />
                              </div>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </Row>
                  </div>
                </Col>
              </Row>
            }
          ></ScrollSidePageWrapper>
        </Col >
        {
          canViewPdfSplitScreen ? (
            <Col style={{ padding: "16px", height: "inherit" }} span={8} >
              <div style={{ position: "sticky", top: "225px" }}>
                <PreviewPermitAmendmentDocument
                  amendment={currentAmendment}
                  documentGuid={permitExtraction.permit_amendment_document_guid}
                  selectedCondition={selectedCondition}
                />
              </div>
            </Col >
          ) : (
            ""
          )}
      </Row >
    </PermitConditionsProvider >
  </>
  );
};

export default PermitConditions;
