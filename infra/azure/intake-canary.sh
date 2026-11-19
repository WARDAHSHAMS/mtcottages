#!/usr/bin/env bash
# End-to-end intake canary (WorldEnterpriseGroup/mtcottages#16).
#
#   intake-canary.sh
#
# Posts one synthetic inquiry through the real public path (Front Door, the
# apply proxy, the Logic App, Dynamics 365) and proves every step:
#
#   1. The proxy answers 200: the Logic App created the lead synchronously.
#      A 202 means it did not (the lead went to intake-retry) and fails the job.
#   2. The Logic App run for this submission (found by its clientTrackingId,
#      which the proxy sets to the submissionId) succeeded.
#   3. Delete_Canary_D365_Lead succeeded inside that run, so no canary lead is
#      left in Dynamics.
#
# The staff email, Teams card and guest acknowledgment it triggers carry a
# "[canary]" prefix and the guest one goes to the canary mailbox
# (CANARY_GUEST_EMAIL on the Function App), which is the #14 evidence.
#
# Never a real application: the proxy replaces the identity fields of a
# canary with fixed synthetic values (function_app.CANARY_LEAD_FIELDS), and
# only a request carrying the Key Vault canary token is treated as one.
#
# Runs in the azure-cli image on the scoped `azure-deploy` runner as the
# certificate service principal, which needs:
#   - Key Vault Secrets User on the canary token secret;
#   - Logic App Operator (read runs) on mtcottages/mtcottages-intake.
# The token is read into a 0600 header file and passed to curl with -H @file,
# so it never appears in argv, the job log or the environment.
#
# Paging (#84): any failure, including a failure before the POST, also posts
# an Adaptive Card to the Teams intake channel. The Teams Workflows webhook URL
# is a credential, so it is read from Key Vault by name
# (the CI variable INTAKE_CANARY_PAGE_SECRET_NAME; unset means not configured)
# into a 0600 file and handed to curl through a --config file, never argv or
# the log. The card carries only the step that
# failed and the pipeline link: the canary is synthetic, no guest data exists.
set +x
set -euo pipefail

FAILURE_REASON=""
fail() { FAILURE_REASON="$*"; echo "ERROR: $*" >&2; exit 1; }

PAGE_SECRET_NAME="${INTAKE_CANARY_PAGE_SECRET_NAME:-}"

# Posts the failure card. Never fails the job a second time: a paging error is
# printed, and the job is already red.
page_failure() {
  local reason="${FAILURE_REASON:-the canary job stopped unexpectedly (exit ${1})}"
  local dir="${WORK:-}"
  if [ -z "${PAGE_SECRET_NAME}" ]; then
    echo "PAGE: not configured (set INTAKE_CANARY_PAGE_SECRET_NAME to the Key Vault secret holding the Teams intake webhook)" >&2
    return 0
  fi
  case "${PAGE_SECRET_NAME}" in
    *[!A-Za-z0-9-]*) echo "PAGE: INTAKE_CANARY_PAGE_SECRET_NAME is not a Key Vault secret name" >&2; return 0 ;;
  esac
  if [ -z "${dir}" ] || [ ! -d "${dir}" ] || ! az account show --output none --only-show-errors >/dev/null 2>&1; then
    echo "PAGE: not sent (no Azure session to read ${PAGE_SECRET_NAME}); the red scheduled pipeline is the only signal" >&2
    return 0
  fi
  if ! az keyvault secret show --vault-name "${VAULT}" --name "${PAGE_SECRET_NAME}" \
       --query value --output tsv --only-show-errors > "${dir}/page-url" 2>/dev/null \
     || [ ! -s "${dir}/page-url" ]; then
    echo "PAGE: not sent (cannot read ${PAGE_SECRET_NAME} from ${VAULT}; grant Key Vault Secrets User on it)" >&2
    return 0
  fi
  printf 'url = "%s"\n' "$(tr -d '[:space:]' < "${dir}/page-url")" > "${dir}/page-curl.conf"
  rm -f "${dir}/page-url"
  jq -n --arg reason "${reason:0:400}" --arg link "${CI_PIPELINE_URL:-}" '{
    type: "message",
    attachments: [{
      contentType: "application/vnd.microsoft.card.adaptive",
      content: {
        type: "AdaptiveCard", version: "1.4",
        "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
        body: [
          {type: "TextBlock", size: "Large", weight: "Bolder", wrap: true, color: "Attention",
           text: "Stay inquiry intake is failing"},
          {type: "TextBlock", wrap: true,
           text: "The end-to-end canary (stay.mtcottages.com → apply proxy → Logic App → Dynamics) failed. Real guest inquiries may not be reaching sales."},
          {type: "FactSet", facts: [{title: "Failed step", value: $reason}]}
        ],
        actions: (if $link == "" then [] else [{type: "Action.OpenUrl", title: "Open the pipeline", url: $link}] end)
      }
    }]
  }' > "${dir}/page.json"
  local code
  code="$(curl --silent --show-error --max-time 30 --config "${dir}/page-curl.conf" \
    --user-agent "mtcottages-intake-canary" --output /dev/null --write-out '%{http_code}' --request POST \
    --header "Content-Type: application/json" --data-binary @"${dir}/page.json")" || code="error"
  rm -f "${dir}/page-curl.conf"
  case "${code}" in
    2??) echo "PAGE: sent to the Teams intake channel (HTTP ${code})" >&2 ;;
    *) echo "PAGE: the Teams webhook answered ${code}; the red scheduled pipeline is the only signal" >&2 ;;
  esac
  return 0
}

APPLY_URL="${INTAKE_CANARY_URL:-https://stay.mtcottages.com/api/apply}"
ORIGIN="${INTAKE_CANARY_ORIGIN:-https://stay.mtcottages.com}"
VAULT="${INTAKE_CANARY_VAULT:-omlab-secrets}"
SECRET_NAME="${INTAKE_CANARY_SECRET_NAME:-mtcottages-intake-canary-token}"
WORKFLOW="${INTAKE_LOGICAPP_NAME:-mtcottages-intake}"
RESOURCE_GROUP="${INTAKE_LOGICAPP_RESOURCE_GROUP:-mtcottages}"
SUBSCRIPTION="${AZURE_FUNCTION_SUBSCRIPTION_ID:-}"
RUN_TIMEOUT_SECONDS="${INTAKE_CANARY_RUN_TIMEOUT_SECONDS:-180}"
RUNS_API_VERSION="2016-06-01"

command -v jq >/dev/null || fail "jq is required"
command -v az >/dev/null || fail "az is required"
command -v curl >/dev/null || fail "curl is required"
[ -n "${SUBSCRIPTION}" ] || fail "AZURE_FUNCTION_SUBSCRIPTION_ID is not set"
case "${RUN_TIMEOUT_SECONDS}" in
  ''|*[!0-9]*) fail "INTAKE_CANARY_RUN_TIMEOUT_SECONDS must be a whole number of seconds" ;;
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
WORK="$(mktemp -d "${TMPDIR:-/tmp}/canary.XXXXXXXX")"
cleanup() {
  local status=$?
  if [ "${status}" -ne 0 ]; then
    page_failure "${status}" || true
  fi
  az logout >/dev/null 2>&1 || true
  rm -rf "${AZURE_CONFIG_DIR}" "${WORK}"
}
trap cleanup EXIT

az login --service-principal --username "${CLIENT_ID}" --tenant "${TENANT_ID}" \
  --certificate "${CERT_DIR}/sp.pem" --output none --only-show-errors \
  || fail "az login with the certificate credential failed"
az account set --subscription "${SUBSCRIPTION}" || fail "az account set failed"

# 2. The canary token, straight into a header file.
token="$(az keyvault secret show --vault-name "${VAULT}" --name "${SECRET_NAME}" \
  --query value --output tsv --only-show-errors)" \
  || fail "reading ${SECRET_NAME} from ${VAULT} failed (does the identity hold Key Vault Secrets User on it?)"
if [ "${#token}" -lt 32 ]; then
  unset token
  fail "${SECRET_NAME} is shorter than 32 characters; the proxy refuses such a token"
fi
printf 'X-Intake-Canary: %s\n' "${token}" > "${WORK}/headers"
unset token

# 3. One synthetic inquiry. The proxy overwrites the identity fields anyway.
SUBMISSION_ID="$(cat /proc/sys/kernel/random/uuid)"
MOVE_IN="$(date -u -d '+30 days' +%F)"
jq -n --arg submissionId "${SUBMISSION_ID}" --arg moveInDate "${MOVE_IN}" '{
  firstName: "Intake",
  lastName: "Canary",
  email: "canary@example.invalid",
  phone: "+1 304 555 0100",
  stayType: "Something else",
  preferredLocation: "Open to options",
  moveInDate: $moveInDate,
  duration: "Flexible / not sure",
  occupants: "1",
  message: "Automated intake check.",
  termsAccepted: "yes",
  website: "",
  submissionId: $submissionId
}' > "${WORK}/payload.json"

status="$(curl --silent --show-error --max-time 60 \
  --output "${WORK}/response.json" --write-out '%{http_code}' \
  --request POST \
  --header @"${WORK}/headers" \
  --header "Content-Type: application/json" \
  --header "Origin: ${ORIGIN}" \
  --user-agent "mtcottages-intake-canary" \
  --data-binary @"${WORK}/payload.json" \
  "${APPLY_URL}")" || fail "POST ${APPLY_URL} failed"

case "${status}" in
  200) ;;
  202) fail "canary ${SUBMISSION_ID}: the proxy queued it because the Logic App did not accept it (see deep health and intake-retry)" ;;
  *) fail "canary ${SUBMISSION_ID}: the proxy answered HTTP ${status}" ;;
esac
jq -e '.success == true' "${WORK}/response.json" >/dev/null \
  || fail "canary ${SUBMISSION_ID}: HTTP 200 without success=true"
echo "canary ${SUBMISSION_ID}: accepted by the proxy (HTTP 200)"

# 4. The Logic App run for this submission, by clientTrackingId.
WORKFLOW_URL="https://management.azure.com/subscriptions/${SUBSCRIPTION}/resourceGroups/${RESOURCE_GROUP}/providers/Microsoft.Logic/workflows/${WORKFLOW}"
RUNS_URL="${WORKFLOW_URL}/runs?api-version=${RUNS_API_VERSION}&\$filter=ClientTrackingId%20eq%20%27${SUBMISSION_ID}%27"
deadline=$(( $(date +%s) + RUN_TIMEOUT_SECONDS ))
run_name=""
run_status=""
while :; do
  az rest --method get --url "${RUNS_URL}" --output json --only-show-errors > "${WORK}/runs.json" \
    || fail "listing runs of ${RESOURCE_GROUP}/${WORKFLOW} failed (does the identity hold Logic App Operator on it?)"
  run_name="$(jq -r '.value[0].name // empty' "${WORK}/runs.json")"
  run_status="$(jq -r '.value[0].properties.status // empty' "${WORK}/runs.json")"
  case "${run_status}" in
    Succeeded|Failed|Cancelled|TimedOut|Aborted|Skipped) break ;;
  esac
  [ "$(date +%s)" -lt "${deadline}" ] \
    || fail "canary ${SUBMISSION_ID}: no finished Logic App run within ${RUN_TIMEOUT_SECONDS}s (last status: ${run_status:-none})"
  sleep 5
done
[ "${run_status}" = "Succeeded" ] \
  || fail "canary ${SUBMISSION_ID}: Logic App run ${run_name} ended ${run_status}"
echo "canary ${SUBMISSION_ID}: Logic App run ${run_name} succeeded"

# 5. The canary lead was deleted in the same run.
az rest --method get \
  --url "${WORKFLOW_URL}/runs/${run_name}/actions/Delete_Canary_D365_Lead?api-version=${RUNS_API_VERSION}" \
  --output json --only-show-errors > "${WORK}/cleanup.json" \
  || fail "canary ${SUBMISSION_ID}: reading Delete_Canary_D365_Lead of run ${run_name} failed"
cleanup_status="$(jq -r '.properties.status // empty' "${WORK}/cleanup.json")"
[ "${cleanup_status}" = "Succeeded" ] \
  || fail "canary ${SUBMISSION_ID}: Delete_Canary_D365_Lead ended '${cleanup_status:-missing}'; a canary lead may be left in Dynamics"
echo "canary ${SUBMISSION_ID}: canary lead deleted; intake is healthy end to end"
