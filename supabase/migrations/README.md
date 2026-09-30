# Database migrations

These files are **not** applied automatically. There is no Supabase CLI
pipeline in this repo. Run them yourself in the Supabase SQL editor
(Dashboard → SQL → New query), against the project Helixa uses.

Run order is the filename timestamp. As of phase 1, the file you need for
the security fixes is:

- `20260930_phase1_rls_realtime.sql`

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
