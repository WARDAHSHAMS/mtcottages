#!/usr/bin/env bash
# Give the Mt Cottages lead owner team a role that can own leads
# (WorldEnterpriseGroup/mtcottages#85).
#
#   d365-owner-team.sh check    exit 1 unless the team already holds the role (read-only)
#   d365-owner-team.sh ensure   associate the role with the team when it is missing; idempotent
#
# mtcottages-intake assigns every lead to the default team of the business unit
# named by `d365BusinessUnitName` in mtcottages-intake.parameters.json. Dataverse
# refuses that owner unless the team holds a role with Lead read ("Read Privilege
# Check For Owner failed ... missing prvReadLead"). Every other site team in
# Dream holds its business unit's standard `Salesperson` role, so this one does
# too: Lead privileges at the role's standard depths, nothing org-wide.
#
# Runs as an operator `az` login that holds System Administrator in Dream (the
# same rule as the World Enterprise intake ADR's OP-DV step). Uses a Dataverse
# token from `az account get-access-token` in this process only, never prints
# it. Prints names and ids of the business unit, team and role, nothing else.
set +x
set -euo pipefail

MODE="${1:-}"
case "${MODE}" in
  check|ensure) ;;
  *) echo "usage: $0 check|ensure" >&2; exit 2 ;;
esac

fail() { echo "ERROR: $*" >&2; exit 1; }

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PARAMETERS="${INTAKE_PARAMETERS:-${HERE}/mtcottages-intake.parameters.json}"
ORG_URL="${D365_ORG_URL:-https://dream.crm.dynamics.com}"
ROLE_NAME="${D365_OWNER_ROLE:-Salesperson}"
API="${ORG_URL}/api/data/v9.2"

command -v jq >/dev/null || fail "jq is required"
command -v az >/dev/null || fail "az is required"
command -v curl >/dev/null || fail "curl is required"
UNIT="$(jq -r '.d365BusinessUnitName.value // empty' "${PARAMETERS}")"
[ -n "${UNIT}" ] || fail "${PARAMETERS} has no d365BusinessUnitName"

TOKEN="$(az account get-access-token --resource "${ORG_URL}" --query accessToken -o tsv 2>/dev/null)" \
  || fail "no Dataverse token for ${ORG_URL} (az login as an operator with System Administrator in the org)"
[ -n "${TOKEN}" ] || fail "empty Dataverse token for ${ORG_URL}"
trap 'unset TOKEN' EXIT

# GET a Web API path; fails with the HTTP status, never the token.
dv_get() {
  local out status
  out="$(mktemp)"
  status="$(curl -sS --user-agent "mtcottages-d365-owner-team" -o "${out}" -w '%{http_code}' \
    -H "Authorization: Bearer ${TOKEN}" -H "Accept: application/json" \
    -H "OData-MaxVersion: 4.0" -H "OData-Version: 4.0" "${API}/$1")" \
    || { rm -f "${out}"; fail "GET $1: request failed"; }
  [ "${status}" = "200" ] || { jq -r '.error.message // empty' "${out}" >&2 || true; rm -f "${out}"; fail "GET $1: HTTP ${status}"; }
  cat "${out}"
  rm -f "${out}"
}
odata_quote() { jq -rn --arg v "$1" --arg q "'" '$v | gsub($q; $q + $q) | @uri'; }

UNIT_ID="$(dv_get "businessunits?\$select=businessunitid&\$filter=name%20eq%20'$(odata_quote "${UNIT}")'" \
  | jq -r 'if (.value | length) == 1 then .value[0].businessunitid else empty end')"
[ -n "${UNIT_ID}" ] || fail "business unit '${UNIT}' not found exactly once"
TEAM_ID="$(dv_get "teams?\$select=teamid&\$filter=_businessunitid_value%20eq%20${UNIT_ID}%20and%20isdefault%20eq%20true" \
  | jq -r 'if (.value | length) == 1 then .value[0].teamid else empty end')"
[ -n "${TEAM_ID}" ] || fail "business unit '${UNIT}' has no single default team"
ROLE_ID="$(dv_get "roles?\$select=roleid&\$filter=name%20eq%20'$(odata_quote "${ROLE_NAME}")'%20and%20_businessunitid_value%20eq%20${UNIT_ID}" \
  | jq -r 'if (.value | length) == 1 then .value[0].roleid else empty end')"
[ -n "${ROLE_ID}" ] || fail "role '${ROLE_NAME}' not found exactly once in business unit '${UNIT}'"

has_role() {
  dv_get "teams(${TEAM_ID})/teamroles_association?\$select=roleid" \
    | jq -e --arg r "${ROLE_ID}" '[.value[].roleid] | index($r) != null' >/dev/null
}

echo "Business unit '${UNIT}' (${UNIT_ID}), default team ${TEAM_ID}, role '${ROLE_NAME}' (${ROLE_ID})"
if has_role; then
  echo "OK: the default team holds '${ROLE_NAME}'"
  exit 0
fi
if [ "${MODE}" = "check" ]; then
  fail "the default team of '${UNIT}' lacks '${ROLE_NAME}'; run: $0 ensure"
fi

jq -n --arg id "${API}/roles(${ROLE_ID})" '{"@odata.id": $id}' > "${TMPDIR:-/tmp}/d365-ref.$$.json"
status="$(curl -sS --user-agent "mtcottages-d365-owner-team" -o /dev/null -w '%{http_code}' -X POST \
  -H "Authorization: Bearer ${TOKEN}" -H "Content-Type: application/json" \
  -H "OData-MaxVersion: 4.0" -H "OData-Version: 4.0" \
  --data "@${TMPDIR:-/tmp}/d365-ref.$$.json" "${API}/teams(${TEAM_ID})/teamroles_association/\$ref")" \
  || { rm -f "${TMPDIR:-/tmp}/d365-ref.$$.json"; fail "associating the role failed"; }
rm -f "${TMPDIR:-/tmp}/d365-ref.$$.json"
[ "${status}" = "204" ] || fail "associating the role answered HTTP ${status}"
has_role || fail "read-back: the default team still lacks '${ROLE_NAME}'"
echo "Associated: the default team of '${UNIT}' now holds '${ROLE_NAME}'"
