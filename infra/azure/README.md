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

The site key and the secret must come from **the same widget**. A secret from another widget, or one of Cloudflare's test keys (`1x…`, `2x…`, `3x…` followed by zeros), makes siteverify refuse every real guest token with `invalid-input-response` (#85). `/api/health?deep=1` reports a test key as `turnstile: test_key`. No IaC owns the widget or these two app settings yet. Change them only through Key Vault `omlab-secrets` (see the rotation runbook below) and record the change on the issue.

### Which stage refused an inquiry (#85)

`POST /api/apply` checks an inquiry in this order. Every 400 says which stage refused it in a `stage` field and in a log line, with fixed labels only and never a field value:

| Order | `stage` | Refused when | Log line |
| --- | --- | --- | --- |
| 1 | `screening` | the body does not parse, a field is not text, or the honeypot is filled | `Inquiry rejected at screening` |
| 2 | `verification` | Turnstile refuses. `reason` is `missing-token`, `token-too-long`, `rejected:<Cloudflare error-codes>`, `hostname-mismatch`, `action-mismatch` or `testing-key` (a Cloudflare test-key token where test keys are not accepted) (`not-configured` and `siteverify-unavailable` answer 503) | `Turnstile rejected an inquiry: <codes>` |
| 3 | `validation` | a required field is missing or a value is invalid | `Inquiry rejected at validation: <fixed message>` |

Turnstile runs before the field checks, so the live smoke can prove that a real-browser token verifies. It posts the token with an incomplete inquiry, which stops at `validation` and never reaches the Logic App.

### Synthetic real-form submission gate (#85)

`synthetic:inquiry` runs on every merge request and gh-pages push that touches the proxy, and `deploy:apply-proxy` needs it. Chromium opens the real form at `https://stay.mtcottages.com/`; every request to that host is answered by `apply-proxy/ci/synthetic_host.py`, which serves the packaged Function code through the same HTTP functions the Azure host calls (`app.get_functions()`), adding `X-Forwarded-Host` as Front Door does. The test fills every visible field like a guest and submits. Turnstile is the real widget and the real `_verify_turnstile` against Cloudflare's live siteverify, using Cloudflare's published always-pass test keys and `TURNSTILE_ACCEPT_TEST_KEYS=true`; the Logic App is a stub trigger on the same host. Any non-2xx from `/api/apply`, or no lead at the stub, fails the job.

The same run proves receipt (#93). The host hands every message `apply` put on `intake-notify` to the real `send_intake_notification`, whose Graph transport signs in with the managed identity as a federated credential and calls `sendMail`, against stubs on the same host (`/__identity/token`, `/__login`, `/__graph`) that check the assertion and the bearer token. The test then requires exactly one staff alert, to `STAFF_ALERT_RECIPIENTS` from `GRAPH_MAIL_SENDER`, with the guest as Reply-To and no failed notify message (`GET /__synthetic/mail`). No mail leaves the job.

`TURNSTILE_ACCEPT_TEST_KEYS` exists only for this gate. Without it a test-key token is refused (`testing-key`), and with it deep health answers 503 `turnstile: test_key`, so the live host can never run with it.

Run it locally: start the host with the job's variables (`.gitlab-ci.yml`, `synthetic:inquiry`), then `SYNTHETIC_HOST_URL=http://127.0.0.1:7071 npx playwright test tests/synthetic-inquiry.spec.js` in `e2e/`.

## Dynamics 365 / Dataverse ownership

Deploy `mtcottages-intake.definition.json` with `mtcottages-intake.parameters.json`. The workflow parameter `d365BusinessUnitName` is `World Enterprise`, the Mt Cottages owner's business unit in the Dream Dataverse org (`dream.crm.dynamics.com`). There is no `MtCottages` business unit; the earlier value named one that never existed (#85).

The workflow first looks up that business unit, then finds its default owner team, and assigns the created lead to that team through the connector's owner columns `_ownerid_value` and `_ownerid_type: teams` (the Web API's `ownerid@odata.bind` is outside the connector's schema and fails every create, #85). The Dynamics connection therefore needs permission to read business units and teams and to create and assign leads, and the owner team needs a role that can read leads: `d365-owner-team.sh` gives the default team its business unit's standard `Salesperson` role, the convention every other site team in Dream follows. If the business unit or default owner team is missing, the workflow returns a configuration error instead of creating an unowned lead.

`d365Organization` is the dataset name the `dynamicscrmonline` connector uses for the org: its **unique name plus region**, `org8a977f45.crm`, not the URL name `dream.crm`. The connector answered `404 NotFound` on `/datasets/dream.crm/tables/leads/items` to every lead create, so until #85 no inquiry ever reached Dynamics. `intake-logicapp.sh` checks the target read-only through the bound connection before every plan, deploy and drift run: the org must be listed by `GET /datasets`, and the business unit must exist with a default owner team. No CRM secrets should be added to source control.

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

### Staff alert through Microsoft Graph (#93)

The owner reads `stay@mtcottages.com`, an alias on a mailbox in the Tao Mgt Microsoft 365 tenant. The staff alert goes there through Graph `sendMail`, sent from that same mailbox, instead of ACS: it costs nothing (no new spend, ADMIRAL policy 21), stores no secret and uses no person's login.

- **Who signs in.** A multi-tenant app registration in the focushive tenant holds a federated identity credential whose subject is the Function App's system-assigned managed identity. The Function asks its identity for a token with audience `api://AzureADTokenExchange` and hands it to `https://login.microsoftonline.com/<Tao Mgt tenant>/oauth2/v2.0/token` as the `client_assertion` of a client-credentials grant for `https://graph.microsoft.com/.default`. The Graph token is cached until 5 minutes before it expires.
- **What it may do.** The app's service principal in Tao Mgt is admin-consented for Graph `Mail.Send` (application), and an Exchange Online RBAC-for-Applications management scope limits it to the one sending mailbox, so it cannot send as anyone else.
- **What is sent.** One HTML message to `STAFF_ALERT_RECIPIENTS`, Reply-To the guest, a `X-MtC-Submission-Id` header, not saved to Sent Items. Graph answers 202. Graph has no repeatability id, so a retry after a lost answer can repeat an alert; a duplicate is better than a lost lead.
- **Failures.** A refused token logs only the OAuth error label (`invalid_client`, `unauthorized_client`), never the description. Every failure is retried like any channel and ends in `intake-notify-poison`.
- **The privileged half** (the identity, the app and its credential, the consent, the Exchange scope and these settings) is applied from FocusApiary/infrastructure (#896), not from this repo.

When the Graph settings are complete, Graph carries the staff alert even if ACS is configured too. The guest acknowledgment still needs ACS and stays off until the owner approves its wording.

Application settings (a channel whose settings are missing is simply not queued):

| Setting | Value |
|---|---|
| `ACS_EMAIL_ENDPOINT` | `https://<resource>.communication.azure.com`. Auth is the Function App's managed identity (needs a role on the ACS resource that allows `emails:send`); no access key. |
| `NOTIFY_SENDER_ADDRESS` | The verified ACS sender, `stay@mtcottages.com` once the domain is verified in ACS. |
| `NOTIFY_REPLY_TO` | Optional; default `stay@mtcottages.com`. |
| `STAFF_ALERT_RECIPIENTS` | Comma-separated staff addresses: `stay@mtcottages.com`. |
| `GRAPH_MAIL_TENANT_ID` | The sending mailbox's tenant id (Tao Mgt). |
| `GRAPH_MAIL_CLIENT_ID` | The mail app's client id. An id, not a secret. |
| `GRAPH_MAIL_SENDER` | The sending mailbox's user principal name. |
| `GRAPH_MAIL_LOGIN_ENDPOINT`, `GRAPH_MAIL_API_ENDPOINT` | Unset in Azure. Only an `http://127.0.0.1` (or `localhost`) URL may replace the defaults, for CI's synthetic host; any other value turns the Graph transport off. |
| `TEAMS_INTAKE_WEBHOOK_URL` | A Key Vault reference (`@Microsoft.KeyVault(...)`) to the Teams Workflows webhook URL. The URL is a credential; never put it in git or a plain setting. |
| `GUEST_AUTOREPLY_ENABLED` | `true` to send the guest acknowledgment. |
| `GUEST_RESPONSE_PROMISE` | Default `within 2 business hours`. The owner confirms it (brand decision D6). |

## Locked trigger and secured run data (#17)

Today the Logic App trigger accepts anyone holding its callback URL (`accessControl` is null), which bypasses Turnstile. The lock follows the platform precedent in FocusApiary/form-intake-proxy (`src/auth.js`, `scripts/logicapp-access.sh`): an Entra policy instead of an IP allow-list, because a Linux Consumption app has no fixed egress IP.

- **Proxy (this repo).** `LOGICAPP_AUTH=managed-identity` makes every call to the trigger carry a token of the Function App's managed identity (audience `https://management.core.windows.net/`) and drop the URL's `sig`, because Logic Apps refuses a request that carries both. The default, `sas`, keeps today's behaviour. A token failure is treated like any failed delivery: the lead is queued and retried (#15). Deep health uses the same path and reads `auth_<reason>` when no token can be had. `AZURE_CLIENT_ID` selects a user-assigned identity if one is used.
- **Run history (this repo).** The trigger's outputs and the `Create_D365_Applicant_Lead` inputs and outputs are `secureData`, so run history no longer shows lead fields. It ships with the definition (#13).
- **Trigger policy (Azure).** `accessControl.triggers.openAuthenticationPolicies` holds one `AAD` policy with the claims `iss` = `https://sts.windows.net/<tenant>/`, `aud` = `https://management.core.windows.net/` and `oid` = the Function App identity's object id. Then `sasAuthenticationPolicy.state` = `Disabled`, so the URL alone no longer works. `intake-logicapp.sh` (#13) keeps the live `accessControl`, so it never undoes the lock.
- **Secrets.** With SAS disabled, `LOGICAPP_URL_APPLICATION` is no longer a credential. `TURNSTILE_SECRET_KEY` (and the Teams webhook, #14) become Key Vault references `@Microsoft.KeyVault(SecretUri=...)` resolved by the Function App identity.

Rollout order, so no step drops a lead:

1. Merge this change. Nothing changes while `LOGICAPP_AUTH` is unset.
2. Add the Entra policy to the trigger and keep SAS. Both kinds of call now work.
3. Set `LOGICAPP_AUTH=managed-identity`. Confirm `/api/health?deep=1` reads `ok`.
4. Disable SAS on the trigger. Confirm deep health is still `ok`, and that a GET on the bare callback URL is refused with 401.
5. Rotation runbook: there is no shared secret left for the trigger. To rotate `TURNSTILE_SECRET_KEY`, write the new value to Key Vault, then change any app setting or redeploy so the reference re-resolves (a plain restart did not refresh it in infrastructure#536). Then confirm the form still accepts a Turnstile token in the smoke job.

## Intake Logic App from git (#13)

`mtcottages-intake.definition.json` and `mtcottages-intake.parameters.json` are the source of truth for the Logic App `mtcottages/mtcottages-intake`. Nobody edits it in the portal. `infra/azure/intake-logicapp.sh` is the only deploy path:

| Job | When | What |
|---|---|---|
| `deploy:intake-logicapp` | protected `gh-pages` push that changes the definition, parameters, script or `.gitlab-ci.yml`, with `INTAKE_LOGICAPP_DEPLOY_ENABLED=true` | `deploy`: GET live, PUT the git definition and parameters, read back and fail unless live equals git. Keeps live `location`, `state`, `tags`, `identity`, `accessControl` and `integrationAccount`, so a deploy never re-opens a locked trigger or re-enables a disabled workflow. No-op when already equal. |
| `drift:intake-logicapp` | nightly pipeline schedule on `gh-pages` (or "Run pipeline"), with `INTAKE_LOGICAPP_DRIFT=true` | `drift`: fails when the live definition or parameters differ from git, and prints the action names that differ plus a bounded diff. |

Both run on the scoped `azure-deploy` runner as `sp-mtcottages-proxy-deploy` (certificate from `omlab-secrets`, mounted by the runner) and never print a token or the trigger callback URL. The comparison ignores key order and the empty `outputs` object ARM adds.

**Prerequisites (FocusApiary/infrastructure `terraform/environments/mtcottages-deploy-identity`, Admiral apply):**

- `Logic App Contributor` for `sp-mtcottages-proxy-deploy` on the workflow `mtcottages/mtcottages-intake` only (read for drift, write for deploy).
- `Microsoft.Web/connections/join/action` on the D365 connection bound in the parameters (today `tli_interest/dynamicscrmonline`; #18 replaces it), so the PUT may reference it. `Logic App Contributor` scoped to that one connection grants it.
- infra#822 keeps `mtcottages-intake` ("keep (on-demand endpoint, $0 idle)"); it is not in `logicapps/estate/retirements.json`.

Then set the project variables `INTAKE_LOGICAPP_DEPLOY_ENABLED=true` and `INTAKE_LOGICAPP_DRIFT=true` (protected), and create a nightly schedule on `gh-pages`.

The first deploy changes behaviour: live has 4 actions; git adds the `World Enterprise` business-unit and owner-team lookups. If either lookup finds nothing, the Logic App answers 503. Since #15 the proxy queues such a lead for redelivery instead of losing it.

## Cookieless analytics (#23)

The Function App also hosts the site's visit counter. The decision and the privacy rules are in `docs/marketing/analytics-adr.md`.

| Route | Auth | What it does |
|---|---|---|
| `POST /api/collect` | anonymous, Origin must be mtcottages.com, www.mtcottages.com or stay.mtcottages.com | Validates one beacon and stores it as a row in Table Storage in the host storage account (`mtcevents<yyyymm>`). 202 stored, 204 crawler dropped, 400 invalid, 429 throttled, 503 storage unavailable. |
| `GET /api/stats` | function key (`x-functions-key` header or `?code=`) | Staff dashboard; `?format=json`, `?days=N`. |
| timer `purge_analytics` | n/a | On the 2nd of each month, deletes event tables older than 13 months. |

It reuses `AzureWebJobsStorage` (key-based connection string, the same one deep health reads), so it adds no resource and no setting. `verify:analytics` (protected `gh-pages`, after `smoke:apply-proxy`) reads the dashboard with the default function key through the deploy identity and fails unless the smoke run's labelled form view and start are counted.

## Live deployment / runbook

The Function App `mtcottages-apply-proxy` (resource group `mtcottages`, Linux Consumption) is published by GitLab CI and by nothing else (WorldEnterpriseGroup/mtcottages#9). Nobody deploys it from a workstation: the hand-run `az functionapp deployment source config-zip` path is retired.

### Pipeline

A push to `gh-pages` that changes `infra/azure/apply-proxy/` or `.gitlab-ci.yml` runs these jobs. The first two also run on merge requests.

| Job | What it does |
|---|---|
| `test:apply-proxy` | Compiles `function_app.py` and runs the unit tests in `apply-proxy/tests`. |
| `package:apply-proxy` | Builds `apply-proxy.zip` with `function_app.py`, `host.json`, `requirements.txt`, `index.html` and `BUILD_COMMIT` (the commit SHA) at the archive root. |
| `deploy:apply-proxy` | Publishes the zip with the launch-sequence `.deploy:azure-function` template (Kudu remote build), then waits for `https://stay.mtcottages.com/api/health` to return HTTP 200. |
| `smoke:apply-proxy` | Runs the stay tests in `e2e/tests/live.spec.js` against the live host. It waits for `/api/health` to report the published commit, loads the form and posts one honeypot probe that the proxy rejects with HTTP 400. Under Xvfb, a headed Chromium also gets a token from the production widget and posts it with an incomplete inquiry. The test passes only on `stage: validation`, which proves the token passed siteverify (#85). If Cloudflare issues the CI browser no token, the result is reported as inconclusive, while a widget configuration error (`110xxx`/`400xxx`) fails the test. It never submits a valid application. |

`/api/health` returns `{"status": "ok", "service": "mtcottages-apply-proxy", "commit": "<sha>"}`. `commit` is the `BUILD_COMMIT` from the package; a package not built by the pipeline reports `unknown`. This plain answer is constant and makes no outbound call: the Front Door origin probe and the deploy gate use it.

### Deep health (#16)

`GET /api/health?deep=1` follows the platform's `upstream-health` contract (FocusApiary/infrastructure `docs/runbooks/intake-synthetic-checks.md`). It answers 200 when every check passes and 503 with `"status": "degraded"` otherwise, and caches its result for 30 seconds:

- `upstream.LOGICAPP_URL_APPLICATION`: a GET on the trigger, with no payload, so no workflow runs. `ok` means Logic Apps refused the method (400 `TriggerRequestMethodNotValid`), which proves that the URL, signature and caller IP are accepted. `status_401_AuthorizationFailed` means a rotated key or a caller-IP restriction. `status_404` means the workflow or trigger is gone. `unreachable_*` means a network failure, and `not_configured` means the setting is missing.
- `queues`: the approximate depth of `intake-retry` (informational) and of the two poison queues. Any message in `intake-retry-poison` or `intake-notify-poison` fails the check: a lead or a notification has run out of retries and needs staff (below). It reads the depth with the host storage connection string. If that setting is not key-based, the depths read `unknown` and do not fail the check.
- `notify`: how each channel is sent, `graph`, `acs`, `on` or `off` (#93). When both `staff-email` and `teams` are `off`, an accepted inquiry becomes a lead that no person is told about, so the check fails.
- `turnstile`: `ok`, `not_configured`, or `test_key`. `test_key` means the site key or the secret is a Cloudflare test key, so no real guest token can verify. Either failure label fails the check (#85).
- `inquiries`: what real guests got from `POST /api/apply` in the last 3 hours (#85), from `intake_outcomes.py`. `guest_refused` or `guest_queued` fails the check: at least one guest was refused (non-2xx) or only queued (202: the Logic App or Dynamics 365 behind it did not take the lead), and no guest's lead was delivered (200). That is how #85 went unseen for weeks while every liveness check stayed green. The detail holds `guest_delivered`, `guest_queued`, `guest_refused` and the top refusals as `status:stage:reason` labels. One guest who fixes a typo and sends again is fine. `unknown_<reason>` means the outcome table could not be read and does not fail the check.

  The Function writes one row per guest answer to the monthly Table Storage table `mtcintake<YYYYMM>` in the host storage account: the HTTP status and the stage and reason labels, never a field value, IP address, user agent or submission id. `purge_analytics` keeps 3 months. A guest is a browser user agent (`Mozilla`, not a bot or headless browser) posting with `Origin: https://stay.mtcottages.com`. Canary requests, blackbox probes (no browser user agent, no Origin) and webdriver-driven browsers (the form sends `X-Automated-Browser: 1` when `navigator.webdriver` is set, which covers the Playwright smoke) are never counted. Every refused guest also logs `Guest inquiry refused: <status> <stage> <reason>` to Application Insights.

The body holds labels and counts only, never a URL, key or lead field. The hourly in-cluster blackbox probe (`check=upstream-health`, FocusApiary/monitoring-k8s) is what turns a 503 into an alert.

**Recovering a poisoned message.** Do not copy lead data into a ticket or chat. In the Storage account's `intake-retry-poison` queue, fix the cause (look up the reason in the Function logs by `submissionId`), then move the message back to `intake-retry`, where `redeliver_intake` sends it again with the same `submissionId`. For `intake-notify-poison`, move it back to `intake-notify`. A poison message expires 7 days after it lands there, so recovery has to happen within that window.

### Lost-inquiry count (#12)

`count:intake-loss` (`infra/azure/intake-loss-count.sh`) is read-only and prints aggregates only. It covers:
- `POST /api/apply` attempts on `stay.mtcottages.com` per day, client and HTTP status, from the Front Door access log in `TLIMainAnalytics`, with the workspace's retention and earliest record so the covered window is explicit. `guest-browser` is a non-headless browser whose referrer is the form host and whose client loaded the form at least `INTAKE_LOSS_MIN_DWELL_SECONDS` (default 20) seconds before posting. A browser-looking POST sooner than that, or with no page load in the hour before, is `bot-shaped`: form bots load the page and post within 0-7 s, send no visit beacon and skip the form's `/api/health` warm-up, and every "lost guest" first counted on #85 was one of them. Everything else (the platform's hourly synthetic probe, CI smoke, the canary) is `automation`. The guest-browser total is the number that says whether guests get through;
- for the last 24 hours on the whole host, requests and 502/503/504 counts per path and Front Door origin, with the status and `ErrorInfo` labels seen (#85: a guest who gets a 502 on the form page never reaches `/api/apply`);
- the `mtcottages-intake` runs per day and status.

The stay form guards against gateway errors: before it sends, it makes a throwaway `GET /api/health` so the idle origin's first 502 lands there and not on the inquiry. It also resends a 502/503/504 or a dropped connection up to twice, with the same `submissionId`. The form page's own first load can still get a 502; only an origin-side fix removes that.

The access log does not match its documented columns: `requestUri_s` carries the port (`https://stay.mtcottages.com:443/api/apply`) and the status sits in `httpStatusCode_d` while `httpStatusCode_s` is empty. The job parses host and path out of the URI and reads whichever status column holds a value. It fails, rather than printing a silent zero, when the host has no records or any record has no readable status (#85).

Run it with "Run pipeline" on `gh-pages` and `INTAKE_LOSS_COUNT=true`; add `INTAKE_LOSS_SINCE` to change the default window start of `2026-07-01`. A manual pipeline also republishes the current proxy commit, which is harmless.

The runner's certificate SP needs Log Analytics Reader on the workspace (or resource-context Reader on the Front Door profile) and Logic App Operator on the workflow (note_379524 on #12). Without a role, the job names the one it is missing and fails. Post only the aggregates on #12.

### End-to-end canary (#16)

The scheduled `canary:intake` job (`infra/azure/intake-canary.sh`) sends one synthetic inquiry through the real path: Front Door, the proxy, the Logic App and Dynamics 365. It passes only when all three hold:

1. The proxy answers 200, meaning the Logic App created the lead. A 202 means the lead was queued instead, so the job fails.
2. The Logic App run for that submission succeeded. The job finds the run by `clientTrackingId`, which the proxy sets to the `submissionId` for every inquiry, not only canaries.
3. `Delete_Canary_D365_Lead` succeeded in that run, so the canary leaves no lead behind.

The canary is never a real application:

- The proxy treats a request as a canary only when its `X-Intake-Canary` header matches `CANARY_TOKEN` (constant-time comparison, at least 32 characters). Only such a request skips Turnstile.
- The proxy then replaces the name, phone, message and email with fixed synthetic values (`CANARY_LEAD_FIELDS` and `CANARY_GUEST_EMAIL`), whatever was sent.
- On the proxy's `X-Intake-Canary-Run: 1` header, the Logic App's `Route_Canary` branch takes over (#84). It still runs the business-unit and owner-team lookups, then creates a `[canary]` lead (Cold, do-not-contact) **without** binding it to the sales team, deletes it, and only then answers 201. If the create or delete fails, the run answers 500 and ends `Failed` (`IntakeCanaryFailed`), so both the canary job and the `RunsFailed` alert fire. The canary never reaches `Create_D365_Applicant_Lead`, the sales queue or a real guest path. Until #18 gives the Logic App its own application user, the canary lead briefly belongs to the Dynamics connection's identity.

Its staff email, Teams card and guest acknowledgment carry a `[canary]` prefix and the note "No action is needed". The guest acknowledgment goes to the canary mailbox, which is the evidence for #14.

Turning it on, in this order:

1. **Infra (FocusApiary/infrastructure):**
   - Create the secret `mtcottages-intake-canary-token` (random, 48 characters or more) in `omlab-secrets`.
   - Grant the runner's certificate SP Key Vault Secrets User on it.
   - Grant the same SP Logic App Operator on `mtcottages/mtcottages-intake`.
   - Grant the Function App's identity read access to the secret.
2. **App settings:**
   - `CANARY_TOKEN` as a Key Vault reference to that secret.
   - `CANARY_GUEST_EMAIL` set to a mailbox we own, for example a `stay@` alias. It is not a secret.

   Canary mode stays off while either one is missing.
3. **Logic App:** deploy the definition with `Route_Canary` (#13), before the first canary runs.
4. **Schedule:** set the CI variable `INTAKE_CANARY_ENABLED=true` on a `gh-pages` pipeline schedule. Every 15 minutes, together with the Logic App `RunsFailed` alert evaluated over 15 minutes, meets the "breaking the Logic App fires an alert within 15 minutes" bar. Use "Run pipeline" on `gh-pages` with the same variable for a one-off check.

**Paging (#84).** A failed canary also posts an Adaptive Card ("Stay inquiry intake is failing", the failed step and the pipeline link) to the Teams intake channel. The job reads the Teams Workflows webhook URL from `omlab-secrets` by the name in the CI variable `INTAKE_CANARY_PAGE_SECRET_NAME` (set it to the secret behind the Function's `TEAMS_INTAKE_WEBHOOK_URL` reference; unset, the job logs "PAGE: not configured"), so the runner SP needs Key Vault Secrets User on that secret too. It keeps the URL in a 0600 curl config file, never in argv or the log. If the secret cannot be read, the job says so and stays red; a paging problem never hides the canary failure.

The canary skips Turnstile, so it cannot see a guest-only failure like #85. The real-browser `smoke:apply-proxy` Turnstile check and the stage-labelled 400s cover that path.

When a canary fails, the job log names the step that failed and the `submissionId`. Look up that run in the Logic App run history by its client tracking id. If cleanup failed, delete the `Intake Canary` lead in Dynamics by hand.

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
