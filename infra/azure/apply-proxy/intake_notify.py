"""Staff alerts and the guest acknowledgment for accepted inquiries (#14).

The HTTP function never sends mail itself. When it accepts an inquiry it puts
one small envelope per configured channel on the `intake-notify` queue, and the
queue-triggered sender delivers each one independently:

- ``staff-email``: an alert to the staff mailbox (Azure Communication Services
  Email), with Reply-To set to the guest so staff can answer in one click;
- ``teams``: an Adaptive Card posted to the Mt Cottages channel through a
  Teams Workflows webhook;
- ``guest-email``: a short branded acknowledgment with next steps and the
  response-time promise.

A failed channel raises, so the runtime retries that channel alone and moves it
to ``intake-notify-poison`` after the last attempt. A notification can never
fail or delay the inquiry itself.

Configuration (application settings; no value is ever logged):

- ``ACS_EMAIL_ENDPOINT``: ``https://<resource>.communication.azure.com``. The
  Function App's managed identity authenticates; no access key is used.
- ``NOTIFY_SENDER_ADDRESS``: the verified ACS sender, e.g. ``stay@mtcottages.com``.
- ``NOTIFY_REPLY_TO``: where guest replies go (default ``stay@mtcottages.com``).
- ``STAFF_ALERT_RECIPIENTS``: comma-separated staff addresses.
- ``TEAMS_INTAKE_WEBHOOK_URL``: a Key Vault reference; the URL is a credential.
- ``GUEST_AUTOREPLY_ENABLED``: ``true`` sends the guest acknowledgment.
- ``GUEST_RESPONSE_PROMISE``: default ``within 2 business hours`` (owner decision D6).

A channel whose settings are missing is skipped when the inquiry is accepted,
so nothing waits on a queue for configuration that does not exist yet.
"""

import email.utils
import html
import json
import logging
import os
import re
import urllib.error
import urllib.parse
import urllib.request
import uuid
from datetime import datetime, timezone

import managed_identity

logger = logging.getLogger(__name__)

NOTIFY_QUEUE = "intake-notify"
NOTIFY_ENVELOPE_VERSION = 1
CHANNEL_STAFF_EMAIL = "staff-email"
CHANNEL_TEAMS = "teams"
CHANNEL_GUEST_EMAIL = "guest-email"
CHANNELS = (CHANNEL_STAFF_EMAIL, CHANNEL_TEAMS, CHANNEL_GUEST_EMAIL)

ACS_EMAIL_API_VERSION = "2023-03-31"
ACS_TOKEN_RESOURCE = "https://communication.azure.com"
DEFAULT_REPLY_TO = "stay@mtcottages.com"
DEFAULT_RESPONSE_PROMISE = "within 2 business hours"
SEND_TIMEOUT_SECONDS = 15
MAX_RESPONSE_BYTES = 64 * 1_024
MAX_RECIPIENTS = 10
ADDRESS_PATTERN = re.compile(r"[^\s@<>,;\"]+@[^\s@<>,;\"]+\.[^\s@<>,;\"]+")
# Idempotent per (submission, channel): a retried ACS send with the same
# repeatability id is accepted once.
REPEATABILITY_NAMESPACE = uuid.UUID("7c1e5d0a-3b9f-4f0e-9a51-6d2c8b4e1f37")
SITE_URL = "https://mtcottages.com/"
BRAND_RIVER_BLUE = "#1f4e6b"
BRAND_SLATE_INK = "#24323d"
BRAND_LIMESTONE = "#f7f3ea"

# Labels for the facts staff and guests see, in display order.
STAFF_FACTS = (
    ("Name", None),
    ("Phone", "phone"),
    ("Email", "email"),
    ("Stay type", "stayType"),
    ("Where", "preferredLocation"),
    ("Home", "propertyId"),
    ("Home size", "homeSize"),
    ("Move-in", "moveInDate"),
    ("Length of stay", "duration"),
    ("Occupants", "occupants"),
    ("Pets", "pets"),
    ("Budget", "monthlyBudget"),
    ("Employment", "employment"),
    ("Furnishing needs", "furnishedNeeds"),
)
GUEST_FACTS = (
    ("Move-in", "moveInDate"),
    ("Length of stay", "duration"),
    ("Where", "preferredLocation"),
    ("Home", "propertyId"),
    ("Home size", "homeSize"),
)
HOME_NAMES = {
    "frederick": "Frederick Cottage",
    "broad": "Broad Cottage",
    "oak": "Oak Cottage",
    "buck": "Buck Cottage",
    "henrietta": "Henrietta Cottage",
    "virginia": "Virginia Cottage",
}


class NotificationError(RuntimeError):
    """A channel could not be delivered. The message stays queued for a retry."""


class NotificationConfigError(NotificationError):
    """A channel was queued but its settings are now missing."""


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

def _setting(name, default=""):
    return os.environ.get(name, default).strip()


def _addresses(value):
    addresses = []
    for candidate in value.split(","):
        candidate = candidate.strip()
        if candidate and ADDRESS_PATTERN.fullmatch(candidate) and candidate not in addresses:
            addresses.append(candidate)
    return addresses[:MAX_RECIPIENTS]


def _acs_endpoint():
    value = _setting("ACS_EMAIL_ENDPOINT").rstrip("/")
    try:
        parsed = urllib.parse.urlsplit(value)
    except ValueError:
        return ""
    if parsed.scheme != "https" or not parsed.hostname or not parsed.hostname.endswith(".communication.azure.com"):
        return ""
    if parsed.path or parsed.query or parsed.fragment or parsed.username or parsed.password:
        return ""
    return value


def _sender_address():
    value = _setting("NOTIFY_SENDER_ADDRESS")
    return value if ADDRESS_PATTERN.fullmatch(value) else ""


def _reply_to_address():
    value = _setting("NOTIFY_REPLY_TO", DEFAULT_REPLY_TO)
    return value if ADDRESS_PATTERN.fullmatch(value) else DEFAULT_REPLY_TO


def _staff_recipients():
    return _addresses(_setting("STAFF_ALERT_RECIPIENTS"))


def _teams_webhook_url():
    value = _setting("TEAMS_INTAKE_WEBHOOK_URL")
    try:
        parsed = urllib.parse.urlsplit(value)
    except ValueError:
        return ""
    return value if parsed.scheme == "https" and parsed.hostname else ""


def _guest_autoreply_enabled():
    return _setting("GUEST_AUTOREPLY_ENABLED").lower() == "true"


def response_promise():
    value = " ".join(_setting("GUEST_RESPONSE_PROMISE", DEFAULT_RESPONSE_PROMISE).split())
    return value[:80] if value else DEFAULT_RESPONSE_PROMISE


def _email_configured():
    return bool(_acs_endpoint() and _sender_address())


def configured_channels():
    """The channels whose settings are complete, in delivery order."""
    channels = []
    if _email_configured() and _staff_recipients():
        channels.append(CHANNEL_STAFF_EMAIL)
    if _teams_webhook_url():
        channels.append(CHANNEL_TEAMS)
    if _email_configured() and _guest_autoreply_enabled():
        channels.append(CHANNEL_GUEST_EMAIL)
    return channels


# ---------------------------------------------------------------------------
# Envelopes
# ---------------------------------------------------------------------------

def notification_envelopes(submission_id, lead, delivery):
    """One queue message per configured channel. ``delivery`` is ``delivered`` or ``queued``."""
    queued_at = email.utils.format_datetime(datetime.now(timezone.utc), usegmt=True)
    return [
        json.dumps({
            "version": NOTIFY_ENVELOPE_VERSION,
            "channel": channel,
            "submissionId": submission_id,
            "delivery": delivery,
            "queuedAt": queued_at,
            "lead": lead,
        })
        for channel in configured_channels()
    ]


def parse_envelope(body):
    try:
        envelope = json.loads(body.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise ValueError("intake-notify message is not JSON") from error
    if not isinstance(envelope, dict) or envelope.get("version") != NOTIFY_ENVELOPE_VERSION:
        raise ValueError("intake-notify message has an unknown envelope version")
    if envelope.get("channel") not in CHANNELS:
        raise ValueError("intake-notify message names an unknown channel")
    if not isinstance(envelope.get("lead"), dict) or not isinstance(envelope.get("submissionId"), str):
        raise ValueError("intake-notify message has no lead")
    lead = {key: value for key, value in envelope["lead"].items() if isinstance(key, str) and isinstance(value, str)}
    envelope["lead"] = lead
    if not isinstance(envelope.get("queuedAt"), str):
        envelope["queuedAt"] = email.utils.format_datetime(datetime.now(timezone.utc), usegmt=True)
    return envelope


# ---------------------------------------------------------------------------
# Content
# ---------------------------------------------------------------------------

def _one_line(value, limit):
    return " ".join(str(value).split())[:limit]


def _home_name(property_id):
    key = _one_line(property_id, 64).lower()
    return HOME_NAMES.get(key, "")


def _fact_value(lead, field):
    if field == "propertyId":
        return _home_name(lead.get("propertyId", ""))
    return _one_line(lead.get(field, ""), 300)


def _full_name(lead):
    return _one_line(f"{lead.get('firstName', '')} {lead.get('lastName', '')}", 120) or "A guest"


def _staff_facts(lead):
    facts = []
    for label, field in STAFF_FACTS:
        value = _full_name(lead) if field is None else _fact_value(lead, field)
        if value:
            facts.append((label, value))
    return facts


def _guest_facts(lead):
    return [(label, value) for label, field in GUEST_FACTS if (value := _fact_value(lead, field))]


def _guest_greeting_name(lead):
    """The first name, only when it looks like one; never echo links or addresses to an unverified inbox."""
    name = _one_line(lead.get("firstName", ""), 40)
    if not name or re.search(r"[@/:<>]|www\.|https?", name, re.IGNORECASE):
        return ""
    return name


def _delivery_note(delivery):
    if delivery == "queued":
        return "CRM delivery is retrying automatically; the lead may reach Dynamics a few minutes late."
    return "The lead is in Dynamics 365."


def _html_table(facts):
    rows = "".join(
        f'<tr><th align="left" style="padding:4px 12px 4px 0;color:{BRAND_SLATE_INK};font-weight:600;'
        f'vertical-align:top">{html.escape(label)}</th>'
        f'<td style="padding:4px 0;color:{BRAND_SLATE_INK}">{html.escape(value)}</td></tr>'
        for label, value in facts
    )
    return f'<table role="presentation" cellspacing="0" cellpadding="0" style="border-collapse:collapse">{rows}</table>'


def _html_page(title, inner):
    return (
        '<!doctype html><html lang="en"><head><meta charset="utf-8">'
        f'<title>{html.escape(title)}</title></head>'
        f'<body style="margin:0;padding:24px;background:{BRAND_LIMESTONE};'
        f'font-family:Georgia,\'Times New Roman\',serif;color:{BRAND_SLATE_INK};line-height:1.5">'
        '<div style="max-width:560px;margin:0 auto;background:#ffffff;padding:24px;border-radius:6px">'
        f'{inner}</div></body></html>'
    )


def staff_email(envelope):
    lead = envelope["lead"]
    name = _full_name(lead)
    where = _home_name(lead.get("propertyId", "")) or _one_line(lead.get("preferredLocation", ""), 64)
    move_in = _one_line(lead.get("moveInDate", ""), 10)
    subject = _one_line(f"New stay inquiry: {name}, {where}, move-in {move_in}", 200)
    facts = _staff_facts(lead)
    message = str(lead.get("message", "")).strip()[:4000]
    note = _delivery_note(envelope.get("delivery"))
    reference = envelope["submissionId"]

    text_lines = [
        "A new stay inquiry arrived. The SOP asks for contact within 1 minute.",
        "",
        *[f"{label}: {value}" for label, value in facts],
        "",
        "Message:",
        message or "(none)",
        "",
        note,
        "Reply to this email to answer the guest directly.",
        f"Reference: {reference}",
    ]
    message_html = html.escape(message or "(none)").replace("\n", "<br>")
    inner = (
        f'<h1 style="font-size:20px;margin:0 0 8px;color:{BRAND_RIVER_BLUE}">New stay inquiry</h1>'
        '<p style="margin:0 0 16px">The SOP asks for contact within 1 minute. '
        'Reply to this email to answer the guest directly.</p>'
        f'{_html_table(facts)}'
        f'<h2 style="font-size:16px;margin:16px 0 4px;color:{BRAND_RIVER_BLUE}">Message</h2>'
        f'<p style="margin:0 0 16px">{message_html}</p>'
        f'<p style="margin:0;font-size:13px;color:#56636d">{html.escape(note)} '
        f'Reference {html.escape(reference)}.</p>'
    )
    return subject, "\n".join(text_lines), _html_page(subject, inner)


def guest_email(envelope):
    lead = envelope["lead"]
    name = _guest_greeting_name(lead)
    promise = response_promise()
    subject = f"We have your inquiry, {name}" if name else "We have your inquiry"
    greeting = f"Hi {name}," if name else "Hello,"
    facts = _guest_facts(lead)
    steps = (
        "We check availability for your dates and the home size you asked about.",
        "We reply with the homes that fit, the monthly price and what is included.",
        "If one suits you, we set up a video walkthrough or a visit and send the lease terms.",
    )
    text_lines = [
        greeting,
        "",
        "Thank you for asking about a furnished home with Mt Cottages. Your inquiry reached our "
        f"local team, and one of us will be in touch {promise} by phone or email.",
        "",
        "What happens next",
        *[f"{index}. {step}" for index, step in enumerate(steps, start=1)],
        "",
    ]
    if facts:
        text_lines += ["What you sent us", *[f"{label}: {value}" for label, value in facts], ""]
    text_lines += [
        "If anything changes, reply to this email. It comes straight to us.",
        "",
        "Mt Cottages",
        "Furnished homes in Marietta, Parkersburg and Ravenswood",
        SITE_URL,
        "",
        "You are receiving this one-time confirmation because this address was entered on our inquiry form.",
    ]
    steps_html = "".join(f'<li style="margin:0 0 4px">{html.escape(step)}</li>' for step in steps)
    facts_html = (
        f'<h2 style="font-size:16px;margin:16px 0 4px;color:{BRAND_RIVER_BLUE}">What you sent us</h2>'
        f'{_html_table(facts)}'
        if facts else ""
    )
    inner = (
        f'<p style="margin:0 0 12px">{html.escape(greeting)}</p>'
        '<p style="margin:0 0 12px">Thank you for asking about a furnished home with Mt Cottages. '
        f'Your inquiry reached our local team, and one of us will be in touch {html.escape(promise)} '
        'by phone or email.</p>'
        f'<h2 style="font-size:16px;margin:16px 0 4px;color:{BRAND_RIVER_BLUE}">What happens next</h2>'
        f'<ol style="margin:0 0 12px;padding-left:20px">{steps_html}</ol>'
        f'{facts_html}'
        '<p style="margin:16px 0 12px">If anything changes, reply to this email. It comes straight to us.</p>'
        f'<p style="margin:0;color:{BRAND_RIVER_BLUE}"><strong>Mt Cottages</strong><br>'
        'Furnished homes in Marietta, Parkersburg and Ravenswood<br>'
        f'<a href="{SITE_URL}" style="color:{BRAND_RIVER_BLUE}">mtcottages.com</a></p>'
        '<p style="margin:16px 0 0;font-size:12px;color:#56636d">You are receiving this one-time '
        'confirmation because this address was entered on our inquiry form.</p>'
    )
    return subject, "\n".join(text_lines), _html_page(subject, inner)


def teams_card(envelope):
    lead = envelope["lead"]
    facts = [{"title": label, "value": value} for label, value in _staff_facts(lead)]
    message = str(lead.get("message", "")).strip()[:1000]
    body = [
        {"type": "TextBlock", "size": "Large", "weight": "Bolder", "wrap": True,
         "text": f"New stay inquiry: {_full_name(lead)}"},
        {"type": "TextBlock", "wrap": True, "isSubtle": True,
         "text": "Contact within 1 minute. " + _delivery_note(envelope.get("delivery"))},
        {"type": "FactSet", "facts": facts},
    ]
    if message:
        body.append({"type": "TextBlock", "wrap": True, "text": message})
    body.append({"type": "TextBlock", "wrap": True, "isSubtle": True, "size": "Small",
                 "text": f"Reference {envelope['submissionId']}"})
    actions = []
    email_address = _one_line(lead.get("email", ""), 254)
    if ADDRESS_PATTERN.fullmatch(email_address):
        actions.append({"type": "Action.OpenUrl", "title": "Email the guest",
                        "url": f"mailto:{urllib.parse.quote(email_address, safe='@.+-_')}"})
    phone = re.sub(r"[^0-9+]", "", lead.get("phone", ""))[:20]
    if len(phone) >= 7:
        actions.append({"type": "Action.OpenUrl", "title": "Call the guest", "url": f"tel:{phone}"})
    card = {
        "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
        "type": "AdaptiveCard",
        "version": "1.4",
        "body": body,
    }
    if actions:
        card["actions"] = actions
    return {
        "type": "message",
        "attachments": [{"contentType": "application/vnd.microsoft.card.adaptive", "content": card}],
    }


# ---------------------------------------------------------------------------
# Transport
# ---------------------------------------------------------------------------

def _post_json(url, payload, headers, label):
    request = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", "Accept": "application/json", **headers},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=SEND_TIMEOUT_SECONDS) as response:
            response.read(MAX_RESPONSE_BYTES)
            status = response.status
    except urllib.error.HTTPError as error:
        error.close()
        raise NotificationError(f"{label} answered HTTP {error.code}") from None
    except TimeoutError:
        raise NotificationError(f"{label} timed out") from None
    except urllib.error.URLError as error:
        reason = "timed out" if isinstance(error.reason, TimeoutError) else "connection failed"
        raise NotificationError(f"{label} {reason}") from None
    except (OSError, ValueError) as error:
        raise NotificationError(f"{label} failed: {type(error).__name__}") from None
    if not 200 <= status < 300:
        raise NotificationError(f"{label} answered HTTP {status}")
    return status


def _managed_identity_token():
    """A bearer token for ACS from the Function App's managed identity."""
    try:
        return managed_identity.get_token(ACS_TOKEN_RESOURCE)
    except managed_identity.ManagedIdentityError as error:
        if error.reason == "identity_endpoint_missing":
            raise NotificationConfigError("managed identity is not available to the Function App") from None
        raise NotificationError(f"managed identity token failed: {error.reason}") from None


def _send_email(envelope, recipients, subject, text, markup, reply_to):
    endpoint = _acs_endpoint()
    sender = _sender_address()
    if not endpoint or not sender:
        raise NotificationConfigError("ACS email settings are missing")
    token = _managed_identity_token()
    repeatability_id = uuid.uuid5(REPEATABILITY_NAMESPACE, f"{envelope['submissionId']}/{envelope['channel']}")
    payload = {
        "senderAddress": sender,
        "content": {"subject": subject, "plainText": text, "html": markup},
        "recipients": {"to": [{"address": address} for address in recipients]},
        "replyTo": [{"address": reply_to}],
        "userEngagementTrackingDisabled": True,
    }
    url = f"{endpoint}/emails:send?api-version={ACS_EMAIL_API_VERSION}"
    headers = {
        "Authorization": f"Bearer {token}",
        "repeatability-request-id": str(repeatability_id),
        "repeatability-first-sent": envelope["queuedAt"],
    }
    _post_json(url, payload, headers, "ACS email")


def send(envelope):
    """Deliver one channel. Raises NotificationError so the runtime retries it."""
    channel = envelope["channel"]
    lead = envelope["lead"]
    if channel == CHANNEL_STAFF_EMAIL:
        recipients = _staff_recipients()
        if not recipients:
            raise NotificationConfigError("STAFF_ALERT_RECIPIENTS is empty")
        guest_address = _one_line(lead.get("email", ""), 254)
        reply_to = guest_address if ADDRESS_PATTERN.fullmatch(guest_address) else _reply_to_address()
        subject, text, markup = staff_email(envelope)
        _send_email(envelope, recipients, subject, text, markup, reply_to)
    elif channel == CHANNEL_GUEST_EMAIL:
        guest_address = _one_line(lead.get("email", ""), 254)
        if not ADDRESS_PATTERN.fullmatch(guest_address):
            # Validation already required an address; a message without one
            # cannot become deliverable by retrying.
            logger.warning("Guest acknowledgment skipped for %s: no usable address", envelope["submissionId"])
            return
        subject, text, markup = guest_email(envelope)
        _send_email(envelope, [guest_address], subject, text, markup, _reply_to_address())
    elif channel == CHANNEL_TEAMS:
        url = _teams_webhook_url()
        if not url:
            raise NotificationConfigError("TEAMS_INTAKE_WEBHOOK_URL is missing")
        _post_json(url, teams_card(envelope), {}, "Teams webhook")
    else:
        raise ValueError(f"unknown channel {channel}")
