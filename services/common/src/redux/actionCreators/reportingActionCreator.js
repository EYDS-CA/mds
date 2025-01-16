import { ENVIRONMENT } from "@mds/common/constants/environment";
import { error } from "../actions/genericActions";
import * as Strings from "@mds/common/constants/strings";
import * as API from "@mds/common/constants/API";
import { createRequestHeader } from "../utils/RequestHeaders";
import CustomAxios from "../customAxios";

// This file is anticipated to have multiple exports
export const fetchMetabaseDashboard = (dashboardId, type = "dashboard") =>
  CustomAxios({ errorToastMessage: "Unable to fetch dashboard." })
    .get(`${ENVIRONMENT.apiUrl + API.DASHBOARD(dashboardId, type)}`, createRequestHeader())
    .then((response) => {
      const { dashboard_url } = response.data || {};
      return dashboard_url;
    })
    .catch(() => error(Strings.ERROR));
