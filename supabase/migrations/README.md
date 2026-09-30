# Database migrations

These files are **not** applied automatically. There is no Supabase CLI
pipeline in this repo. Run them yourself in the Supabase SQL editor
(Dashboard → SQL → New query), against the project Helixa uses.

Run order is the filename timestamp. Phase 2 stacks on phase 1. Run:

1. `20260930_phase1_rls_realtime.sql`
2. `20260930_phase2_workspaces_and_events.sql`

Phase 2 adds workspaces (owner, admin, member, client-viewer), tags existing
accounts onto a default workspace, and adds the `inbound_events` queue the
webhook worker drains. It does not delete rows. A person who belongs to more
than one agency gets a membership per workspace and can switch; the app no
longer opens the oldest seat automatically.

That script:

1. Enables row-level security on the core tables and adds per-owner policies.
   A logged-in user can read their own rows. An accepted team member
   (`agency_team_members.status = 'active'`) can read the agency's rows.
   Admins (`accounts.role = 'admin'`) can read them too. Everyone else,
   including the public anon key, is denied.
2. Removes `users`, `platform_connections`, `oauth_sessions`,
   `account_agent_settings`, and `dm_queue` from the `supabase_realtime`
   publication. Those tables hold access tokens or encrypted keys. Realtime
   payloads include every column, so they must not be broadcast.
3. Revokes `SELECT` on `users.access_token`,
   `platform_connections.access_token`, and the BYOK key column from the
   `anon` and `authenticated` roles.
4. Adds `users.reconnect_required` and `users.token_refreshed_at` for the
   Instagram token refresh job.

The Next.js server uses the service-role key, which bypasses RLS. Webhooks
and API routes keep working. Do not run this from an app process, and do not
run it against a database you have not backed up.

After it succeeds:

- Supabase → Database → Advisors. Confirm RLS is on for `users`, `messages`,
  `conversations`, `automations`, and `platform_connections`.
- Delete any hand-written policy that uses `USING (true)` on those tables.
  This script does not drop unknown policies, and permissive policies are
  combined with OR.
- Do **not** re-run `scripts/99-fix-realtime.sql`. That script adds `users`
  back to the realtime publication.

The older files in this folder and the scripts in `scripts/` were applied by
hand before this README existed. They are not a complete history of the live
schema.

## Phase 2 manual steps

Run `20260930_phase2_workspaces_and_events.sql` after the phase 1 file. It is
idempotent. It does not delete tenant rows.

Environment:

- `CRON_SECRET` must be set. Vercel Cron sends it as a bearer token. The new
  drain route fails closed without it, same as the other cron routes.
- Optional: `INBOUND_RATE_LIMIT` (default 30) and `INBOUND_RATE_WINDOW_MS`
  (default 60000). That is the per-account cap on events a worker will
  process inside one window. Over the cap, the event stays pending and is
  tried again after the window. It does not count as a failure.

Cron:

- `vercel.json` schedules `GET /api/cron/process-inbound-events` every minute.
  Vercel Hobby only allows daily crons, so this schedule needs Pro (or an
  external cron calling that path with `Authorization: Bearer $CRON_SECRET`).
- Webhooks also call the drain after the response via Next.js `after()`, so
  a delivery is processed without waiting for the minute tick. The cron is
  what retries failures and rate-limit defers.
- If `inbound_events` does not exist yet, the webhook processes that delivery
  in the request and still returns 200. Run the SQL before relying on retries.

Queue choice: a Supabase table, not a new vendor. The app is already on
Vercel plus Supabase, and there is no Redis or queue product in the project.
`inbound_events.idempotency_key` is unique, `claim_inbound_events` uses
`FOR UPDATE SKIP LOCKED`, and failed rows wait on exponential backoff
(15s, 30s, 60s, … capped at 15 minutes) until 5 attempts, then `dead`.

After it succeeds, confirm in the SQL editor:

```sql
select count(*) from public.workspaces;
select count(*) from public.workspace_members where role = 'owner';
select indexname from pg_indexes where tablename = 'inbound_events';
```

The owner count should match the number of accounts that existed before the
script. `inbound_events` should have a unique index on `idempotency_key`.
