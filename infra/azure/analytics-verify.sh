#!/usr/bin/env bash
# Prove the cookieless analytics path end to end after a deploy
# (WorldEnterpriseGroup/mtcottages#23, docs/marketing/analytics-adr.md).
#
# smoke:apply-proxy opened the live stay form in a webdriver browser labelled
# ANALYTICS_TEST_LABEL (ci-<sha8>) and typed into it without submitting, so the
# collector stored a form_view and a form_start in the test partition. This
# script reads the staff dashboard (GET /api/stats?format=json) with the
# Function App's default function key and fails unless both are counted.
#
# Runs in the azure-cli image on the scoped `azure-deploy` runner, signed in as
# the certificate service principal mounted at AZURE_DEPLOY_CERT_DIR, exactly
# like intake-logicapp.sh. The function key is captured inside this shell,
# written to a 0600 header file for curl and never printed or passed as an
# argument. Output is aggregate counts only.
set +x
set -euo pipefail

fail() { echo "ERROR: $*" >&2; exit 1; }

LABEL="${ANALYTICS_TEST_LABEL:-}"
APP="${AZURE_FUNCTION_APP:-mtcottages-apply-proxy}"
RESOURCE_GROUP="${AZURE_FUNCTION_RESOURCE_GROUP:-mtcottages}"
SUBSCRIPTION="${AZURE_FUNCTION_SUBSCRIPTION_ID:-}"
STATS_URL="${ANALYTICS_STATS_URL:-https://stay.mtcottages.com/api/stats?format=json&days=2}"
ATTEMPTS="${ANALYTICS_VERIFY_ATTEMPTS:-12}"

[[ "${LABEL}" =~ ^[a-z0-9][a-z0-9-]{0,39}$ ]] || fail "ANALYTICS_TEST_LABEL must be a slug, got '${LABEL}'"
[ -n "${SUBSCRIPTION}" ] || fail "AZURE_FUNCTION_SUBSCRIPTION_ID is not set"
for tool in az jq curl; do
  command -v "${tool}" >/dev/null || fail "${tool} is required"
done

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
WORK="$(mktemp -d "${TMPDIR:-/tmp}/analytics.XXXXXXXX")"
cleanup() {
  az logout >/dev/null 2>&1 || true
  rm -rf "${AZURE_CONFIG_DIR}" "${WORK}"
}
trap cleanup EXIT

az login --service-principal --username "${CLIENT_ID}" --tenant "${TENANT_ID}" \
  --certificate "${CERT_DIR}/sp.pem" --output none --only-show-errors \
  || fail "az login with the certificate credential failed"
az account set --subscription "${SUBSCRIPTION}" || fail "az account set failed"

KEY="$(az functionapp keys list --name "${APP}" --resource-group "${RESOURCE_GROUP}" \
  --query 'functionKeys.default' --output tsv --only-show-errors)" \
  || fail "could not read the default function key of ${RESOURCE_GROUP}/${APP}"
[ -n "${KEY}" ] || fail "${RESOURCE_GROUP}/${APP} has no default function key"
printf 'x-functions-key: %s\n' "${KEY}" > "${WORK}/key-header"
unset KEY

attempt=1
while :; do
  status="$(curl --silent --show-error --output "${WORK}/stats.json" --write-out '%{http_code}' \
    --max-time 30 --header "@${WORK}/key-header" "${STATS_URL}")" || status="000"
  if [ "${status}" = "200" ]; then
    views="$(jq --arg label "${LABEL}" '.test_traffic[$label].form_view // 0' "${WORK}/stats.json")"
    starts="$(jq --arg label "${LABEL}" '.test_traffic[$label].form_start // 0' "${WORK}/stats.json")"
    echo "attempt ${attempt}: ${LABEL} form_view=${views} form_start=${starts}"
    if [ "${views}" -ge 1 ] && [ "${starts}" -ge 1 ]; then
      echo "Dashboard totals for the last two days (real traffic, test traffic excluded):"
      jq -c '.totals' "${WORK}/stats.json"
      echo "Test traffic labels in range:"
      jq -c '.test_traffic | keys' "${WORK}/stats.json"
      echo "OK: the dashboard counts the smoke test's stay form view and start."
      exit 0
    fi
  else
    echo "attempt ${attempt}: /api/stats answered HTTP ${status}"
    [ "${status}" = "503" ] && jq -c '.' "${WORK}/stats.json" 2>/dev/null || true
  fi
  [ "${attempt}" -ge "${ATTEMPTS}" ] && fail "the dashboard never counted ${LABEL}'s form_view and form_start"
  attempt=$((attempt + 1))
  sleep 10
done
