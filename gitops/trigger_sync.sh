#!/bin/bash
set -e

TARGET_APP=${1?"Enter App Name !"}
ENV=${2?"Enter ENV Name !"}
ARGOCD_TOKEN=${3? "Enter ArgoCD Auth token !"}
ARGOCD_URL="https://gitops-shared.apps.silver.devops.gov.bc.ca"
ARGOCD_API_URL="$ARGOCD_URL/api/v1"

function get_app_status() {
    curl -s --location --request GET $ARGOCD_API_URL/applications/${TARGET_APP}-${ENV}$1 \
        --header "Accept: application/json" \
        --header "Authorization: Bearer $ARGOCD_TOKEN"
}

function trigger_app_sync() {
    curl -s --location --request POST $ARGOCD_API_URL/applications/${TARGET_APP}-${ENV}/sync \
        --header "Content-Type: application/json" \
        --header "Accept: application/json" \
        --header "Authorization: Bearer $ARGOCD_TOKEN" \
        --data-raw '{
        }'
}

# Save cursor location so we can restore it later
tput sc

############
# Define colors / progress animations
############
animation=(🌑 🌒 🌓 🌔 🌕 🌖 🌗 🌘)
checkmark=✓
green=$(tput setaf 2)
yellow=$(tput setaf 3)
normal=$(tput sgr0)

##################
# Prints the current application status and 
# status of each managed resource inline.
# Displays a loading animation for any resources currently progressing
##################
function print_status() {
    CHAR="${animation[$IT]}"

    MESSAGES=$(echo $APP_STATUS | jq -r --arg CHAR $CHAR --arg CHECKMARK $checkmark '.status.resources[]
        | "  \(if .health.status == "Healthy" then "'$green'" else "'$yellow'" end) \(.name) (\(.kind)): \(.health.status) \(if .health.status == "Healthy" then $CHECKMARK else $CHAR end)'${normal}' \(if .health.message == null then "" else .health.message end)"')

    tput rc
    tput ed
    printf "Elapsed: $SECONDS s $CHAR\n\n"
    printf "$TARGET_APP: $APP_HEALTH, $SYNC_STATUS \n"
    printf "$MESSAGES\n"
}

echo "Triggering sync for $TARGET_APP in $ENV environment"
echo "$ARGOCD_URL/applications/$TARGET_APP-$ENV"

# Force refresh of application to pick up new changes (if any)
APP_STATUS=$(get_app_status '?refresh=normal')
SYNC_STATUS=$(echo $APP_STATUS | jq -r '.status.sync.status')
APP_HEALTH=$(echo $APP_STATUS | jq -r '.status.health.status')

if [[ "$SYNC_STATUS" == "Synced" && "$APP_HEALTH" != "Progressing" ]]; then 
    print_status

    echo "No changes detected. $TARGET_APP-$ENV is already at latest version"
    exit 0
fi

echo "Application status is $SYNC_STATUS, $APP_HEALTH. Synchronizing application."

# Trigger sync in case it was not already kicked off by the state refresh above
SYNC_RESULT=$(trigger_app_sync)
APP_STATUS=$(get_app_status)

SECONDS=0
LAST_PRINT=0
IT=0

# Remember current cursor position so we can show status updates inline
tput sc

# Wait until app has finished progressing (it's either Healthy or Unhealthy)
until [[ "$APP_HEALTH" != 'Progressing' && $SECONDS -gt 20 ]]; do
    APP_HEALTH=$(echo $APP_STATUS | jq -r '.status.health.status')
    SYNC_STATUS=$(echo $APP_STATUS | jq -r '.status.sync.status')

    # Check status of application every 3 seconds max
    if [[ $SECONDS -gt $((LAST_PRINT + 3)) ]]; then
        LAST_PRINT=$SECONDS
        APP_STATUS=$(get_app_status)
    fi

    # Re-Print updates regurarly (for animations :fancy:)
    print_status
    sleep 0.25

    IT=$IT+1

    if [[ $IT -gt 7 ]]; then
        IT=0
    fi
done

if [[ "$APP_HEALTH" == "Healthy" ]]; then
    echo "All Resources are Healthy"
else
    echo "Rollout of $TARGET_APP-$ENV Failed. Current app status is: $APP_HEALTH"
    exit 1
fi
