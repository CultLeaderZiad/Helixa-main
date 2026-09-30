# Phase 5 flows, broadcasts, and growth

This stacks on phase 4 (`cursor/phase4-channels-a25d`). The SQL file is
`supabase/migrations/20260930_phase5_flows_broadcasts.sql`. It was not applied
to a live database. Until it is, the old single-step automations keep sending,
and the new screens return an empty list or `migration_required`.

## Flow builder

`/dashboard/flows` is a versioned graph per workspace. Saving writes a new
`flow_versions` row and points `flows.draft_version_id` at it. Publish copies
that id to `published_version_id` and sets `status = live`. A run keeps the
`version_id` it started on.

Triggers: keyword DM, comment on one Reel or any post, story reply, story
mention, story reaction, ice breaker, new website visitor, TikTok DM (only
when `TIKTOK_MESSAGING_ENABLED` is on), and a ref code from a growth link.

Steps: send (text, https media, buttons, quick replies, shaped per channel),
public comment reply, condition (tag, custom field, channel, follower when
known), add or remove tag, set field, smart delay, AI agent step, human
handoff, HTTPS webhook, and jump. A jump to itself fails. A cycle stops at
32 steps.

TikTok sends text only. WhatsApp keeps at most three buttons. Public replies
run on Instagram and Messenger.

The canvas shows each node's run and click counts from `flow_node_stats`.
The strip under the canvas is runs, waiting, completed, and clicks.

## Engine

`applyIncoming` in `lib/flows/engine.ts` is pure. `lib/flows/runtime.ts` stores
`flow_runs` and `flow_jobs`. The inbound worker and
`GET /api/cron/process-inbound-events` drain those jobs after the inbound
queue. `claim_flow_jobs` uses `FOR UPDATE SKIP LOCKED`.

Waits are rows: a delay's idempotency key is `delay:{runId}:{nodeId}`, a
button or reply resume is `resume:{runId}:{nodeId}:{eventId}`, and a start is
`start:{flowId}:{externalId}:{eventId}`. The step token moves on every advance.
A second delivery of the same token does nothing.

A reply during a delay with `skipIfReplied` (the default on new delays) ends
the wait. If the delay has a `replied` edge, that branch runs. Otherwise the
run completes and the late delay job is stale. Migrated delays set
`skipIfReplied` to false so an old delayed send still goes out.

`respectWindow` wakes the delay one second before the channel window ends, or
skips it if the window is already closed.

The 24-hour window and `contacts.bot_paused` apply to flow sends. A start
while the bot is paused sends nothing. A delay that fires while paused is
pushed 60 seconds. Handoff pauses the contact and completes the run.

Flow replies (not broadcasts):

- Instagram and Messenger use `RESPONSE` inside 24 hours and `HUMAN_AGENT`
  through 7 days.
- WhatsApp free-form is allowed inside 24 hours. Outside it, the step needs
  an approved template and `contacts.opted_in`.
- Telegram and website chat have no window.
- TikTok uses a 48-hour window and stays off unless the messaging flag is set.

Opt-out words (`stop`, `unsubscribe`, `opt out`, `cancel`, `إلغاء`, `الغاء`,
`توقف`, `ايقاف`, `إيقاف`, and the `OPT_OUT` payload) cancel runs, pending
jobs, and sequence enrollments.

The AI step calls the existing Groq auto-reply helper with the node's goal.
It is not the Arabic agent.

Webhooks are https only, with no credentials, localhost, or private addresses.
Redirects are not followed. The request aborts after 8 seconds.

## Migrating automations

`POST /api/flows/migrate` turns each single-step rule into a flow. An active
rule is published live and linked by `flows.source_automation_id`. The comment
and DM pipeline skips the old send when that live flow exists, then the flow
start job sends once. If `flows` is missing, the old send still runs.

A second migrate skips ids that already have a flow. The automations list is
unchanged.

## Broadcasts and sequences

`/dashboard/broadcasts` sends to a segment of tags, fields, and channel.
WhatsApp broadcasts always need an approved template and an opted-in contact,
including inside 24 hours. Instagram and Messenger send inside 24 hours, or
later with `HUMAN_AGENT` (only through 7 days) or `ACCOUNT_UPDATE`,
`POST_PURCHASE_UPDATE`, or `CONFIRMED_EVENT_UPDATE`. Telegram and website chat
send freely. TikTok broadcasts are refused. Opted-out contacts are skipped.

Jobs are spaced at `60000 / perMinute` (1–600 per minute) and drained with the
flow queue. Opens move when that contact messages again. Clicks move when a
tracked `/r/{code}` link with `broadcast_id` is opened.

A sequence is a list of steps with a delay. Enrollment schedules
`sequence:{enrollmentId}:{stepIndex}`. Each step is checked against the same
broadcast rules before it sends. Opt-out stops the enrollment.

## Growth

Comment-to-DM templates (PRICE, LINK, GUIDE) create the old automation row
and a live flow for one Reel.

`/b/{slug}` collects an email or phone into a contact on channel `bio` and
can enqueue one flow start. The page is public.

Ref links build `ig.me`, `m.me`, `wa.me`, `t.me`, and `tiktok.me` URLs with a code. The
matching trigger is case-insensitive, including `/start CODE` and the
referral field on an open-thread event. The API returns an SVG QR code.

Giveaways record one entry per contact when the keyword matches. Draw uses a
seeded shuffle, so the same seed and the same entrants pick the same winners.
