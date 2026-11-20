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
#      and the job says so instead of reporting a silent zero. Then, for the
#      last 24 hours on the whole host, requests and 502/503/504 counts per
#      path and origin with Front Door's ErrorInfo labels (#85).
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
  # The Front Door access log does not match its documented column names
  # (#85): requestUri_s carries the port ("https://stay.mtcottages.com:443/
  # api/apply"), so a substring match on "host/path" never matches, and the
  # status is in httpStatusCode_d while httpStatusCode_s is empty. Every query
  # therefore starts from this one prelude: it parses host and path out of the
  # URI and reads the status from whichever status column holds it. Only the
  # host is interpolated, and it was checked to be a plain hostname.
  #
  # client: "guest-browser" is a browser UA (not headless, not a probe) whose
  # referrer is the form host, which is what a real inquiry looks like;
  # everything else (the platform's hourly synthetic probe, CI smoke and e2e,
  # the canary) is "automation". Both stay counts: no UA or referrer is printed.
  prelude="let fd = AzureDiagnostics
| where Category == 'FrontDoorAccessLog'
| extend req_host = tostring(parse_url(requestUri_s).Host), path = tostring(parse_url(requestUri_s).Path)
| where req_host =~ '${HOST_NAME}'
| extend status = coalesce(toint(column_ifexists('httpStatusCode_d', real(null))), toint(column_ifexists('httpStatusCode_s', '')))
| extend ua = tostring(column_ifexists('userAgent_s', '')), referrer_host = tostring(parse_url(tostring(column_ifexists('referer_s', ''))).Host)
| extend client = iff(ua has 'Mozilla' and not(ua has_any ('HeadlessChrome', 'Playwright', 'intake-synthetic', 'canary')) and referrer_host =~ '${HOST_NAME}', 'guest-browser', 'automation');"
  query="${prelude}
fd
| where TimeGenerated >= datetime(${SINCE})
| where path == '/api/apply' and httpMethod_s == 'POST'
| summarize attempts = count() by day = format_datetime(bin(TimeGenerated, 1d), 'yyyy-MM-dd'), status = tostring(status), client
| order by day asc, client asc, status asc"
  # Coverage on this host, plus how many of its records have no readable
  # status: a non-zero count means the log schema moved again and every count
  # below would be wrong, so the job fails instead of reporting it.
  coverage="${prelude}
fd
| summarize earliest = min(TimeGenerated), latest = max(TimeGenerated), records = count(), unreadable_status = countif(isnull(status))"
  if az monitor log-analytics query --workspace "${workspace_id}" --analytics-query "${coverage}" \
       --output json --only-show-errors > "${WORK}/coverage.json" \
     && az monitor log-analytics query --workspace "${workspace_id}" --analytics-query "${query}" \
       --output json --only-show-errors > "${WORK}/attempts.json"; then
    echo "Front Door access log for ${HOST_NAME} covers: $(jq -r '.[0] | "\(.earliest // "none") .. \(.latest // "none"), \(.records // 0) records"' "${WORK}/coverage.json")"
    if [ "$(jq -r '.[0].records // "0"' "${WORK}/coverage.json")" = "0" ]; then
      frontdoor_status=1
      echo "Front Door: no access-log records for ${HOST_NAME}; the host filter or the diagnostic setting is wrong, so a zero here would be false." >&2
    elif [ "$(jq -r '.[0].unreadable_status // "0"' "${WORK}/coverage.json")" != "0" ]; then
      frontdoor_status=1
      echo "Front Door: $(jq -r '.[0].unreadable_status' "${WORK}/coverage.json") records have no readable HTTP status; the access-log schema changed." >&2
    else
      echo "POST /api/apply attempts by day, client and status:"
      jq -r '.[] | "  \(.day)  \(.client)  \(.status)  \(.attempts)"' "${WORK}/attempts.json"
      jq -r '
        def ok: (.status | tonumber? // 0) as $s | $s >= 200 and $s < 300;
        def total: map(.attempts | tonumber) | add // 0;
        (map(select(.client == "guest-browser"))) as $guest
        | "  total \(total), accepted (2xx) \(map(select(ok)) | total), not accepted \(map(select(ok | not)) | total)",
          "  guest-browser: total \($guest | total), accepted (2xx) \($guest | map(select(ok)) | total), not accepted \($guest | map(select(ok | not)) | total)"' "${WORK}/attempts.json"
    fi
  else
    frontdoor_status=1
    echo "Front Door: the log query failed (needs Log Analytics Reader on ${WORKSPACE_NAME})." >&2
  fi
  # Gateway errors over the last 24 hours on the whole host (#85): a guest who
  # meets a 502 on the form page never reaches /api/apply, so these are counted
  # by path, origin and Front Door's ErrorInfo.
  gateway="${prelude}
fd
| where TimeGenerated >= ago(24h)
| summarize requests = count(), gateway_errors = countif(status in (502, 503, 504)) by path, origin = tostring(originName_s)
| join kind=leftouter (
    fd
    | where TimeGenerated >= ago(24h)
    | where status in (502, 503, 504)
    | summarize causes = make_bag(bag_pack(strcat(tostring(status), ' ', tostring(errorInfo_s)), 1)) by path, origin = tostring(originName_s)
  ) on path, origin
| project path, origin, requests, gateway_errors, causes
| order by gateway_errors desc, requests desc"
  if [ "${frontdoor_status}" -eq 0 ]; then
    if az monitor log-analytics query --workspace "${workspace_id}" --analytics-query "${gateway}" \
         --output json --only-show-errors > "${WORK}/gateway.json"; then
      echo "Last 24h on ${HOST_NAME}, by path and origin: requests, 502/503/504, status+ErrorInfo seen:"
      jq -r '.[] | "  \(.path)  \(.origin // "-")  \(.requests)  \(.gateway_errors)  \(.causes // {} | if type == "string" then (fromjson? // {}) else . end | keys | join(", "))"' "${WORK}/gateway.json"
      jq -r '(map(.requests | tonumber) | add // 0) as $all
        | (map(.gateway_errors | tonumber) | add // 0) as $bad
        | "  total \($all), gateway errors \($bad)"' "${WORK}/gateway.json"
    else
      frontdoor_status=1
      echo "Front Door: the 24h gateway-error query failed." >&2
    fi
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
