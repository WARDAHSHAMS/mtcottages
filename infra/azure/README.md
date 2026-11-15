# Mt Cottages application intake

The application flow has one canonical public surface:

- `https://stay.mtcottages.com/` is the only application page. The Azure Function proxy in `apply-proxy/` serves the complete page, validates submissions, and forwards them to the Logic App.
- The marketing site does not emit `/apply.html`, and the Front Door route does not attach `apply.mtcottages.com`.

## Cloudflare Turnstile

Create a Turnstile widget for the canonical stay host and allow this hostname:

```text
stay.mtcottages.com
```

Set these Azure Function application settings. Keep the secret in the Function App configuration or a referenced secret store; do not commit it.

```text
TURNSTILE_SITE_KEY=<site-key>
TURNSTILE_SECRET_KEY=<secret-key>
TURNSTILE_EXPECTED_ACTION=stay-inquiry
TURNSTILE_ALLOWED_HOSTNAMES=stay.mtcottages.com
ALLOWED_ORIGINS=https://stay.mtcottages.com
LOGICAPP_URL_APPLICATION=<logic-app-trigger-url>
```

If either Turnstile value is missing, the Function returns `503 Application form unavailable` rather than rendering a disabled form or advertising an email fallback.

## Dynamics 365 / Dataverse ownership

Deploy `mtcottages-intake.definition.json` with `mtcottages-intake.parameters.json`. The workflow parameter `d365BusinessUnitName` is explicitly set to `MtCottages`. Before deployment, confirm that the Dataverse business unit display name matches that value exactly.

The workflow first looks up that business unit, then finds its default owner team, and assigns the created lead to that team through `ownerid@odata.bind`. The Dynamics connection therefore needs permission to read business units and teams and to create and assign leads. If the business unit or default owner team is missing, the workflow returns a configuration error instead of creating an unowned lead.

The existing `dynamicscrmonline` connection and `d365Organization` parameter remain in use so this change fits the current Logic App deployment. No CRM secrets or connection IDs should be added to source control.

## Durable, idempotent intake (#15)

No inquiry that passed validation and Turnstile is dropped, and a retry never creates a second lead.

- **Idempotency key.** The form sends `submissionId`, a UUID v4 generated in the browser. It is kept across a failed send and replaced only after a success. The proxy validates it (or generates one for an older cached page) and forwards it to the Logic App in the body and as the `Idempotency-Key` header. It is part of the trigger schema, so `check-form-parity.py` keeps the form and the definition aligned.
- **Duplicates.** An instance that already delivered a `submissionId` answers a repeat with the same success and does not call the Logic App again (24 h, per instance). Cross-instance de-duplication belongs in the Logic App, keyed on `submissionId` (#13).
- **Timeouts and failures.** The Logic App call has a bounded timeout (`LOGICAPP_TIMEOUT_SECONDS`, default 25, allowed 5–120). A timeout, a connection failure or any non-2xx answer, including a broken trigger URL, writes the lead to the Storage queue `intake-retry` in the Function App's own host storage account (`AzureWebJobsStorage`; no new resource). The guest gets HTTP 202, `success: true`, because the inquiry is durably held.
- **Redelivery.** The queue-triggered function `redeliver_intake` retries with the same `submissionId`. `host.json` allows 8 attempts, 2 minutes apart at the least. After the last attempt the runtime moves the message to `intake-retry-poison`, where it waits for staff recovery. A non-empty poison queue is an alert condition (#16). Queue messages expire after 7 days, so the alert must page well within that.
- **Logs** carry the `submissionId` and a reason label (`timeout`, `http-503`, …), never lead fields.
- If the host cannot write the queue message, it answers 500. The submission is then not remembered, so the browser's retry with the same key is processed again.

## Staff alert and guest acknowledgment (#14)

Every accepted inquiry, whether delivered or queued for redelivery, puts one message per configured channel on the Storage queue `intake-notify`. A duplicate `submissionId` or a rejected submission notifies nobody. The queue-triggered function `send_intake_notification` sends each channel on its own, so a mail outage never delays the guest's answer or the other channels:

| Channel | What staff or the guest get |
|---|---|
| `staff-email` | "New stay inquiry: <name>, <home or town>, move-in <date>" to `STAFF_ALERT_RECIPIENTS`, with every form fact and the message. Reply-To is the guest. |
| `teams` | An Adaptive Card in the Mt Cottages channel, with the same facts and "Email the guest" / "Call the guest" buttons. |
| `guest-email` | "We have your inquiry, <first name>": the response promise, the three next steps and the move-in, length, town and home they chose. It never echoes their phone, message or free text, and Reply-To is `stay@mtcottages.com`. Voice follows `docs/marketing/brand-and-positioning.md` (#11): warm, plain, no exclamation marks. |

`host.json` polls idle queues at least every 10 seconds, so the staff alert lands well inside the SOP's 1 minute. A failed channel is retried up to 8 times, 2 minutes apart, then moved to `intake-notify-poison` (an alert condition, #16). ACS sends carry a `repeatability-request-id` derived from the `submissionId` and channel, so a retried email is sent once. Logs carry the `submissionId` and channel only.

Application settings (a channel whose settings are missing is simply not queued):

| Setting | Value |
|---|---|
| `ACS_EMAIL_ENDPOINT` | `https://<resource>.communication.azure.com`. Auth is the Function App's managed identity (needs a role on the ACS resource that allows `emails:send`); no access key. |
| `NOTIFY_SENDER_ADDRESS` | The verified ACS sender, `stay@mtcottages.com` once the domain is verified in ACS. |
| `NOTIFY_REPLY_TO` | Optional; default `stay@mtcottages.com`. |
| `STAFF_ALERT_RECIPIENTS` | Comma-separated staff addresses. |
| `TEAMS_INTAKE_WEBHOOK_URL` | A Key Vault reference (`@Microsoft.KeyVault(...)`) to the Teams Workflows webhook URL. The URL is a credential; never put it in git or a plain setting. |
| `GUEST_AUTOREPLY_ENABLED` | `true` to send the guest acknowledgment. |
| `GUEST_RESPONSE_PROMISE` | Default `within 2 business hours`. The owner confirms it (brand decision D6). |

## Live deployment / runbook

The Function App `mtcottages-apply-proxy` (resource group `mtcottages`, Linux Consumption) is published by GitLab CI and by nothing else (WorldEnterpriseGroup/mtcottages#9). Nobody deploys it from a workstation: the hand-run `az functionapp deployment source config-zip` path is retired.

### Pipeline

A push to `gh-pages` that changes `infra/azure/apply-proxy/` or `.gitlab-ci.yml` runs these jobs. The first two also run on merge requests.

| Job | What it does |
|---|---|
| `test:apply-proxy` | Compiles `function_app.py` and runs the unit tests in `apply-proxy/tests`. |
| `package:apply-proxy` | Builds `apply-proxy.zip` with `function_app.py`, `host.json`, `requirements.txt`, `index.html` and `BUILD_COMMIT` (the commit SHA) at the archive root. |
| `deploy:apply-proxy` | Publishes the zip with the launch-sequence `.deploy:azure-function` template (Kudu remote build), then waits for `https://stay.mtcottages.com/api/health` to return HTTP 200. |
| `smoke:apply-proxy` | Runs the stay tests in `e2e/tests/live.spec.js` against the live host. It waits for `/api/health` to report the published commit, loads the form and posts one honeypot probe that the proxy rejects with HTTP 400. It never submits a valid application. |

`/api/health` returns `{"status": "ok", "service": "mtcottages-apply-proxy", "commit": "<sha>"}`. `commit` is the `BUILD_COMMIT` from the package; a package not built by the pipeline reports `unknown`. This plain answer is constant and makes no outbound call: the Front Door origin probe and the deploy gate use it.

### Deep health (#16)

`GET /api/health?deep=1` follows the platform's `upstream-health` contract (FocusApiary/infrastructure `docs/runbooks/intake-synthetic-checks.md`). It answers 200 when every check passes and 503 with `"status": "degraded"` otherwise, and caches its result for 30 seconds:

- `upstream.LOGICAPP_URL_APPLICATION`: a GET on the trigger, with no payload, so no workflow runs. `ok` means Logic Apps refused the method (400 `TriggerRequestMethodNotValid`), which proves that the URL, signature and caller IP are accepted. `status_401_AuthorizationFailed` means a rotated key or a caller-IP restriction. `status_404` means the workflow or trigger is gone. `unreachable_*` means a network failure, and `not_configured` means the setting is missing.
- `queues`: the approximate depth of `intake-retry` (informational) and of the two poison queues. Any message in `intake-retry-poison` or `intake-notify-poison` fails the check: a lead or a notification has run out of retries and needs staff (below). It reads the depth with the host storage connection string. If that setting is not key-based, the depths read `unknown` and do not fail the check.

The body holds labels and counts only, never a URL, key or lead field. The hourly in-cluster blackbox probe (`check=upstream-health`, FocusApiary/monitoring-k8s) is what turns a 503 into an alert.

**Recovering a poisoned message.** Do not copy lead data into a ticket or chat. In the Storage account's `intake-retry-poison` queue, fix the cause (look up the reason in the Function logs by `submissionId`), then move the message back to `intake-retry`, where `redeliver_intake` sends it again with the same `submissionId`. For `intake-notify-poison`, move it back to `intake-notify`. A poison message expires 7 days after it lands there, so recovery has to happen within that window.

To publish the current commit again without a code change, start a pipeline on `gh-pages` from the GitLab UI ("Run pipeline").

### Credentials

The deploy job signs in as a certificate-credential service principal, the pattern in FocusApiary/infrastructure `docs/adr/0005-crown-backup-writer-certificate-sp.md`. The certificate is generated in Key Vault `omlab-secrets`, delivered by an ExternalSecret into a Kubernetes Secret, and mounted read-only into the job pod by the scoped `azure-deploy` runner. No GitLab CI/CD variable holds a credential, and the template refuses to run if `AZURE_CLIENT_SECRET`, `AZURE_PASSWORD` or `AZURE_CLIENT_CERTIFICATE_PASSWORD` is set. The job never prints the certificate, the ids or a token.

Two project CI/CD variables control the job. Neither is a credential.

| Variable | Meaning |
|---|---|
| `APPLY_PROXY_DEPLOY_ENABLED` | `true` creates the deploy and smoke jobs on `gh-pages`. Unset, they are not created. |
| `AZURE_FUNCTION_SUBSCRIPTION_ID` | Subscription id of the `mtcottages` resource group. |

### Prerequisites

These live outside this repository, the same split as WorldEnterpriseGroup/trustora (trustora#3). `APPLY_PROXY_DEPLOY_ENABLED` stays unset until all of them exist.

- A service principal with a certificate credential and `Website Contributor` on `mtcottages-apply-proxy` only, with its certificate in `omlab-secrets`: a Terraform environment in FocusApiary/infrastructure modelled on `terraform/environments/trustora-deploy-identity`, applied by the Admiral.
- An ExternalSecret in FocusApiary/registry that delivers `client-id`, `tenant-id` and `sp.pem` for that identity.
- The scoped `azure-deploy` runner (gitlab-k8s) enabled for this project with that Secret mounted. If it is mounted somewhere other than `/var/run/azure-deploy`, or behind another runner tag, set `AZURE_DEPLOY_CERT_DIR` or `AZURE_DEPLOY_RUNNER_TAG` on `deploy:apply-proxy`.
- `gh-pages` stays a protected branch: the runner accepts protected refs only.

### Publishing surface

The SCM (Kudu) and FTP publishing surface accepts only Microsoft Entra bearer tokens: basic-auth publishing is disabled by `apply-proxy-scm.bicep` and FTPS is `Disabled` (FocusApiary/infrastructure#509). There is no publish profile. The deploy job's service principal token is the only credential that publishes.

Required application-setting names for the proxy (provision the values out of band):

```text
TURNSTILE_SITE_KEY
TURNSTILE_SECRET_KEY
TURNSTILE_EXPECTED_ACTION
TURNSTILE_ALLOWED_HOSTNAMES
ALLOWED_ORIGINS
LOGICAPP_URL_APPLICATION
```

Provision the real Turnstile site and secret values separately in the Function App configuration or a referenced secret store. Never commit those values, a populated settings export, or secrets in the deployment zip.

### Front Door sequence

1. Confirm `mtcottages-apply-route` is HTTPS-only and attaches only `stay.mtcottages.com`.
2. Confirm the `SecurityHeaders` ruleset is attached to the live route and the Standard WAF policy association includes the stay custom domain.
3. Let the pipeline publish the zip; `smoke:apply-proxy` checks the canonical stay page, Turnstile asset loading, and the application endpoint through Front Door.
4. Keep the direct-origin restriction staged until those smoke checks pass. Apply the origin lock last, then repeat the canonical and application-edge smoke checks through Front Door.

### Release checklist and rollback

- [ ] `deploy:apply-proxy` and `smoke:apply-proxy` are green, and `/api/health` reports the commit that was merged.
- [ ] All required setting names are present; Turnstile values were provisioned separately and are not in source control.
- [ ] Front Door route, `SecurityHeaders` ruleset, and WAF domain associations are verified before enabling the origin lock.
- [ ] Canonical, form, Turnstile, and invalid-submission smoke checks pass after deployment and again after the origin lock.

If smoke checks fail, fix forward: merge the fix to `gh-pages` and let the pipeline publish it. Leave the direct-origin restriction staged until the smoke job is green again.
