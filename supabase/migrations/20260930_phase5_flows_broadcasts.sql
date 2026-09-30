-- Phase 5: versioned flows, durable runs, broadcasts, sequences, growth tools.
-- Run after 20260930_phase4_channels.sql. Idempotent. Does not delete rows.
-- Do not run this from the app. Run it in the Supabase SQL editor.

ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS opted_in boolean NOT NULL DEFAULT false;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS opted_out boolean NOT NULL DEFAULT false;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS is_follower boolean;

ALTER TABLE public.tracked_links ADD COLUMN IF NOT EXISTS broadcast_id uuid;

-- ---------------------------------------------------------------------------
-- Flows. One graph per version. Live sends read published_version_id.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.flows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid,
  user_id bigint NOT NULL,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  channel text,
  trigger jsonb NOT NULL DEFAULT '{}'::jsonb,
  draft_version_id uuid,
  published_version_id uuid,
  source_automation_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'flows_status_check') THEN
    ALTER TABLE public.flows
      ADD CONSTRAINT flows_status_check CHECK (status IN ('draft', 'live', 'paused'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS flows_source_automation_idx
  ON public.flows (source_automation_id)
  WHERE source_automation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS flows_user_idx ON public.flows (user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.flow_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id uuid NOT NULL REFERENCES public.flows(id) ON DELETE CASCADE,
  version integer NOT NULL,
  graph jsonb NOT NULL,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (flow_id, version)
);

CREATE TABLE IF NOT EXISTS public.flow_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id uuid NOT NULL REFERENCES public.flows(id) ON DELETE CASCADE,
  version_id uuid,
  workspace_id uuid,
  user_id bigint NOT NULL,
  contact_id uuid,
  contact_external_id text NOT NULL,
  channel text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  current_node_id text,
  wait_kind text,
  resume_at timestamptz,
  step_token text NOT NULL,
  expected_payloads jsonb NOT NULL DEFAULT '[]'::jsonb,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key text NOT NULL UNIQUE,
  steps integer NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'flow_runs_status_check') THEN
    ALTER TABLE public.flow_runs
      ADD CONSTRAINT flow_runs_status_check
      CHECK (status IN ('active', 'waiting', 'completed', 'failed', 'paused', 'opted_out'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS flow_runs_contact_idx
  ON public.flow_runs (user_id, contact_external_id, status);

CREATE TABLE IF NOT EXISTS public.flow_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid,
  user_id bigint,
  kind text NOT NULL,
  idempotency_key text NOT NULL UNIQUE,
  run_id uuid,
  flow_id uuid,
  node_id text,
  step_token text,
  contact_external_id text,
  channel text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'flow_jobs_status_check') THEN
    ALTER TABLE public.flow_jobs
      ADD CONSTRAINT flow_jobs_status_check
      CHECK (status IN ('pending', 'processing', 'done', 'dead', 'cancelled'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS flow_jobs_due_idx
  ON public.flow_jobs (next_attempt_at)
  WHERE status IN ('pending', 'processing');

CREATE TABLE IF NOT EXISTS public.flow_node_stats (
  flow_id uuid NOT NULL REFERENCES public.flows(id) ON DELETE CASCADE,
  node_id text NOT NULL,
  runs integer NOT NULL DEFAULT 0,
  clicks integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (flow_id, node_id)
);

-- ---------------------------------------------------------------------------
-- Broadcasts and drip sequences. Each recipient is one queue row.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid,
  user_id bigint NOT NULL,
  name text NOT NULL,
  channel text NOT NULL,
  segment jsonb NOT NULL DEFAULT '{}'::jsonb,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  template_name text,
  template_language text,
  message_tag text,
  status text NOT NULL DEFAULT 'draft',
  scheduled_at timestamptz,
  per_minute integer NOT NULL DEFAULT 30,
  stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'broadcasts_status_check') THEN
    ALTER TABLE public.broadcasts
      ADD CONSTRAINT broadcasts_status_check
      CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'cancelled'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS broadcasts_user_idx ON public.broadcasts (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.broadcast_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id uuid NOT NULL REFERENCES public.broadcasts(id) ON DELETE CASCADE,
  contact_id uuid,
  contact_external_id text NOT NULL,
  channel text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  skip_reason text,
  idempotency_key text NOT NULL UNIQUE,
  sent_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS broadcast_recipients_contact_idx
  ON public.broadcast_recipients (contact_external_id, status);

CREATE TABLE IF NOT EXISTS public.sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid,
  user_id bigint NOT NULL,
  name text NOT NULL,
  channel text NOT NULL,
  segment jsonb NOT NULL DEFAULT '{}'::jsonb,
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sequences_status_check') THEN
    ALTER TABLE public.sequences
      ADD CONSTRAINT sequences_status_check CHECK (status IN ('draft', 'live', 'paused'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.sequence_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id uuid NOT NULL REFERENCES public.sequences(id) ON DELETE CASCADE,
  contact_id uuid,
  contact_external_id text NOT NULL,
  channel text NOT NULL,
  step_index integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  next_send_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sequence_id, contact_external_id)
);

-- ---------------------------------------------------------------------------
-- Creator growth: link-in-bio, ref links, giveaways.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bio_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid,
  user_id bigint NOT NULL,
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  subtitle text,
  collect_email boolean NOT NULL DEFAULT true,
  collect_phone boolean NOT NULL DEFAULT true,
  flow_id uuid,
  locale text NOT NULL DEFAULT 'en',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ref_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid,
  user_id bigint NOT NULL,
  channel text NOT NULL,
  handle text NOT NULL,
  code text NOT NULL,
  flow_id uuid,
  url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, channel, code)
);

CREATE TABLE IF NOT EXISTS public.giveaways (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid,
  user_id bigint NOT NULL,
  name text NOT NULL,
  keyword text NOT NULL,
  channel text NOT NULL DEFAULT 'instagram',
  media_id text,
  status text NOT NULL DEFAULT 'open',
  winners jsonb NOT NULL DEFAULT '[]'::jsonb,
  winner_count integer NOT NULL DEFAULT 1,
  drawn_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'giveaways_status_check') THEN
    ALTER TABLE public.giveaways
      ADD CONSTRAINT giveaways_status_check CHECK (status IN ('open', 'drawn', 'closed'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.giveaway_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  giveaway_id uuid NOT NULL REFERENCES public.giveaways(id) ON DELETE CASCADE,
  contact_external_id text NOT NULL,
  contact_id uuid,
  entered_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (giveaway_id, contact_external_id)
);

-- ---------------------------------------------------------------------------
-- Queue claim. Service role only.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_flow_jobs(batch_size integer, lock_seconds integer)
RETURNS SETOF public.flow_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH due AS (
    SELECT j.id
    FROM public.flow_jobs j
    WHERE (
      j.status = 'pending' AND j.next_attempt_at <= now()
    ) OR (
      j.status = 'processing'
      AND j.locked_at IS NOT NULL
      AND j.locked_at < now() - make_interval(secs => GREATEST(lock_seconds, 30))
    )
    ORDER BY j.next_attempt_at
    FOR UPDATE SKIP LOCKED
    LIMIT GREATEST(batch_size, 1)
  )
  UPDATE public.flow_jobs job
  SET status = 'processing',
      locked_at = now()
  FROM due
  WHERE job.id = due.id
  RETURNING job.*;
END;
$$;

CREATE OR REPLACE FUNCTION public.bump_flow_node_stat(
  p_flow_id uuid,
  p_node_id text,
  p_runs integer,
  p_clicks integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.flow_node_stats (flow_id, node_id, runs, clicks)
  VALUES (p_flow_id, p_node_id, GREATEST(COALESCE(p_runs, 0), 0), GREATEST(COALESCE(p_clicks, 0), 0))
  ON CONFLICT (flow_id, node_id) DO UPDATE
  SET runs = public.flow_node_stats.runs + GREATEST(COALESCE(p_runs, 0), 0),
      clicks = public.flow_node_stats.clicks + GREATEST(COALESCE(p_clicks, 0), 0),
      updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.claim_flow_jobs(integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.bump_flow_node_stat(uuid, text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_flow_jobs(integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.bump_flow_node_stat(uuid, text, integer, integer) TO service_role;

-- ---------------------------------------------------------------------------
-- RLS. The server uses the service role and bypasses these policies.
-- ---------------------------------------------------------------------------
ALTER TABLE public.flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flow_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flow_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flow_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flow_node_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcast_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sequence_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bio_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ref_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.giveaways ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.giveaway_entries ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.flow_jobs FROM anon, authenticated;

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'flows', 'flow_runs', 'broadcasts', 'sequences', 'bio_pages', 'ref_links', 'giveaways'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS helixa_%s_select ON public.%I', tbl, tbl);
    EXECUTE format(
      'CREATE POLICY helixa_%s_select ON public.%I FOR SELECT TO authenticated USING (
        (workspace_id IS NOT NULL AND public.helixa_can_read_workspace(workspace_id))
        OR public.helixa_owns_profile(user_id)
        OR public.helixa_is_admin()
      )',
      tbl, tbl
    );
  END LOOP;
END $$;

-- Child tables that have no workspace_id / user_id of their own.
DROP POLICY IF EXISTS helixa_flow_versions_select ON public.flow_versions;
CREATE POLICY helixa_flow_versions_select ON public.flow_versions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.flows f
      WHERE f.id = flow_id
        AND (
          (f.workspace_id IS NOT NULL AND public.helixa_can_read_workspace(f.workspace_id))
          OR public.helixa_owns_profile(f.user_id)
          OR public.helixa_is_admin()
        )
    )
  );

DROP POLICY IF EXISTS helixa_flow_node_stats_select ON public.flow_node_stats;
CREATE POLICY helixa_flow_node_stats_select ON public.flow_node_stats
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.flows f
      WHERE f.id = flow_id
        AND (
          (f.workspace_id IS NOT NULL AND public.helixa_can_read_workspace(f.workspace_id))
          OR public.helixa_owns_profile(f.user_id)
          OR public.helixa_is_admin()
        )
    )
  );

DROP POLICY IF EXISTS helixa_broadcast_recipients_select ON public.broadcast_recipients;
CREATE POLICY helixa_broadcast_recipients_select ON public.broadcast_recipients
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.broadcasts b
      WHERE b.id = broadcast_id
        AND (
          (b.workspace_id IS NOT NULL AND public.helixa_can_read_workspace(b.workspace_id))
          OR public.helixa_owns_profile(b.user_id)
          OR public.helixa_is_admin()
        )
    )
  );

DROP POLICY IF EXISTS helixa_sequence_enrollments_select ON public.sequence_enrollments;
CREATE POLICY helixa_sequence_enrollments_select ON public.sequence_enrollments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sequences s
      WHERE s.id = sequence_id
        AND (
          (s.workspace_id IS NOT NULL AND public.helixa_can_read_workspace(s.workspace_id))
          OR public.helixa_owns_profile(s.user_id)
          OR public.helixa_is_admin()
        )
    )
  );

DROP POLICY IF EXISTS helixa_giveaway_entries_select ON public.giveaway_entries;
CREATE POLICY helixa_giveaway_entries_select ON public.giveaway_entries
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.giveaways g
      WHERE g.id = giveaway_id
        AND (
          (g.workspace_id IS NOT NULL AND public.helixa_can_read_workspace(g.workspace_id))
          OR public.helixa_owns_profile(g.user_id)
          OR public.helixa_is_admin()
        )
    )
  );
