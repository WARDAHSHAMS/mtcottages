#!/usr/bin/env bash
# Deploy the Mt Cottages intake Logic App from git, or check it for drift
# (WorldEnterpriseGroup/mtcottages#13).
#
#   intake-logicapp.sh plan     print what differs between git and live; exit 0
#   intake-logicapp.sh deploy   PUT the git definition + parameters, read back, assert equal
#   intake-logicapp.sh drift    exit 1 when live differs from git (nightly gate)
#
# Runs in the azure-cli image on the scoped `azure-deploy` runner, signed in as
# the certificate service principal mounted at AZURE_DEPLOY_CERT_DIR (same
# pattern and same refusal of CI-variable credentials as the launch-sequence
# deploy-azure-function template). Never prints a credential, a token or the
# trigger callback URL: only the definition and the parameters, which are
# already public in this repository.
#
# What a deploy changes: properties.definition and properties.parameters.
# What it keeps from live: location, state, tags, identity, accessControl and
# integrationAccount, so a deploy never re-opens or re-locks the trigger (#17)
# or re-enables a disabled workflow.
set +x
set -euo pipefail

MODE="${1:-}"
case "${MODE}" in
  plan|deploy|drift) ;;
  *) echo "usage: $0 plan|deploy|drift" >&2; exit 2 ;;
esac

fail() { echo "ERROR: $*" >&2; exit 1; }

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEFINITION="${INTAKE_DEFINITION:-${HERE}/mtcottages-intake.definition.json}"
PARAMETERS="${INTAKE_PARAMETERS:-${HERE}/mtcottages-intake.parameters.json}"
WORKFLOW="${INTAKE_LOGICAPP_NAME:-mtcottages-intake}"
RESOURCE_GROUP="${INTAKE_LOGICAPP_RESOURCE_GROUP:-mtcottages}"
SUBSCRIPTION="${AZURE_FUNCTION_SUBSCRIPTION_ID:-}"
API_VERSION="2019-05-01"

command -v jq >/dev/null || fail "jq is required"
command -v az >/dev/null || fail "az is required"
[ -n "${SUBSCRIPTION}" ] || fail "AZURE_FUNCTION_SUBSCRIPTION_ID is not set"
jq empty "${DEFINITION}" || fail "${DEFINITION} is not valid JSON"
jq empty "${PARAMETERS}" || fail "${PARAMETERS} is not valid JSON"

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

AZURE_CONFIG_DIR="$(mktemp -d "${TMPDIR:-/tmp}/azcfg.XXXXXXXX")"
export AZURE_CONFIG_DIR
chmod 700 "${AZURE_CONFIG_DIR}"
WORK="$(mktemp -d "${TMPDIR:-/tmp}/intake.XXXXXXXX")"
cleanup() {
  az logout >/dev/null 2>&1 || true
  rm -rf "${AZURE_CONFIG_DIR}" "${WORK}"
}
trap cleanup EXIT

az login --service-principal --username "${CLIENT_ID}" --tenant "${TENANT_ID}" \
  --certificate "${CERT_DIR}/sp.pem" --output none --only-show-errors \
  || fail "az login with the certificate credential failed"
az account set --subscription "${SUBSCRIPTION}" || fail "az account set failed"

URL="https://management.azure.com/subscriptions/${SUBSCRIPTION}/resourceGroups/${RESOURCE_GROUP}/providers/Microsoft.Logic/workflows/${WORKFLOW}?api-version=${API_VERSION}"

get_live() {
  az rest --method get --url "${URL}" --output json --only-show-errors > "$1" \
    || fail "GET ${RESOURCE_GROUP}/${WORKFLOW} failed (does the identity hold Logic App Contributor on it?)"
}

# Canonical forms: sorted keys, an empty `outputs` made explicit (ARM returns
# it even when the deployed definition omitted it), and parameters reduced to
# {name: value}.
canon_definition() { jq -S '.properties.definition | .outputs = (.outputs // {})' "$1"; }
canon_parameters() { jq -S '(.properties.parameters // {}) | with_entries(.value = .value.value)' "$1"; }
git_definition() { jq -S '.outputs = (.outputs // {})' "${DEFINITION}"; }
git_parameters() { jq -S 'with_entries(.value = .value.value)' "${PARAMETERS}"; }

same_json() { [ "$(jq -n --slurpfile a "$1" --slurpfile b "$2" '$a[0] == $b[0]')" = "true" ]; }
# Every action name at any depth (If branches, scopes), one per line, sorted.
action_names() { jq -r '[.. | objects | .actions? | select(type == "object") | keys[]] | unique[]' "$1"; }
show_diff() {
  if command -v diff >/dev/null; then diff -u "$1" "$2" | head -"$3" || true; fi
}

# Prints a compact, secret-free summary of what differs. Returns 1 on drift.
compare() {
  local live="$1" drifted=0
  canon_definition "${live}" > "${WORK}/live.definition.json"
  git_definition > "${WORK}/git.definition.json"
  canon_parameters "${live}" > "${WORK}/live.parameters.json"
  git_parameters > "${WORK}/git.parameters.json"

  if ! same_json "${WORK}/live.definition.json" "${WORK}/git.definition.json"; then
    drifted=1
    action_names "${WORK}/live.definition.json" > "${WORK}/live.actions"
    action_names "${WORK}/git.definition.json" > "${WORK}/git.actions"
    echo "DRIFT definition: live and git differ"
    echo "  actions live: $(wc -l < "${WORK}/live.actions"), git: $(wc -l < "${WORK}/git.actions")"
    echo "  only in live: $(grep -vxF -f "${WORK}/git.actions" "${WORK}/live.actions" | tr '\n' ' ' || true)"
    echo "  only in git:  $(grep -vxF -f "${WORK}/live.actions" "${WORK}/git.actions" | tr '\n' ' ' || true)"
    show_diff "${WORK}/live.definition.json" "${WORK}/git.definition.json" 200
  fi
  if ! same_json "${WORK}/live.parameters.json" "${WORK}/git.parameters.json"; then
    drifted=1
    echo "DRIFT parameters: live and git differ"
    show_diff "${WORK}/live.parameters.json" "${WORK}/git.parameters.json" 80
  fi
  if [ "${drifted}" -eq 0 ]; then
    echo "OK: ${RESOURCE_GROUP}/${WORKFLOW} definition and parameters equal git"
  fi
  return "${drifted}"
}

get_live "${WORK}/live.json"
echo "Live: ${RESOURCE_GROUP}/${WORKFLOW} state=$(jq -r '.properties.state' "${WORK}/live.json") changed=$(jq -r '.properties.changedTime' "${WORK}/live.json")"

case "${MODE}" in
  plan)
    compare "${WORK}/live.json" || true
    ;;
  drift)
    compare "${WORK}/live.json"
    ;;
  deploy)
    if compare "${WORK}/live.json"; then
      echo "Nothing to deploy"
      exit 0
    fi
    jq --slurpfile def "${DEFINITION}" --slurpfile par "${PARAMETERS}" '{
        location: .location,
        tags: (.tags // {}),
        properties: (
          {state: .properties.state, definition: $def[0], parameters: $par[0]}
          + (if .properties.accessControl then {accessControl: .properties.accessControl} else {} end)
          + (if .properties.integrationAccount then {integrationAccount: .properties.integrationAccount} else {} end)
        )
      } + (if .identity then {identity: (.identity | del(.principalId, .tenantId))} else {} end)' \
      "${WORK}/live.json" > "${WORK}/put.json"
    echo "Deploying git definition to ${RESOURCE_GROUP}/${WORKFLOW}"
    az rest --method put --url "${URL}" --body "@${WORK}/put.json" --output none --only-show-errors \
      || fail "PUT ${RESOURCE_GROUP}/${WORKFLOW} failed"
    get_live "${WORK}/after.json"
    compare "${WORK}/after.json" || fail "read-back after deploy still differs from git"
    echo "Deployed: ${RESOURCE_GROUP}/${WORKFLOW} changed=$(jq -r '.properties.changedTime' "${WORK}/after.json")"
    ;;
esac
