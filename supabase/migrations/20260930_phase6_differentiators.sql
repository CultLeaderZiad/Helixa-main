-- Phase 6: Arabic agent, agency white-label, catalog, and integrations.
-- Run after 20260930_phase5_flows_broadcasts.sql. Idempotent. Does not delete rows.
-- Do not run this from the app. Enable the pgvector extension in the Supabase
-- dashboard before running this file if CREATE EXTENSION is restricted.

CREATE EXTENSION IF NOT EXISTS vector;

-- ---------------------------------------------------------------------------
-- Arabic-first agent. One settings row per workspace profile (users.id).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_agent_settings (
  user_id bigint PRIMARY KEY,
  workspace_id uuid,
  enabled boolean NOT NULL DEFAULT true,
  persona_name text NOT NULL DEFAULT 'Helixa',
  persona text NOT NULL DEFAULT '',
  tone text NOT NULL DEFAULT 'friendly',
  handoff_below numeric NOT NULL DEFAULT 0.45,
  stay_on_topic boolean NOT NULL DEFAULT true,
  min_similarity numeric NOT NULL DEFAULT 0.12,
  qualify_fields jsonb NOT NULL DEFAULT '["name","phone","email"]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_agent_settings_tone_check') THEN
    ALTER TABLE public.ai_agent_settings
      ADD CONSTRAINT ai_agent_settings_tone_check CHECK (tone IN ('friendly', 'professional', 'concise'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.knowledge_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid,
  user_id bigint NOT NULL,
  kind text NOT NULL,
  title text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  source_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'knowledge_sources_kind_check') THEN
    ALTER TABLE public.knowledge_sources
      ADD CONSTRAINT knowledge_sources_kind_check
      CHECK (kind IN ('faq', 'product', 'policy', 'website', 'document'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS knowledge_sources_user_idx ON public.knowledge_sources (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.knowledge_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid REFERENCES public.knowledge_sources(id) ON DELETE CASCADE,
  workspace_id uuid,
  user_id bigint NOT NULL,
  content text NOT NULL,
  embedding vector(384),
  embedder text NOT NULL DEFAULT 'hash-v1',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS knowledge_chunks_user_idx ON public.knowledge_chunks (user_id, embedder);

CREATE INDEX IF NOT EXISTS knowledge_chunks_embedding_idx
  ON public.knowledge_chunks
  USING hnsw (embedding vector_cosine_ops);

CREATE TABLE IF NOT EXISTS public.ai_answer_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid,
  user_id bigint NOT NULL,
  contact_external_id text,
  channel text,
  question text NOT NULL,
  answer text NOT NULL,
  dialect text,
  gulf text,
  arabizi boolean NOT NULL DEFAULT false,
  confidence numeric,
  handoff boolean NOT NULL DEFAULT false,
  handoff_reason text,
  sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_answer_logs_user_idx ON public.ai_answer_logs (user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.match_knowledge_chunks(
  p_user_id bigint,
  p_embedding vector(384),
  p_embedder text,
  p_limit int
)
RETURNS TABLE (id uuid, source_id uuid, content text, similarity float)
LANGUAGE sql
STABLE
AS $$
  SELECT c.id, c.source_id, c.content, (1 - (c.embedding <=> p_embedding))::float AS similarity
  FROM public.knowledge_chunks c
  WHERE c.user_id = p_user_id
    AND c.embedder = p_embedder
    AND c.embedding IS NOT NULL
  ORDER BY c.embedding <=> p_embedding
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 4), 20));
$$;

-- ---------------------------------------------------------------------------
-- Agency white-label. A custom domain resolves to one agency.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_account_id uuid NOT NULL,
  name text NOT NULL,
  app_name text NOT NULL DEFAULT 'Helixa',
  logo_url text,
  primary_color text NOT NULL DEFAULT '#5b4dff',
  accent_color text NOT NULL DEFAULT '#e5a93c',
  custom_domain text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS agencies_domain_idx
  ON public.agencies (lower(custom_domain))
  WHERE custom_domain IS NOT NULL AND custom_domain <> '';

CREATE INDEX IF NOT EXISTS agencies_owner_idx ON public.agencies (owner_account_id);

ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS agency_id uuid;

CREATE TABLE IF NOT EXISTS public.client_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid,
  user_id bigint NOT NULL,
  agency_id uuid,
  cadence text NOT NULL DEFAULT 'weekly',
  format text NOT NULL DEFAULT 'link',
  recipient_email text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  next_send_at timestamptz,
  last_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'client_reports_cadence_check') THEN
    ALTER TABLE public.client_reports
      ADD CONSTRAINT client_reports_cadence_check CHECK (cadence IN ('weekly', 'monthly'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'client_reports_format_check') THEN
    ALTER TABLE public.client_reports
      ADD CONSTRAINT client_reports_format_check CHECK (format IN ('pdf', 'link'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.client_report_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid REFERENCES public.client_reports(id) ON DELETE CASCADE,
  workspace_id uuid,
  period_label text NOT NULL,
  kpis jsonb NOT NULL DEFAULT '{}'::jsonb,
  share_token text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Catalog and orders.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid,
  user_id bigint NOT NULL,
  sku text,
  name text NOT NULL,
  description text,
  price_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EGP',
  image_url text,
  product_url text,
  in_stock boolean NOT NULL DEFAULT true,
  source text NOT NULL DEFAULT 'manual',
  external_id text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_source_check') THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_source_check CHECK (source IN ('manual', 'csv', 'shopify', 'woocommerce'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS products_external_idx
  ON public.products (user_id, source, external_id)
  WHERE external_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS products_user_idx ON public.products (user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid,
  user_id bigint NOT NULL,
  contact_id uuid,
  contact_external_id text,
  channel text,
  status text NOT NULL DEFAULT 'pending_payment',
  currency text NOT NULL DEFAULT 'EGP',
  total_cents integer NOT NULL DEFAULT 0,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  payment_provider text,
  payment_link text,
  payment_ref text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_status_check') THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_status_check
      CHECK (status IN ('draft', 'pending_payment', 'paid', 'fulfilled', 'cancelled', 'refunded'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS orders_user_idx ON public.orders (user_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Integrations: signed outgoing webhooks, API keys, provider secrets.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.outgoing_webhook_endpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid,
  user_id bigint NOT NULL,
  url text NOT NULL,
  secret_ciphertext text NOT NULL,
  events jsonb NOT NULL DEFAULT '[]'::jsonb,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.outgoing_webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_id uuid REFERENCES public.outgoing_webhook_endpoints(id) ON DELETE CASCADE,
  workspace_id uuid,
  user_id bigint NOT NULL,
  event text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'outgoing_webhook_deliveries_status_check') THEN
    ALTER TABLE public.outgoing_webhook_deliveries
      ADD CONSTRAINT outgoing_webhook_deliveries_status_check
      CHECK (status IN ('pending', 'done', 'dead'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS outgoing_webhook_due_idx
  ON public.outgoing_webhook_deliveries (next_attempt_at)
  WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS public.workspace_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid,
  user_id bigint NOT NULL,
  name text NOT NULL DEFAULT 'Key',
  prefix text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.integration_configs (
  user_id bigint NOT NULL,
  workspace_id uuid,
  kind text NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  secret_ciphertext text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, kind)
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'integration_configs_kind_check') THEN
    ALTER TABLE public.integration_configs
      ADD CONSTRAINT integration_configs_kind_check
      CHECK (kind IN ('paymob', 'stripe', 'shopify', 'woocommerce', 'sheets', 'hubspot'));
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- RLS. The app uses the service role. These policies cover a logged-in read.
-- ---------------------------------------------------------------------------
ALTER TABLE public.ai_agent_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_answer_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_report_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outgoing_webhook_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outgoing_webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_configs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.outgoing_webhook_deliveries FROM anon, authenticated;
REVOKE ALL ON public.workspace_api_keys FROM anon, authenticated;
REVOKE ALL ON public.integration_configs FROM anon, authenticated;

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'ai_agent_settings', 'knowledge_sources', 'knowledge_chunks', 'ai_answer_logs',
    'client_reports', 'products', 'orders', 'outgoing_webhook_endpoints'
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

DROP POLICY IF EXISTS helixa_agencies_select ON public.agencies;
CREATE POLICY helixa_agencies_select ON public.agencies
  FOR SELECT TO authenticated
  USING (owner_account_id = auth.uid() OR public.helixa_is_admin());

DROP POLICY IF EXISTS helixa_client_report_runs_select ON public.client_report_runs;
CREATE POLICY helixa_client_report_runs_select ON public.client_report_runs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.client_reports r
      WHERE r.id = report_id
        AND (
          (r.workspace_id IS NOT NULL AND public.helixa_can_read_workspace(r.workspace_id))
          OR public.helixa_owns_profile(r.user_id)
          OR public.helixa_is_admin()
        )
    )
  );
