import React, { FC, useEffect, useState } from "react";
import { withRouter, Link, Prompt, useParams, useHistory, useLocation } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { reset, getFormValues, isDirty } from "redux-form";
import * as routes from "@/constants/routes";
import { Button, Col, Row, Tag } from "antd";
import EnvironmentOutlined from "@ant-design/icons/EnvironmentOutlined";
import ArrowLeftOutlined from "@ant-design/icons/ArrowLeftOutlined";

import {
  getFormattedProjectSummary,
  getProject,
} from "@mds/common/redux/selectors/projectSelectors";
import {
  FORM,
  Feature,
  PROJECT_SUMMARY_WITH_AMS_SUBMISSION_SECTION,
  AMS_STATUS_CODES_SUCCESS,
  AMS_STATUS_CODE_FAIL,
  AMS_ENVIRONMENTAL_MANAGEMENT_ACT_TYPES,
  SystemFlagEnum,
} from "@mds/common";
import { getMineById } from "@mds/common/redux/reducers/mineReducer";
import withFeatureFlag from "@mds/common/providers/featureFlags/withFeatureFlag";
import {
  createProjectSummary,
  fetchProjectById,
  updateProject,
  updateProjectSummary,
} from "@mds/common/redux/actionCreators/projectActionCreator";
import { fetchMineRecordById } from "@mds/common/redux/actionCreators/mineActionCreator";
import Loading from "@/components/common/Loading";
import { useFeatureFlag } from "@mds/common/providers/featureFlags/useFeatureFlag";
import LoadingWrapper from "@/components/common/wrappers/LoadingWrapper";
import ProjectSummaryForm, {
  getProjectFormTabs,
} from "@mds/common/components/projectSummary/ProjectSummaryForm";
import { fetchRegions } from "@mds/common/redux/slices/regionsSlice";
import { clearProjectSummary } from "@mds/common/redux/actions/projectActions";
import { getSystemFlag } from "@mds/common/redux/selectors/authenticationSelectors";
import { cancelConfirmWrapper } from "@mds/common/components/forms/RenderCancelButton";

export const ProjectSummary: FC = () => {
  const dispatch = useDispatch();
  const history = useHistory();
  const { pathname } = useLocation();
  const { mineGuid, projectSummaryGuid, projectGuid, tab, mode } = useParams<{
    mineGuid: string;
    projectSummaryGuid: string;
    projectGuid: string;
    tab: string;
    mode: string;
  }>();

  const systemFlag = useSelector(getSystemFlag);
  const isCore = systemFlag === SystemFlagEnum.core;

  const mine = useSelector((state) => getMineById(state, mineGuid));
  const formattedProjectSummary = useSelector(getFormattedProjectSummary);
  const project = useSelector(getProject);
  const anyTouched = useSelector(
    (state) => state.form[FORM.ADD_EDIT_PROJECT_SUMMARY]?.anyTouched || false
  );
  const isFormDirty = useSelector(isDirty(FORM.ADD_EDIT_PROJECT_SUMMARY));

  const { isFeatureEnabled } = useFeatureFlag();
  const amsFeatureEnabled = isFeatureEnabled(Feature.AMS_AGENT);
  const projectFormTabs = getProjectFormTabs(
    amsFeatureEnabled,
    true,
    isFeatureEnabled(Feature.MAJOR_PROJECT_REFACTOR)
  );

  const isExistingProject = Boolean(projectGuid && projectSummaryGuid);
  const isDefaultLoaded = isExistingProject
    ? formattedProjectSummary?.project_summary_guid === projectSummaryGuid &&
    formattedProjectSummary?.project_guid === projectGuid
    : mine?.mine_guid === mineGuid;
  const isDefaultEditMode = !isExistingProject || mode === "edit";

  const [isLoaded, setIsLoaded] = useState(isDefaultLoaded);
  // isNewProject on CORE and isEditMode on MS are inverses of each other
  const [isNewProject, setIsNewProject] = useState(isDefaultEditMode);
  // this isEditMode doesn't mean new/edit, it's edit/view
  const [isEditMode, setIsEditMode] = useState(isDefaultEditMode);
  const activeTab = tab ?? projectFormTabs[0];
  const mineName = mine?.mine_name ?? formattedProjectSummary?.mine_name ?? "";
  const formValues = useSelector(getFormValues(FORM.ADD_EDIT_PROJECT_SUMMARY));

  const handleFetchData = async () => {
    setIsLoaded(false);
    if (projectGuid && projectSummaryGuid) {
      setIsNewProject(false);
      await dispatch(fetchRegions(undefined));
      await dispatch(fetchProjectById(projectGuid));
    } else {
      await dispatch(fetchMineRecordById(mineGuid));
    }
  };

  useEffect(() => {
    handleFetchData().then(() => setIsLoaded(true));
    return () => {
      dispatch(clearProjectSummary());
    };
  }, []);

  const removeUploadedDocument = (payload, docs) => {
    if (Array.isArray(payload.documents)) {
      const uploadedGUIDs = new Set(docs.map((doc) => doc.document_manager_guid));
      payload.documents = payload.documents.filter(
        (doc) => !uploadedGUIDs.has(doc.document_manager_guid)
      );
    }
    return payload;
  };

  const handleCreateProjectSummary = async (values, message) => {
    return dispatch(
      createProjectSummary(
        {
          mineGuid,
        },
        values,
        message
      )
    ).then(({ data: { project_guid, project_summary_guid } }) => {
      history.replace(
        routes.EDIT_PROJECT_SUMMARY.dynamicRoute(
          project_guid,
          project_summary_guid,
          projectFormTabs[1],
          false
        )
      );
    });
  };

  const handleUpdateProjectSummary = async (payload, message) => {
    setIsLoaded(false);
    const projectSummaryResponse = await dispatch(
      updateProjectSummary(
        {
          projectGuid,
          projectSummaryGuid,
        },
        payload,
        message
      )
    );

    await dispatch(
      updateProject(
        { projectGuid },
        {
          mrc_review_required: payload.mrc_review_required,
          contacts: payload.contacts,
          project_lead_party_guid: payload.project_lead_party_guid,
        },
        "Successfully updated project.",
        false
      )
    );

    await handleFetchData();
    if (
      tab === PROJECT_SUMMARY_WITH_AMS_SUBMISSION_SECTION &&
      amsFeatureEnabled &&
      projectSummaryResponse
    ) {
      const { data } = projectSummaryResponse;
      const authorizations = data?.authorizations ?? [];
      const areAuthorizationsSuccessful = authorizations
        .filter((authorization) =>
          Object.values(AMS_ENVIRONMENTAL_MANAGEMENT_ACT_TYPES).includes(
            authorization.project_summary_authorization_type
          )
        )
        .every((auth) => auth.ams_status_code === "200");

      history.push(
        routes.VIEW_PROJECT_SUBMISSION_STATUS_PAGE.dynamicRoute(
          projectGuid,
          areAuthorizationsSuccessful ? AMS_STATUS_CODES_SUCCESS : AMS_STATUS_CODE_FAIL
        )
      );
    }
  };

  const handleTabChange = (newTab: string) => {
    if (!newTab) {
      return;
    }
    const url = !isNewProject
      ? routes.EDIT_PROJECT_SUMMARY.dynamicRoute(
        projectGuid,
        projectSummaryGuid,
        newTab,
        !isEditMode
      )
      : routes.ADD_PROJECT_SUMMARY.dynamicRoute(mineGuid, newTab);
    history.push(url);
  };

  const handleSaveData = async (formValues, newActiveTab?: string) => {
    let message = newActiveTab
      ? "Successfully updated the project description."
      : "Successfully submitted a project description to the Province of British Columbia.";

    let status_code = formattedProjectSummary.status_code;
    let is_historic = formattedProjectSummary.is_historic;

    if (!status_code || isNewProject) {
      status_code = "DFT";
    } else if (!newActiveTab) {
      if (isCore) {
        status_code = formValues.status_code;
      } else {
        status_code = "SUB";
      }
      is_historic = false;
      if (amsFeatureEnabled) {
        message = null;
      }
    }

    if (isCore && !isNewProject) {
      status_code = formValues.status_code;
    }

    const values = { ...formValues, status_code };

    try {
      if (isNewProject) {
        await handleCreateProjectSummary(values, message);
      }
      if (projectGuid && projectSummaryGuid) {
        await handleUpdateProjectSummary({ ...values, is_historic }, message);
        handleTabChange(newActiveTab);
        setIsLoaded(true);
      }
    } catch (err) {
      console.log(err);
      setIsLoaded(true);
    }
  };

  if (!isLoaded) {
    return <Loading />;
  }

  const initialValues = isNewProject
    ? {}
    : { ...formattedProjectSummary, mrc_review_required: project.mrc_review_required };

  const handleCancel = () => {
    cancelConfirmWrapper(async () => {
      await dispatch(reset(FORM.ADD_EDIT_PROJECT_SUMMARY))
      setIsEditMode(false);
    }, isFormDirty);
  }

  return (
    <>
      <Prompt
        when={anyTouched && isEditMode}
        message={(location, action) => {
          if (action === "REPLACE") {
            dispatch(reset(FORM.ADD_EDIT_PROJECT_SUMMARY));
          }
          return pathname !== location.pathname &&
            !location.pathname.includes("project-description") &&
            anyTouched
            ? "You have unsaved changes. Are you sure you want to leave without saving?"
            : true;
        }}
      />
      <div className="page">
        <Row
          className=" padding-lg view--header fixed-scroll"
          justify="space-between"
          align="middle"
        >
          <Col>
            <h1>
              {!isNewProject
                ? formattedProjectSummary.project_summary_title
                : "New Project Description"}
              <span className="padding-sm--left">
                <Tag title={`Mine: ${mineName}`}>
                  <Link
                    style={{ textDecoration: "none" }}
                    to={routes.MINE_GENERAL.dynamicRoute(mineGuid)}
                  >
                    <EnvironmentOutlined className="padding-sm--right" />
                    {mineName}
                  </Link>
                </Tag>
              </span>
            </h1>
            <Link
              data-cy="back-to-project-link"
              to={
                formattedProjectSummary.project_guid && !isNewProject
                  ? routes.EDIT_PROJECT.dynamicRoute(formattedProjectSummary.project_guid)
                  : routes.MINE_PRE_APPLICATIONS.dynamicRoute(mineGuid)
              }
            >
              <ArrowLeftOutlined className="padding-sm--right" />
              Back to: {mineName} Project overview
            </Link>
          </Col>
          <Col>
            <Button
              disabled={formValues?.status_code === "WDN" || formValues?.status_code === "COM"}
              type="primary"
              onClick={isEditMode ? handleCancel : () => setIsEditMode(true)}
            >
              {isEditMode ? "Cancel" : "Edit Project Description"}
            </Button>
          </Col>
        </Row>
        <div className="top-125">
          <LoadingWrapper condition={isLoaded}>
            <ProjectSummaryForm
              initialValues={initialValues}
              isEditMode={isEditMode}
              handleSaveData={handleSaveData}
              handleTabChange={handleTabChange}
              activeTab={activeTab}
            />
          </LoadingWrapper>
        </div>
      </div>
    </>
  );
};

export default withRouter(withFeatureFlag(ProjectSummary));
