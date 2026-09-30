-- =============================================================================
-- Helixa phase 1: row-level security and realtime lockdown
-- =============================================================================
-- Run this yourself in the Supabase SQL editor:
--   Dashboard → SQL → New query → paste this file → Run
--
-- Do not point a migration runner at a production database from CI.
-- Take a backup (or a point-in-time restore point) before running it.
--
-- The Next.js server uses SUPABASE_SERVICE_ROLE_KEY. In Supabase that role
-- bypasses RLS, so webhooks and API routes keep working after this script.
-- The anon key shipped to the browser does not bypass RLS.
--
-- What this changes:
--   1. Enables RLS on the core tenant tables (deny by default).
--   2. Lets a logged-in user read only their own rows, plus rows of an agency
--      they have *accepted* a team seat on (agency_team_members.status = active).
--   3. Lets an accounts.role = 'admin' user read tenant rows (admin dashboard).
--   4. Removes token-bearing tables from the Realtime publication so access
--      tokens are not broadcast to browsers. Column grants cannot strip
--      columns out of a realtime payload, so the table has to leave the
--      publication.
--   5. Revokes SELECT on access_token / BYOK ciphertext from anon and
--      authenticated. Service role is unaffected.
--   6. Adds users.reconnect_required and users.token_refreshed_at for the
--      Instagram token refresh job.
--
-- After it succeeds, open Database → Advisors and confirm there is no
-- remaining policy with USING (true) on these tables. This script adds
-- restrictive-by-default policies but does not delete unknown policies you
-- may have created by hand. Permissive policies are OR'd together.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Instagram reconnect bookkeeping (safe if the columns already exist)
-- ---------------------------------------------------------------------------
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS reconnect_required BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS token_refreshed_at TIMESTAMPTZ;

-- ---------------------------------------------------------------------------
-- Ownership helpers. SECURITY DEFINER so policies can read users/accounts
-- without recursive RLS. search_path is pinned. Not executable by anon.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.helixa_is_account_owner(target_account uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT target_account IS NOT NULL AND (
    target_account = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.agency_team_members t
      WHERE t.agency_account_id = target_account
        AND t.member_account_id = auth.uid()
        AND t.status = 'active'
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.helixa_owns_profile(profile_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = profile_id
      AND public.helixa_is_account_owner(u.account_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.helixa_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.accounts a
    WHERE a.id = auth.uid()
      AND a.role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.helixa_is_account_owner(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.helixa_owns_profile(bigint) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.helixa_is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.helixa_is_account_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.helixa_owns_profile(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.helixa_is_admin() TO authenticated;

-- ---------------------------------------------------------------------------
-- Enable RLS where the table exists (schema drift is expected).
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'users',
    'accounts',
    'conversations',
    'messages',
    'automations',
    'automation_events',
    'automation_variants',
    'platform_connections',
    'leads',
    'conversation_state',
    'ice_breakers',
    'ai_usage_log',
    'media_cache',
    'oauth_sessions',
    'account_agent_settings',
    'subscriptions',
    'payment_submissions',
    'webhook_events',
    'dm_queue',
    'ai_comment_themes',
    'ai_faq_suggestions',
    'agency_team_members'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    END IF;
  END LOOP;
END $$;

-- Helper: replace one of our policies. Unknown policies are left in place.
CREATE OR REPLACE FUNCTION public.helixa_set_policy(
  table_name text,
  policy_name text,
  command text,
  using_expr text,
  check_expr text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF to_regclass('public.' || table_name) IS NULL THEN
    RETURN;
  END IF;
  EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_name, table_name);
  IF check_expr IS NULL THEN
    EXECUTE format(
      'CREATE POLICY %I ON public.%I AS PERMISSIVE FOR %s TO authenticated USING (%s)',
      policy_name, table_name, command, using_expr
    );
  ELSE
    EXECUTE format(
      'CREATE POLICY %I ON public.%I AS PERMISSIVE FOR %s TO authenticated USING (%s) WITH CHECK (%s)',
      policy_name, table_name, command, using_expr, check_expr
    );
  END IF;
END;
$$;

-- Profiles and accounts
SELECT public.helixa_set_policy(
  'users', 'helixa_users_select', 'SELECT',
  'public.helixa_is_account_owner(account_id) OR public.helixa_is_admin()'
);

-- accounts.id is the Supabase auth user id (see lib/auth.ts).
-- Drop the original policies that compared a user_id column the app no longer uses.
DO $$
BEGIN
  IF to_regclass('public.accounts') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users can view own account" ON public.accounts';
    EXECUTE 'DROP POLICY IF EXISTS "Admins can view all accounts" ON public.accounts';
  END IF;
END $$;

SELECT public.helixa_set_policy(
  'accounts', 'helixa_accounts_select', 'SELECT',
  'id = auth.uid() OR public.helixa_is_admin()'
);

-- Business tables keyed by users.id
SELECT public.helixa_set_policy('conversations', 'helixa_conversations_select', 'SELECT', 'public.helixa_owns_profile(user_id) OR public.helixa_is_admin()');
SELECT public.helixa_set_policy('messages', 'helixa_messages_select', 'SELECT', 'public.helixa_owns_profile(user_id) OR public.helixa_is_admin()');
SELECT public.helixa_set_policy('automations', 'helixa_automations_select', 'SELECT', 'public.helixa_owns_profile(user_id) OR public.helixa_is_admin()');
SELECT public.helixa_set_policy('automation_events', 'helixa_automation_events_select', 'SELECT', 'public.helixa_owns_profile(user_id) OR public.helixa_is_admin()');
SELECT public.helixa_set_policy('leads', 'helixa_leads_select', 'SELECT', 'public.helixa_owns_profile(user_id) OR public.helixa_is_admin()');
SELECT public.helixa_set_policy('conversation_state', 'helixa_conversation_state_select', 'SELECT', 'public.helixa_owns_profile(user_id) OR public.helixa_is_admin()');
SELECT public.helixa_set_policy('ice_breakers', 'helixa_ice_breakers_select', 'SELECT', 'public.helixa_owns_profile(user_id) OR public.helixa_is_admin()');
SELECT public.helixa_set_policy('ai_usage_log', 'helixa_ai_usage_log_select', 'SELECT', 'public.helixa_owns_profile(user_id) OR public.helixa_is_admin()');
SELECT public.helixa_set_policy('media_cache', 'helixa_media_cache_select', 'SELECT', 'public.helixa_owns_profile(user_id) OR public.helixa_is_admin()');
SELECT public.helixa_set_policy('subscriptions', 'helixa_subscriptions_select', 'SELECT', 'public.helixa_owns_profile(user_id) OR public.helixa_is_admin()');
SELECT public.helixa_set_policy('payment_submissions', 'helixa_payment_submissions_select', 'SELECT', 'public.helixa_owns_profile(user_id) OR public.helixa_is_admin()');
SELECT public.helixa_set_policy('webhook_events', 'helixa_webhook_events_select', 'SELECT', 'public.helixa_owns_profile(user_id) OR public.helixa_is_admin()');
SELECT public.helixa_set_policy('ai_comment_themes', 'helixa_ai_comment_themes_select', 'SELECT', 'public.helixa_owns_profile(user_id) OR public.helixa_is_admin()');
SELECT public.helixa_set_policy('ai_faq_suggestions', 'helixa_ai_faq_suggestions_select', 'SELECT', 'public.helixa_owns_profile(user_id) OR public.helixa_is_admin()');

-- Variants have no user_id; ownership goes through the parent automation.
SELECT public.helixa_set_policy(
  'automation_variants', 'helixa_automation_variants_select', 'SELECT',
  'EXISTS (SELECT 1 FROM public.automations a WHERE a.id = automation_id AND (public.helixa_owns_profile(a.user_id) OR public.helixa_is_admin()))'
);

-- Tokens. Authenticated clients get no policy on oauth_sessions or dm_queue
-- (default deny). platform_connections is readable by the owner but the
-- access_token column is revoked below, and the table is not in Realtime.
-- account_id was added by hand in some environments (scripts/58); only
-- reference it when the column exists so this script still applies.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'platform_connections'
      AND column_name = 'account_id'
  ) THEN
    PERFORM public.helixa_set_policy(
      'platform_connections', 'helixa_platform_connections_select', 'SELECT',
      'public.helixa_owns_profile(user_id) OR public.helixa_is_account_owner(account_id) OR public.helixa_is_admin()'
    );
  ELSE
    PERFORM public.helixa_set_policy(
      'platform_connections', 'helixa_platform_connections_select', 'SELECT',
      'public.helixa_owns_profile(user_id) OR public.helixa_is_admin()'
    );
  END IF;
END $$;

SELECT public.helixa_set_policy(
  'account_agent_settings', 'helixa_account_agent_settings_select', 'SELECT',
  'public.helixa_is_account_owner(account_id) OR public.helixa_is_admin()'
);

SELECT public.helixa_set_policy(
  'agency_team_members', 'helixa_team_select', 'SELECT',
  'public.helixa_is_account_owner(agency_account_id) OR member_account_id = auth.uid() OR public.helixa_is_admin()'
);

-- No client policies on these. Service role still reads and writes them.
-- (Policies are not created, so authenticated/anon are denied once RLS is on.)

DROP FUNCTION public.helixa_set_policy(text, text, text, text, text);

-- ---------------------------------------------------------------------------
-- Column privileges. Realtime is handled separately below; this stops
-- PostgREST from returning ciphertext/plaintext tokens to the browser.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'access_token'
  ) THEN
    EXECUTE 'REVOKE SELECT (access_token) ON public.users FROM anon, authenticated';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'platform_connections' AND column_name = 'access_token'
  ) THEN
    EXECUTE 'REVOKE SELECT (access_token) ON public.platform_connections FROM anon, authenticated';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'account_agent_settings' AND column_name = 'byok_key_encrypted'
  ) THEN
    EXECUTE 'REVOKE SELECT (byok_key_encrypted) ON public.account_agent_settings FROM anon, authenticated';
  END IF;

  IF to_regclass('public.oauth_sessions') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON public.oauth_sessions FROM anon, authenticated';
  END IF;

  IF to_regclass('public.dm_queue') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON public.dm_queue FROM anon, authenticated';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Stop broadcasting tables that contain access tokens or user secrets.
-- messages / automation_events / accounts stay if you already added them,
-- and the SELECT policies above limit those events to the owning user.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  rel text;
  sensitive text[] := ARRAY[
    'users',
    'platform_connections',
    'oauth_sessions',
    'account_agent_settings',
    'dm_queue'
  ];
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH rel IN ARRAY sensitive LOOP
      IF EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = rel
      ) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime DROP TABLE public.%I', rel);
      END IF;
    END LOOP;
  END IF;
END $$;

COMMIT;
