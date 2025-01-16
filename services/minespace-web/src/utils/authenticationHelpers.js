import { KEYCLOAK } from "@mds/common/constants/environment";
import {
  KEYCLOAK_LOGOUT_REDIRECT_URI,
  SITEMINDER_LOGOUT_REDIRECT_URI,
} from "@/constants/environment";
import keycloak from "@mds/common/keycloak";

export const signOutFromSSO = () => {
  keycloak.logout({
    redirectUri: KEYCLOAK_LOGOUT_REDIRECT_URI,
  });
};

export const signOutFromSiteMinder = () => {
  window.open(`${KEYCLOAK.siteMinderLogoutURL}${SITEMINDER_LOGOUT_REDIRECT_URI}`, "_self");
};
