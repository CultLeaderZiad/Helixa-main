# Phase 4 channels

WhatsApp, TikTok, and the website widget sit on the phase 3 adapter pipeline.
Migrations are files only. Nothing in this change was applied to a live database,
and none of the live Meta or TikTok calls were exercised.

## WhatsApp Cloud API

Connect from Connected Platforms, per workspace. Each phone number is its own
`platform_connections` row (`page_id` is the phone number id). A human reply
loads `conversations.channel_account_id` and sends through that number. If a
workspace has several numbers and the conversation has no account id, the send
returns 409 instead of using the first row.

Embedded Signup uses `FB.login` with `config_id` = `NEXT_PUBLIC_WHATSAPP_CONFIG_ID`,
`response_type: code`, `override_default_response_type: true`, and
`extras.sessionInfoVersion: 3`. The finish postMessage supplies
`phone_number_id` and `waba_id`. The server exchanges the code at
`GET /oauth/access_token` with the app id and secret and no `redirect_uri`.

Manual fallback: phone number id + system-user token + optional WABA id. The
number must already be registered in WhatsApp Manager. This app does not call
`/{phone-number-id}/register`.

Approved templates sync from `GET /{waba-id}/message_templates` and send with
`type: template`. That send is the one that works after the 24-hour window.
Interactive replies: up to 3 buttons; more than 3 become a list (max 10 rows).
Media types are image, video, audio, and document. Audio has no caption.

Webhook: `{APP_URL}/api/whatsapp/webhook`. Subscribe the `messages` field.

## TikTok Business Messaging

Official references used while building this (2026-09-30):

- Access: https://business-api.tiktok.com/portal/docs/access-to-business-messaging-api/v1.3
- Authorize: https://business-api.tiktok.com/portal/docs/authentication-oauth-for-tiktok-account-holders/v1.3
- Send: https://business-api.tiktok.com/portal/docs/send-a-message-to-a-conversation/v1.3
- Webhook verification: https://developers.tiktok.com/doc/webhooks-verification

The Business API portal is a JavaScript app. Field tables below come from those
official pages (search highlights and the pages that rendered). They were not
confirmed against a live webhook delivery.

### Scopes to request

`user.info.basic`, `user.info.username`, `user.info.profile`, `user.account.type`,
`message.list.read`, `message.list.send`, `message.list.manage`.

`message.list.read` is also required for auto-message webhooks. Do not request
`video.publish`. This app does not post videos.

### Approvals the owner must apply for

1. Business Messaging API access for the developer app.
2. TikTok's data-security and privacy review.
3. For US Business Accounts, the US data-security review and the USDS addendum.

Until that approval lands, leave `TIKTOK_MESSAGING_ENABLED` unset. OAuth can
succeed and messaging calls can still fail. With the flag off, connect, send,
and webhook processing stay closed. The webhook answers 200 and does not store
the event, so those deliveries are not replayed later.

The Business Account must allow direct messages from everyone, or the owner
must accept message requests, before webhooks fire.

### What the API does not support

- A DM for an arbitrary comment. Comment-to-Message only runs for
  `im_receive_high_intent_comment`, after
  `POST /business/message/direct_reply/update/` with
  `direct_reply_type: COMMENT_TO_MESSAGE`. The Business Account must be
  registered in Vietnam, Indonesia, or Thailand, and the commenter must be in
  APAC, LATAM, or METAP. MENA and GCC businesses outside those registration
  countries cannot use it. The switch is `TIKTOK_COMMENT_TO_DM_ENABLED=true`
  and still requires the messaging flag.
- Keyword automations on incoming DMs (`im_receive_msg` / `im_receive_msg_eu`)
  are the path that is not limited to those countries. They still need the
  messaging approval and `TIKTOK_MESSAGING_ENABLED=true`.
- Public comment replies (`/business/comment/reply/create/`) are a different
  Organic API and are not implemented.
- Free-form buttons, lists, and URL media. Images need
  `/business/message/media/upload/` and a `media_id`. That upload is not
  implemented. QA cards are pre-audited templates, not free-form buttons.
- A Human Agent tag. The window enforced here is 48 hours. TikTok may also
  reject further sends inside that window; this app does not keep a separate
  10-message counter.

Access tokens last about a day. `GET /api/cron/refresh-tiktok-tokens` refreshes
them. The refresh token is sealed in `platform_connections.refresh_token`.

Webhook signature: header `TikTok-Signature: t=<unix>,s=<hex>`, HMAC-SHA256 of
`${t}.${rawBody}` with the client secret, rejected when `t` is more than 5
minutes off. That is the scheme at developers.tiktok.com/doc/webhooks-verification.
The Business Messaging guide points at webhook verification. It was not checked
against a live TikTok delivery.

## Website chat

Each workspace copies:

```html
<script src="{NEXT_PUBLIC_APP_URL}/widget.js" data-helixa-key="wk_..." async></script>
```

`data-dir="rtl"` forces RTL. Otherwise the bubble follows `dir` or an `ar`/`fa`/`he`/`ur` lang on the page, and a locale of `ar` from the widget settings.

The visitor id and secret live in `localStorage`. The server stores only
`sha256(secret)`. Requests must present the secret. Knowing another visitor id
is not enough, and the messages route loads one conversation for that visitor.

Visitors poll `POST /api/webchat/messages`. They do not subscribe to Supabase
Realtime. An anon realtime policy on `messages` could show other visitors.
Agents keep the existing inbox realtime subscription.

An empty allowed-domain list denies every origin. `*.example.com` matches that
host and its subdomains. Sends are limited to 20 per minute per visitor. Polls
use a separate 120-per-minute bucket.

Automations and AI use the `webchat` adapter. Deliveries are rows in
`messages`, which is what the poll returns and what the unified inbox shows.
