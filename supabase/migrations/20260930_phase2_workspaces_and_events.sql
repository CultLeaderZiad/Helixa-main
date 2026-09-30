-- =============================================================================
-- Helixa phase 2: workspaces and the inbound event queue
-- =============================================================================
-- Run this yourself in the Supabase SQL editor, after
-- 20260930_phase1_rls_realtime.sql:
--   Dashboard → SQL → New query → paste this file → Run
--
-- Do not point a migration runner at a production database from CI.
-- Take a backup before running it.
--
-- What this changes:
--   1. workspaces + workspace_members (owner, admin, member, client-viewer).
--   2. One default workspace per existing account. Current profiles, and the
--      rows that point at them, are tagged with that workspace so nothing is
--      deleted or rewritten onto a new id.
--   3. Accepted agency seats become memberships on the agency's default
--      workspace. A person in several agencies can switch; they are no longer
--      stuck on the oldest seat.
--   4. RLS reads go through workspace membership. A client-viewer of workspace
--      A cannot read workspace B. Service role (the Next.js server) still
--      bypasses RLS.
--   5. inbound_events is the webhook queue: one row per logical event, unique
--      on the idempotency key, with claim / backoff / dead-letter columns.
--      anon and authenticated have no access.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Workspaces
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS workspaces_owner_idx ON public.workspaces(owner_account_id);

CREATE TABLE IF NOT EXISTS public.workspace_members (
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'client-viewer')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, account_id)
);

CREATE INDEX IF NOT EXISTS workspace_members_account_idx ON public.workspace_members(account_id);

ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS active_workspace_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'accounts_active_workspace_id_fkey'
  ) THEN
    ALTER TABLE public.accounts
      ADD CONSTRAINT accounts_active_workspace_id_fkey
      FOREIGN KEY (active_workspace_id) REFERENCES public.workspaces(id) ON DELETE SET NULL;
  END IF;
END $$;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS workspace_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_workspace_id_fkey'
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_workspace_id_fkey
      FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE SET NULL;
  END IF;
END $$;

ALTER TABLE public.agency_team_members
  ADD COLUMN IF NOT EXISTS workspace_id uuid;

-- ---------------------------------------------------------------------------
-- Backfill one default workspace per account. Idempotent: an account that
-- already owns a workspace is left alone.
-- ---------------------------------------------------------------------------
INSERT INTO public.workspaces (name, owner_account_id)
SELECT
  COALESCE(NULLIF(split_part(a.email, '@', 1), ''), 'Workspace'),
  a.id
FROM public.accounts a
WHERE NOT EXISTS (
  SELECT 1 FROM public.workspaces w WHERE w.owner_account_id = a.id
);

INSERT INTO public.workspace_members (workspace_id, account_id, role)
SELECT w.id, w.owner_account_id, 'owner'
FROM public.workspaces w
ON CONFLICT (workspace_id, account_id) DO NOTHING;

UPDATE public.accounts a
SET active_workspace_id = w.id
FROM public.workspaces w
WHERE w.owner_account_id = a.id
  AND a.active_workspace_id IS NULL;

-- Tag the account's existing profile rows onto its default workspace.
-- If an account already has several workspaces, only untagged profiles move,
-- and only onto the oldest workspace so a later client workspace is not
-- filled with the original account's data.
UPDATE public.users u
SET workspace_id = picked.id
FROM (
  SELECT DISTINCT ON (owner_account_id) id, owner_account_id
  FROM public.workspaces
  ORDER BY owner_account_id, created_at ASC
) picked
WHERE u.account_id = picked.owner_account_id
  AND u.workspace_id IS NULL;

-- Child rows learn their workspace from the profile they already point at.
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'platform_connections',
    'automations',
    'automation_events',
    'conversations',
    'messages',
    'leads',
    'conversation_state',
    'ice_breakers',
    'ai_usage_log',
    'ai_comment_themes',
    'ai_faq_suggestions',
    'media_cache',
    'content_pool',
    'scheduler_config',
    'reels_posts',
    'subscriptions',
    'payment_submissions',
    'manual_payments',
    'webhook_events'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      CONTINUE;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t AND column_name = 'user_id'
    ) THEN
      CONTINUE;
    END IF;
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS workspace_id uuid', t);
    EXECUTE format(
      'UPDATE public.%I child
       SET workspace_id = u.workspace_id
       FROM public.users u
       WHERE child.user_id = u.id
         AND child.workspace_id IS NULL
         AND u.workspace_id IS NOT NULL',
      t
    );
  END LOOP;
END $$;

-- Accepted team seats join the agency's default workspace.
-- viewer → client-viewer, editor → member, admin → admin.
-- The owner row is left as owner if the member account is also the owner.
INSERT INTO public.workspace_members (workspace_id, account_id, role)
SELECT picked.id,
       t.member_account_id,
       CASE lower(COALESCE(t.permission_level, 'viewer'))
         WHEN 'admin' THEN 'admin'
         WHEN 'editor' THEN 'member'
         WHEN 'member' THEN 'member'
         ELSE 'client-viewer'
       END
FROM public.agency_team_members t
JOIN (
  SELECT DISTINCT ON (owner_account_id) id, owner_account_id
  FROM public.workspaces
  ORDER BY owner_account_id, created_at ASC
) picked ON picked.owner_account_id = t.agency_account_id
WHERE t.status = 'active'
  AND t.member_account_id IS NOT NULL
ON CONFLICT (workspace_id, account_id) DO NOTHING;

UPDATE public.agency_team_members t
SET workspace_id = picked.id
FROM (
  SELECT DISTINCT ON (owner_account_id) id, owner_account_id
  FROM public.workspaces
  ORDER BY owner_account_id, created_at ASC
) picked
WHERE t.agency_account_id = picked.owner_account_id
  AND t.workspace_id IS NULL;

-- New signups get a default workspace without waiting for the app.
CREATE OR REPLACE FUNCTION public.helixa_create_default_workspace()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ws uuid;
BEGIN
  INSERT INTO public.workspaces (name, owner_account_id)
  VALUES (COALESCE(NULLIF(split_part(NEW.email, '@', 1), ''), 'Workspace'), NEW.id)
  RETURNING id INTO ws;

  INSERT INTO public.workspace_members (workspace_id, account_id, role)
  VALUES (ws, NEW.id, 'owner');

  UPDATE public.accounts SET active_workspace_id = ws WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS helixa_account_default_workspace ON public.accounts;
CREATE TRIGGER helixa_account_default_workspace
  AFTER INSERT ON public.accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.helixa_create_default_workspace();

-- ---------------------------------------------------------------------------
-- RLS: membership, not "oldest agency seat".
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.helixa_workspace_role(target_workspace uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.role
  FROM public.workspace_members m
  WHERE m.workspace_id = target_workspace
    AND m.account_id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.helixa_can_read_workspace(target_workspace uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT target_workspace IS NOT NULL AND (
    public.helixa_workspace_role(target_workspace) IS NOT NULL
    OR public.helixa_is_admin()
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
      AND (
        public.helixa_is_admin()
        OR (
          u.workspace_id IS NOT NULL
          AND public.helixa_can_read_workspace(u.workspace_id)
        )
        OR (u.workspace_id IS NULL AND u.account_id = auth.uid())
      )
  );
$$;

REVOKE ALL ON FUNCTION public.helixa_workspace_role(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.helixa_can_read_workspace(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.helixa_owns_profile(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.helixa_workspace_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.helixa_can_read_workspace(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.helixa_owns_profile(bigint) TO authenticated;

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

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

SELECT public.helixa_set_policy(
  'workspaces', 'helixa_workspaces_select', 'SELECT',
  'public.helixa_can_read_workspace(id) OR owner_account_id = auth.uid() OR public.helixa_is_admin()'
);

SELECT public.helixa_set_policy(
  'workspace_members', 'helixa_workspace_members_select', 'SELECT',
  'account_id = auth.uid() OR public.helixa_can_read_workspace(workspace_id) OR public.helixa_is_admin()'
);

SELECT public.helixa_set_policy(
  'users', 'helixa_users_select', 'SELECT',
  '(workspace_id IS NOT NULL AND public.helixa_can_read_workspace(workspace_id)) OR public.helixa_owns_profile(id) OR public.helixa_is_admin()'
);

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'conversations',
    'messages',
    'automations',
    'automation_events',
    'leads',
    'conversation_state',
    'ice_breakers',
    'ai_usage_log',
    'media_cache',
    'subscriptions',
    'payment_submissions',
    'webhook_events',
    'ai_comment_themes',
    'ai_faq_suggestions',
    'platform_connections'
  ];
  expr text;
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      CONTINUE;
    END IF;
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t AND column_name = 'workspace_id'
    ) AND EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t AND column_name = 'user_id'
    ) THEN
      expr := '(workspace_id IS NOT NULL AND public.helixa_can_read_workspace(workspace_id)) OR public.helixa_owns_profile(user_id) OR public.helixa_is_admin()';
    ELSIF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t AND column_name = 'user_id'
    ) THEN
      expr := 'public.helixa_owns_profile(user_id) OR public.helixa_is_admin()';
    ELSE
      CONTINUE;
    END IF;
    PERFORM public.helixa_set_policy(t, 'helixa_' || t || '_select', 'SELECT', expr);
  END LOOP;
END $$;

DROP FUNCTION public.helixa_set_policy(text, text, text, text, text);

-- ---------------------------------------------------------------------------
-- Inbound event queue. The Next.js server is the only writer.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inbound_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform text NOT NULL CHECK (platform IN ('instagram', 'facebook', 'whatsapp', 'telegram')),
  idempotency_key text NOT NULL UNIQUE,
  account_key text,
  workspace_id uuid,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'done', 'dead')),
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

CREATE INDEX IF NOT EXISTS inbound_events_due_idx
  ON public.inbound_events (next_attempt_at)
  WHERE status IN ('pending', 'processing');

CREATE INDEX IF NOT EXISTS inbound_events_account_idx
  ON public.inbound_events (account_key, created_at DESC);

CREATE TABLE IF NOT EXISTS public.inbound_rate_buckets (
  account_key text PRIMARY KEY,
  window_start timestamptz NOT NULL,
  count integer NOT NULL DEFAULT 0
);

ALTER TABLE public.inbound_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inbound_rate_buckets ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.inbound_events FROM anon, authenticated;
REVOKE ALL ON public.inbound_rate_buckets FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.claim_inbound_events(batch_size integer, lock_seconds integer)
RETURNS SETOF public.inbound_events
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH due AS (
    SELECT e.id
    FROM public.inbound_events e
    WHERE (
      e.status = 'pending' AND e.next_attempt_at <= now()
    ) OR (
      e.status = 'processing'
      AND e.locked_at IS NOT NULL
      AND e.locked_at < now() - make_interval(secs => GREATEST(lock_seconds, 30))
    )
    ORDER BY e.next_attempt_at
    FOR UPDATE SKIP LOCKED
    LIMIT GREATEST(batch_size, 1)
  )
  UPDATE public.inbound_events event
  SET status = 'processing',
      locked_at = now()
  FROM due
  WHERE event.id = due.id
  RETURNING event.*;
END;
$$;

CREATE OR REPLACE FUNCTION public.take_inbound_rate_slot(
  p_account_key text,
  p_limit integer,
  p_window_seconds integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  slot public.inbound_rate_buckets%ROWTYPE;
BEGIN
  INSERT INTO public.inbound_rate_buckets (account_key, window_start, count)
  VALUES (p_account_key, now(), 0)
  ON CONFLICT (account_key) DO NOTHING;

  SELECT * INTO slot
  FROM public.inbound_rate_buckets
  WHERE account_key = p_account_key
  FOR UPDATE;

  IF slot.window_start < now() - make_interval(secs => GREATEST(p_window_seconds, 1)) THEN
    slot.window_start := now();
    slot.count := 0;
  END IF;

  IF slot.count >= GREATEST(p_limit, 1) THEN
    UPDATE public.inbound_rate_buckets
    SET window_start = slot.window_start,
        count = slot.count
    WHERE account_key = p_account_key;
    RETURN false;
  END IF;

  UPDATE public.inbound_rate_buckets
  SET window_start = slot.window_start,
      count = slot.count + 1
  WHERE account_key = p_account_key;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_inbound_events(integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.take_inbound_rate_slot(text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_inbound_events(integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.take_inbound_rate_slot(text, integer, integer) TO service_role;

COMMIT;
