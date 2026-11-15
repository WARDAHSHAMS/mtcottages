#!/usr/bin/env bash
# Count lost stay inquiries, read-only (WorldEnterpriseGroup/mtcottages#12).
#
#   intake-loss-count.sh
#
# Prints aggregates only, never a request, an IP, a payload or any lead field:
#
#   1. Front Door: POST /api/apply attempts on stay.mtcottages.com per day and
#      HTTP status, from the Log Analytics workspace the Front Door profile
#      sends its access log to. A non-2xx day is an inquiry the guest could not
#      send. The workspace's retention and earliest record bound the window,
#      and the job says so instead of reporting a silent zero.
#   2. Logic App: runs of mtcottages-intake since INTAKE_LOSS_SINCE, per day
#      and status. A failed run is a lead the proxy then kept on intake-retry
#      (#15), so it is reported, not counted as lost.
#
# Reads nothing it could change. Runs in the azure-cli image on the scoped
# `azure-deploy` runner as the certificate service principal, which needs
# Log Analytics Reader on the workspace (or resource-context Reader on the
# Front Door profile) and Logic App Operator on the workflow (note_379524 on #12).
set +x
set -euo pipefail

fail() { echo "ERROR: $*" >&2; exit 1; }

SINCE="${INTAKE_LOSS_SINCE:-2026-07-01}"
WORKSPACE_RG="${INTAKE_LOSS_WORKSPACE_RESOURCE_GROUP:-tli_interest}"
WORKSPACE_NAME="${INTAKE_LOSS_WORKSPACE_NAME:-TLIMainAnalytics}"
HOST_NAME="${INTAKE_LOSS_HOST:-stay.mtcottages.com}"
WORKFLOW="${INTAKE_LOGICAPP_NAME:-mtcottages-intake}"
RESOURCE_GROUP="${INTAKE_LOGICAPP_RESOURCE_GROUP:-mtcottages}"
SUBSCRIPTION="${AZURE_FUNCTION_SUBSCRIPTION_ID:-}"
RUNS_API_VERSION="2016-06-01"
MAX_RUN_PAGES=200

command -v jq >/dev/null || fail "jq is required"
command -v az >/dev/null || fail "az is required"
[ -n "${SUBSCRIPTION}" ] || fail "AZURE_FUNCTION_SUBSCRIPTION_ID is not set"
date -u -d "${SINCE}" +%F >/dev/null 2>&1 || fail "INTAKE_LOSS_SINCE must be a date (YYYY-MM-DD)"
case "${HOST_NAME}" in
  *[!A-Za-z0-9.-]*|'') fail "INTAKE_LOSS_HOST must be a plain hostname" ;;
esac

# 1. Credentials only from the runner mount; refuse CI-variable credentials.
for v in AZURE_CLIENT_SECRET AZURE_PASSWORD AZURE_CLIENT_CERTIFICATE_PASSWORD; do
  if [ -n "${!v:-}" ]; then
    fail "CI/CD variable ${v} is set; credentials must come only from the runner-mounted secret directory"
  fi
done
CERT_DIR="${AZURE_DEPLOY_CERT_DIR:-/var/run/azure-deploy}"
for f in client-id tenant-id sp.pem; do
  [ -s "${CERT_DIR}/${f}" ] || fail "${CERT_DIR}/${f} is missing or empty (run on the azure-deploy runner)"
done
CLIENT_ID="$(tr -d '[:space:]' < "${CERT_DIR}/client-id")"
TENANT_ID="$(tr -d '[:space:]' < "${CERT_DIR}/tenant-id")"

umask 077
AZURE_CONFIG_DIR="$(mktemp -d "${TMPDIR:-/tmp}/azcfg.XXXXXXXX")"
export AZURE_CONFIG_DIR
WORK="$(mktemp -d "${TMPDIR:-/tmp}/loss.XXXXXXXX")"
cleanup() {
  az logout >/dev/null 2>&1 || true
  rm -rf "${AZURE_CONFIG_DIR}" "${WORK}"
}
trap cleanup EXIT

az login --service-principal --username "${CLIENT_ID}" --tenant "${TENANT_ID}" \
  --certificate "${CERT_DIR}/sp.pem" --output none --only-show-errors \
  || fail "az login with the certificate credential failed"
az account set --subscription "${SUBSCRIPTION}" || fail "az account set failed"

echo "== #12 lost-inquiry count since ${SINCE} (aggregates only) =="

# 2. Front Door attempts from Log Analytics.
frontdoor_status=0
az monitor log-analytics workspace show --resource-group "${WORKSPACE_RG}" \
  --workspace-name "${WORKSPACE_NAME}" --output json --only-show-errors > "${WORK}/workspace.json" \
  || frontdoor_status=$?
if [ "${frontdoor_status}" -ne 0 ]; then
  echo "Front Door: cannot read workspace ${WORKSPACE_RG}/${WORKSPACE_NAME} (needs Log Analytics Reader)." >&2
else
  workspace_id="$(jq -r '.customerId' "${WORK}/workspace.json")"
  echo "Front Door log workspace retention: $(jq -r '.retentionInDays // "unknown"' "${WORK}/workspace.json") days"
  # Only the host is interpolated, and it was checked to be a plain hostname.
  query="AzureDiagnostics
| where TimeGenerated >= datetime(${SINCE})
| where Category == 'FrontDoorAccessLog'
| where requestUri_s has '${HOST_NAME}/api/apply' and httpMethod_s == 'POST'
| summarize attempts = count() by day = format_datetime(bin(TimeGenerated, 1d), 'yyyy-MM-dd'), status = tostring(httpStatusCode_s)
| order by day asc, status asc"
  coverage="AzureDiagnostics
| where Category == 'FrontDoorAccessLog'
| summarize earliest = min(TimeGenerated), latest = max(TimeGenerated)"
  if az monitor log-analytics query --workspace "${workspace_id}" --analytics-query "${coverage}" \
       --output json --only-show-errors > "${WORK}/coverage.json" \
     && az monitor log-analytics query --workspace "${workspace_id}" --analytics-query "${query}" \
       --output json --only-show-errors > "${WORK}/attempts.json"; then
    echo "Front Door access log covers: $(jq -r '.[0] | "\(.earliest // "none") .. \(.latest // "none")"' "${WORK}/coverage.json")"
    echo "POST /api/apply attempts by day and status:"
    jq -r '.[] | "  \(.day)  \(.status)  \(.attempts)"' "${WORK}/attempts.json"
    jq -r '
      (map(.attempts | tonumber) | add // 0) as $all
      | (map(select((.status | tonumber? // 0) | . >= 200 and . < 300)) | map(.attempts | tonumber) | add // 0) as $ok
      | "  total \($all), accepted (2xx) \($ok), not accepted \($all - $ok)"' "${WORK}/attempts.json"
  else
    frontdoor_status=1
    echo "Front Door: the log query failed (needs Log Analytics Reader on ${WORKSPACE_NAME})." >&2
  fi
fi

# 3. Logic App runs since the window start.
logicapp_status=0
url="https://management.azure.com/subscriptions/${SUBSCRIPTION}/resourceGroups/${RESOURCE_GROUP}/providers/Microsoft.Logic/workflows/${WORKFLOW}/runs?api-version=${RUNS_API_VERSION}&\$filter=StartTime%20ge%20${SINCE}T00:00:00Z"
: > "${WORK}/runs.ndjson"
page=0
while [ -n "${url}" ]; do
  page=$((page + 1))
  [ "${page}" -le "${MAX_RUN_PAGES}" ] || { echo "Logic App: stopped after ${MAX_RUN_PAGES} pages" >&2; logicapp_status=1; break; }
  if ! az rest --method get --url "${url}" --output json --only-show-errors > "${WORK}/page.json"; then
    echo "Logic App: cannot list runs of ${RESOURCE_GROUP}/${WORKFLOW} (needs Logic App Operator)." >&2
    logicapp_status=1
    break
  fi
  jq -c '.value[] | {day: (.properties.startTime[0:10]), status: .properties.status}' "${WORK}/page.json" >> "${WORK}/runs.ndjson"
  url="$(jq -r '.nextLink // empty' "${WORK}/page.json")"
done
if [ "${logicapp_status}" -eq 0 ]; then
  echo "Logic App ${WORKFLOW} runs by day and status:"
  jq -rs 'group_by(.day, .status) | .[] | "  \(.[0].day)  \(.[0].status)  \(length)"' "${WORK}/runs.ndjson"
  jq -rs '"  total \(length), " + (group_by(.status) | map("\(.[0].status) \(length)") | join(", "))' "${WORK}/runs.ndjson"
fi

if [ "${frontdoor_status}" -ne 0 ] || [ "${logicapp_status}" -ne 0 ]; then
  fail "one or more sources could not be read; see above for the role each needs"
fi
echo "Done. Post these aggregates on #12; never copy request or lead details."
