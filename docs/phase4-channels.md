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

Official references checked against TikTok's doc gateway on 2026-09-30:

- Access (doc 1832184145137922): DMs are not available for Business Accounts
  signed up in the EEA, Switzerland, or the UK. The US also needs a US data
  security review and the USDS addendum. Egypt, the GCC, and the rest of
  METAP are allowed after the data security and privacy review.
- Send (doc 1832184403754242): up to 10 messages in the 48 hours after each
  user message. A later user message starts a new window and another 10.
  Comment-to-Message (`direct_reply.reply_type: COMMENT_REPLY`) is only for
  accounts registered in Vietnam, Indonesia, or Thailand.
- Comments (doc 1760232109619202 and comment.update doc 1810515104773122):
  `comment.list` is required. New comments arrive as `comment.update`.
- Public reply: `POST /business/comment/reply/create/` with
  `business_id`, `video_id`, `comment_id`, and `text` (up to 1200 characters
  as of the 7 Aug 2026 What's New note).
- Webhook verification: https://developers.tiktok.com/doc/webhooks-verification

Nothing here was confirmed with a live TikTok delivery.

### Scopes to request

`user.info.basic`, `user.info.username`, `user.info.profile`, `user.account.type`,
`message.list.read`, `message.list.send`, `message.list.manage`, `comment.list`.

Do not request `video.publish`. This app does not post videos.

### Access path

Apply in this order. For a MENA or GCC business, leave the United States out
of the application so the review is not held for the US data security step.

1. Create the developer app. New apps should include Ad Account Management,
   CTX Events Management, and Measurement if TikTok asks for those scopes.
2. Submit the Accounts API access form:
   https://bytedance.sg.larkoffice.com/share/base/form/shrlgu4WEvtSXpEDLcCw56u4Rfc
3. Submit the Business Messaging data security and privacy review:
   https://bytedance.sg.larkoffice.com/share/base/form/shrlg7vFArGhg9V20neYCEwIKrb

Set `TIKTOK_MESSAGING_ENABLED=true` only after that approval. Until then,
connect, send, and webhook processing stay closed.

Set `TIKTOK_US_REVIEW_APPROVED=true` (or `US_REVIEW_APPROVED=true`) only after
the separate US review. US accounts are refused without it. EEA, Switzerland,
and UK accounts are refused even when the flag is on. An unknown sign-up
region stays on the rest-of-world default, so Egypt and the GCC can send
before a region is stored. Store the region on the connection
(`metadata.region`) from the profile payload when TikTok returns it, or set
it in TikTok DM settings. `/business/get/` does not document a country field.

`TIKTOK_COMMENT_TO_DM_ENABLED=false` is a kill switch. Otherwise
Comment-to-Message follows the account region: VN, ID, and TH only. Widening
`COMMENT_TO_MESSAGE_REGIONS` turns it on for newly allowed countries. With no
region stored, the old `TIKTOK_COMMENT_TO_DM_ENABLED=true` switch still
applies.

### What sends

- Keyword and intent replies on `im_receive_msg` and `im_receive_msg_eu`.
  Intent names are `price`, `link`, and `hello`, including Arabic phrases.
- tiktok.me links: `https://tiktok.me/{username}?ref={code}&message={text}`.
  The QR code on the growth page encodes that URL. A referral webhook sets
  `event.referral` from `referral.short_link.ref`.
- A welcome message and up to three suggested questions (a `QA_BUTTON_CARD`)
  on the first inbound DM, plus a default reply when no keyword matches.
  Those strings live in connection metadata (`tiktok_dm`) and are edited at
  `/api/tiktok/settings`. They are not TikTok auto-message config calls.
- Organic comments (`comment.update`, action `insert`, top-level only) match
  keywords and post a public reply such as “Check your DMs” or “DM us PRICE”.
  The commenter is saved as a lead. The same campaign can record an Instagram
  comment-to-DM plan (`cross_post_instagram`). That plan does not call Meta
  by itself.
- High-intent comments (`im_receive_high_intent_comment`) can DM only when
  Comment-to-Message is allowed for that account.

### What the API does not support

- A keyword DM for an arbitrary comment. Comment-to-Message is not
  keyword-based. TikTok chooses the high-intent comment, and only for VN, ID,
  and TH registration plus an APAC, LATAM, or METAP commenter.
- Broadcasts. TikTok broadcasts are refused even inside 48 hours.
- More than 10 business messages in the 48 hours after a user message.
  Sender actions (typing, mark read) do not use that quota. The counter is
  kept in memory and, after `20260930_phase7_tiktok_windows.sql`, in
  `tiktok_dm_windows`. A missing table does not stop webhooks; the process
  still counts until restart.
- About 10 send requests per second, enforced in this process only.
- Free-form URL buttons and URL media. Images still need
  `/business/message/media/upload/`. That upload is not implemented.
- A Human Agent tag.

The Business Account must allow direct messages from everyone, or the owner
must accept message requests, before DM webhooks fire.

Access tokens last about a day. `GET /api/cron/refresh-tiktok-tokens` refreshes
them. The refresh token is sealed in `platform_connections.refresh_token`.

Webhook signature: header `TikTok-Signature: t=<unix>,s=<hex>`, HMAC-SHA256 of
`${t}.${rawBody}` with the client secret, rejected when `t` is more than 5
minutes off. Connect subscribes `DIRECT_MESSAGE` and also tries `COMMENT`.
The comment `event_type` string was not in the webhook update enum we could
read, so that second subscribe is best-effort and a non-zero code does not
fail connect.

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
