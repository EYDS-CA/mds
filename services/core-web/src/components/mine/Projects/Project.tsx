import React, { FC, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Tabs, Tag } from "antd";
import { getProject } from "@mds/common/redux/selectors/projectSelectors";
import { fetchProjectById } from "@mds/common/redux/actionCreators/projectActionCreator";
import { Link, useHistory, useParams } from "react-router-dom";
import { ArrowLeftOutlined, EnvironmentOutlined } from "@ant-design/icons";
import { Feature } from "@mds/common";
import * as routes from "@/constants/routes";
import LoadingWrapper from "@/components/common/wrappers/LoadingWrapper";
import ProjectOverviewTab from "@/components/mine/Projects/ProjectOverviewTab";
import InformationRequirementsTableTab from "@/components/mine/Projects/InformationRequirementsTableTab";
import MajorMineApplicationTab from "@/components/mine/Projects/MajorMineApplicationTab";
import NullScreen from "@/components/common/NullScreen";
import DecisionPackageTab from "@/components/mine/Projects/DecisionPackageTab";
import ProjectDescriptionTab from "@mds/common/components/project/ProjectDescriptionTab";
import { useFeatureFlag } from "@mds/common/providers/featureFlags/useFeatureFlag";
import ScrollSidePageWrapper from "@mds/common/components/common/ScrollSidePageWrapper";
import ProjectDocumentsTab from "@mds/common/components/projects/ProjectDocumentsTab";

const Project: FC = () => {
  const { tab, projectGuid } = useParams<{ tab: string; projectGuid: string }>();
  const dispatch = useDispatch();
  const project = useSelector(getProject);
  const history = useHistory();
  const { isFeatureEnabled } = useFeatureFlag();

  const [isLoaded, setIsLoaded] = useState(projectGuid && project?.project_guid === projectGuid);
  const [isValid, setIsValid] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  const { information_requirements_table, major_mine_application } = project;

  const hasInformationRequirementsTable = Boolean(information_requirements_table?.irt_guid);
  const hasFinalAplication = Boolean(major_mine_application?.major_mine_application_guid);

  const handleFetchData = () => {
    if (projectGuid) {
      dispatch(fetchProjectById(projectGuid)).catch(() => setIsValid(false));
    }
  };

  useEffect(() => {
    if (!isLoaded) {
      handleFetchData();
    }
  }, []);

  useEffect(() => {
    if (tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [tab]);

  useEffect(() => {
    if (projectGuid && project.project_guid === projectGuid) {
      setIsLoaded(true);
    }
  }, [project]);

  const handleTabChange = (newActiveTab: string) => {
    setActiveTab(newActiveTab);

    let url = routes.EDIT_PROJECT.dynamicRoute(projectGuid, newActiveTab);

    switch (newActiveTab) {
      case "final-app":
        url = routes.PROJECT_FINAL_APPLICATION.dynamicRoute(projectGuid);
        break;
      case "decision-package":
        url = routes.PROJECT_DECISION_PACKAGE.dynamicRoute(projectGuid);
        break;
      default:
        break;
    }
    history.replace(url);
  };

  if (!isValid) {
    return <NullScreen type="generic" />;
  }

  const headerHeight = 121 + 60; // header + tab nav height

  const header = (
    <div className={"padding-lg"}>
      <h1>
        {project.project_title}
        <span className="padding-sm--left">
          <Tag title={`Mine: ${project.mine_name}`}>
            <Link
              style={{ textDecoration: "none" }}
              to={routes.MINE_GENERAL.dynamicRoute(project.mine_guid)}
            >
              <EnvironmentOutlined className="padding-sm--right" />
              {project.mine_name}
            </Link>
          </Tag>
        </span>
      </h1>
      <Link
        data-cy="back-to-major-project-link"
        to={routes.MINE_PRE_APPLICATIONS.dynamicRoute(project.mine_guid)}
      >
        <ArrowLeftOutlined className="padding-sm--right" />
        Back to: {project.mine_name} Major projects
      </Link>
    </div>
  );

  // all the children need to be wrapped in <div className="padding-lg">
  const tabItems = [
    {
      key: "overview",
      label: "Overview",
      children: (
        <div className="padding-lg">
          <ProjectOverviewTab />
        </div>
      ),
    },
    isFeatureEnabled(Feature.AMS_AGENT) && {
      key: "project-description",
      label: "Project Description",
      children: (
        <div className="padding-lg">
          <ProjectDescriptionTab />
        </div>
      ),
    },
    {
      key: "information-requirements-table",
      label: "IRT",
      disabled: !hasInformationRequirementsTable,
      children: (
        <div className="padding-lg">
          <InformationRequirementsTableTab />
        </div>
      ),
    },
    {
      key: "final-app",
      label: "Final Application",
      disabled: !hasFinalAplication,
      children: (
        <div className="padding-lg">
          <MajorMineApplicationTab />
        </div>
      ),
    },
    isFeatureEnabled(Feature.MAJOR_PROJECT_DECISION_PACKAGE) && {
      key: "decision-package",
      label: "Decision Package",
      children: (
        <div className="padding-lg">
          <DecisionPackageTab />
        </div>
      ),
    },
    isFeatureEnabled(Feature.MAJOR_PROJECT_ALL_DOCUMENTS) && {
      key: "documents",
      label: "All Documents",
      children: <ProjectDocumentsTab project={project} />,
    },
  ].filter(Boolean);

  return (
    <div className="page fixed-tabs-container">
      <ScrollSidePageWrapper
        headerHeight={headerHeight}
        header={header}
        content={
          <LoadingWrapper condition={isLoaded}>
            <Tabs
              size="large"
              activeKey={activeTab}
              animated={{ inkBar: true, tabPane: false }}
              className="now-tabs core-tabs fixed-tabs-tabs"
              style={{ margin: "0" }}
              centered
              onTabClick={handleTabChange}
              items={tabItems}
            />
          </LoadingWrapper>
        }
      />
    </div>
  );
};

export default Project;
