# Meta App Dashboard Setup Checklist (Facebook + Instagram)

This is the step-by-step config checklist for the Meta app behind Helixa's
Facebook/Instagram integrations. Everything below is derived from what the
code *actually* does — scopes, callback URLs, webhook fields, and env vars.

**Why this document exists:** on 2026-09-24 the app was found Live *without*
App Review, pinned to a removed Graph API version (v20.0), with webhook config
that page-level subscriptions silently depend on. Each section maps a
dashboard setting to the code that requires it.

---

## 1. Environment variables (Vercel + `.env.local`)

| Variable | Used by | Notes |
|---|---|---|
| `NEXT_PUBLIC_FACEBOOK_APP_ID` | FB JS SDK init (`connected-platforms/page.tsx`) + server token exchange | Falls back to `INSTAGRAM_APP_ID` server-side and `NEXT_PUBLIC_INSTAGRAM_APP_ID` client-side. **Baked at build time — redeploy after changing.** |
| `FACEBOOK_APP_SECRET` (or `META_APP_SECRET`) | Long-lived token exchange (`facebook/discover`, `facebook/callback`), webhook HMAC verification (`facebook/webhook`) | Must be the secret of the **same app** as the App ID. Mismatch = "Failed to exchange token with Facebook". |
| `NEXT_PUBLIC_APP_URL` | Telegram webhook, default redirect URIs | Must be `https://` in production. |
| `NEXT_PUBLIC_FACEBOOK_REDIRECT_URI` | Legacy OAuth flow | Defaults to `${APP_URL}/api/facebook/callback`. |
| `FACEBOOK_WEBHOOK_VERIFY_TOKEN` | `GET /api/facebook/webhook` | Must match the "Verify token" Meta sends as `hub.verify_token`, or Meta marks the callback **Not verified**. |
| `NEXT_PUBLIC_INSTAGRAM_APP_ID` / `INSTAGRAM_APP_ID` | IG OAuth + server calls | |
| `INSTAGRAM_APP_SECRET` (or `META_APP_SECRET`) | IG token exchange (`instagram/callback`), IG webhook HMAC | Same-app rule as above. |
| `NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI` | IG OAuth | Defaults to `${APP_URL}/api/instagram/callback`. |
| `INSTAGRAM_WEBHOOK_VERIFY_TOKEN` | `GET /api/instagram/webhook` | Same pattern as Facebook. |

> **Local dev gap (fixed in code, still needs the var):** `.env.local` had no
> `NEXT_PUBLIC_FACEBOOK_APP_ID`, so the FB SDK never loaded and the Connect
> button spun on "Loading…" forever. The SDK now falls back to
> `NEXT_PUBLIC_INSTAGRAM_APP_ID`, but adding the real FB App ID locally is
> still preferred.

---

## 2. Products to add to the Meta app

App Dashboard → **Add Product**:

1. **Facebook Login**
   - Settings → Valid OAuth Redirect URIs: `${APP_URL}/api/facebook/callback`
   - Settings → Allowed Domains for JavaScript SDK: your production domain
     (the Connect button uses `FB.login()` popup, not a server redirect)
2. **Pages API** — page tokens, `/{page_id}/subscribed_apps`
3. **Messenger** — `me/messages` sends, comment private replies
4. **Webhooks** — see §4
5. **Instagram** (Instagram API with Instagram Login)
   - Instagram → Business login → Valid OAuth Redirect URIs:
     `${APP_URL}/api/instagram/callback`

---

## 3. Permissions the code requests

### Facebook Login scope
(`BASE_FB_SCOPE` in `connected-platforms/page.tsx`, same list in `facebook/auth/route.ts`)

| Permission | Why the code needs it |
|---|---|
| `pages_show_list` | List the user's Pages in the picker (`/me/accounts`) |
| `pages_read_engagement` | Read Page posts/comments (post sync, comment triggers) |
| `pages_manage_metadata` | Page webhook subscription + post metadata |
| `pages_messaging` | Messenger DM sends + private replies to comments |
| `business_management` | **Only** when the "My Pages are managed in Meta Business Manager" checkbox is ticked. See §6. |

### Instagram scope
(`instagram/auth/route.ts`)

`business_basic`, `business_content_publish`, `business_manage_messages`,
`business_manage_comments`

---

## 4. Webhooks (the "No webhook" / nothing-syncs fix)

**Callback URLs**

| Platform | Callback URL |
|---|---|
| Facebook | `${APP_URL}/api/facebook/webhook` |
| Instagram | `${APP_URL}/api/instagram/webhook` |

**Steps**

1. App Dashboard → **Webhooks** → subscribe the **Page** object fields:
   `feed`, `messages`, `messaging_postbacks`
   (the app also requests these at page-connect time via
   `/{page_id}/subscribed_apps?subscribed_fields=messages,messaging_postbacks,feed`
   in `facebook/connect/route.ts` — but that call **fails silently** unless the
   app-level subscription exists first, leaving
   `metadata.webhook_subscribed = false` → amber **"No webhook"** badge and no
   event delivery.)
2. Subscribe the **Instagram** object fields: `comments`, `messages`,
   `message_reactions` (the webhook route processes `entry.changes` and
   `entry.messaging`).
3. Set **Verify token** = the value of `FACEBOOK_WEBHOOK_VERIFY_TOKEN` /
   `INSTAGRAM_WEBHOOK_VERIFY_TOKEN` env vars.
4. Signature verification: Meta signs POSTs with `X-Hub-Signature-256` (HMAC of
   raw body). Facebook accepts `FACEBOOK_APP_SECRET` **or** `META_APP_SECRET`;
   Instagram accepts `INSTAGRAM_APP_SECRET` **or** `META_APP_SECRET`
   (`facebook/webhook/route.ts`, `instagram/webhook/route.ts`). If neither
   secret matches the sending app → **401 and every event is dropped**.
   - Debug escape hatch: `DISABLE_WEBHOOK_SIGNATURE_CHECK=true` (Facebook only)
     — **never leave this on in production.**

---

## 5. App Mode & App Review ⚠️ (current blocker)

**Current state: app is Live but has NOT passed App Review.**
In that state, the permissions in §3 are only granted to people listed under
**App Roles** (Admins/Developers/Testers). Everyone else gets a permission
error or a silently empty page list.

Pick ONE:

**Option A — stay in Development (fastest):**
1. App Dashboard → Settings → **Development Mode**
2. App Roles → add every connecting account as Admin/Developer/Tester
3. Limitation: only team members can connect.

**Option B — go Live properly:**
1. App Dashboard → Settings → Basic → add **Privacy Policy URL**, **App Icon
   (1024×1024)**, **Category**
2. App Review → Permissions and Features → request:
   - `pages_show_list`, `pages_read_engagement`, `pages_manage_metadata`,
     `pages_messaging`
   - `business_management` (separately; requires §6 Business Verification)
   - Instagram: `business_basic`, `business_content_publish`,
     `business_manage_messages`, `business_manage_comments`
3. For each: use-case description + screencast showing the permission being
   used in the live product.

---

## 6. Business Manager / Business-Portfolio pages

The checkbox "My Pages are managed in Meta Business Manager" adds
`business_management` to the login scope, which triggers Meta's **"Login for
Business"** dialog. That dialog **auto-cancels itself** unless:

1. The app has completed **Business Verification**
   (Business Suite → Security Center → Verification), and
2. The connecting user selects an existing **Business Portfolio** they admin.

This is a Meta-side requirement — no code can bypass it (documented in
`facebook/auth/route.ts`). Regular, non-BM Pages must connect with the
checkbox **off**.

---

## 7. API version policy (how v20 broke the app)

The codebase pins Meta API versions in these places — check them **quarterly**
against https://developers.facebook.com/docs/graph-api/changelog :

| Location | Pin |
|---|---|
| `lib/facebook-api.ts` | `v25.0` |
| `app/api/facebook/**` (discover, connect, callback, auth, posts, fetch-post) | `v25.0` |
| `app/dashboard/connected-platforms/page.tsx` (JS SDK `FB.init`) | `v25.0` |
| `lib/instagram-api.ts` + IG routes | `v24.0` (graph.instagram.com) |
| `app/api/instagram/media`, `instagram/fetch-post` oEmbed | `v24.0` / `v25.0` |

Current retirement calendar:
- **v21.0 → removed 2027-01-21**
- **v22.0 → removed 2027-05-20**
- **v24.0 → removed 2028-02-18**
- **v25.0 → removed 2028-07-29**

`v20.0` was removed **2026-09-24** (the incident that triggered this
checklist). Fastest audit command:

```bash
rg -n 'graph\.(facebook|instagram)\.com/v\d|facebook\.com/v\d|version: "v\d' \
  --glob '!node_modules' --glob '!pnpm-lock.yaml'
```

---

## 8. Telegram (not Meta, but same class of setup)

- `NEXT_PUBLIC_APP_URL` must be `https://` — Telegram refuses HTTP webhooks and
  the connect route **skips registration** on localhost (logged as a warning).
- Webhook URL format: `${APP_URL}/api/telegram/webhook/{botToken}` — the token
  in the path *is* Telegram's security. Re-run Connect after any domain change.
- Bot needs `/setMyCommands` group privacy off if it should see all group
  messages (BotFather → Bot Settings).

---

## 9. Post-deploy verification (smoke test)

1. **Redeploy** on Vercel (the `NEXT_PUBLIC_*` vars are baked at build).
2. Connected Platforms → **Connect Facebook** → popup approves → page picker
   lists your Pages → select one.
3. Expected: page row appears with a green **Live** badge.
   - Amber **"No webhook"** → §4 app-level fields not subscribed.
   - "No Pages found" → signed in with wrong FB account, or personal profile
     with no Page (expected Meta behavior — a token only sees the
     authorizing account's Pages).
   - Permission error popup → §5 (App Review / Development mode).
4. Confirm sync: post something on the Page → Events/analytics update within a
   minute; send the page a Messenger DM → appears in Inbox.
5. Watch logs for the newly-visible warnings (previously swallowed):
   `[FB Connect]`, `[fb-webhook]`, `[webhook]`, `[Telegram Webhook]`,
   `[ig-api]`, `[tg-api]`.
