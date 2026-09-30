-- Phase 4: WhatsApp numbers, TikTok tokens, website chat.
-- Run after 20260930_phase3_contacts_and_clicks.sql. Idempotent. Does not delete rows.
-- Do not run this from the app. Run it in the Supabase SQL editor.

-- ---------------------------------------------------------------------------
-- A conversation remembers which number, TikTok account, or widget it uses.
-- The old unique (user_id, recipient_id) would collapse two WhatsApp numbers
-- into one thread. The replacement includes platform and channel account.
-- ---------------------------------------------------------------------------
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS channel_account_id text;

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS external_thread_id text;

DO $$
DECLARE
  constraint_name text;
BEGIN
  FOR constraint_name IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'conversations'
      AND con.contype = 'u'
      AND pg_get_constraintdef(con.oid) ILIKE '%user_id%'
      AND pg_get_constraintdef(con.oid) ILIKE '%recipient_id%'
      AND pg_get_constraintdef(con.oid) NOT ILIKE '%channel_account_id%'
  LOOP
    EXECUTE format('ALTER TABLE public.conversations DROP CONSTRAINT %I', constraint_name);
  END LOOP;
END $$;

DO $$
BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS conversations_user_recipient_channel_idx
    ON public.conversations (
      user_id,
      recipient_id,
      COALESCE(platform, ''),
      COALESCE(channel_account_id, '')
    );
EXCEPTION
  WHEN unique_violation THEN
    RAISE NOTICE 'conversations_user_recipient_channel_idx was not created because duplicate threads exist. Deduplicate, then re-run this statement.';
END $$;

-- ---------------------------------------------------------------------------
-- TikTok refresh tokens. SELECT is revoked the same way as access_token.
-- ---------------------------------------------------------------------------
ALTER TABLE public.platform_connections
  ADD COLUMN IF NOT EXISTS refresh_token text;

ALTER TABLE public.platform_connections
  ADD COLUMN IF NOT EXISTS token_expires_at timestamptz;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'platform_connections' AND column_name = 'refresh_token'
  ) THEN
    EXECUTE 'REVOKE SELECT (refresh_token) ON public.platform_connections FROM anon, authenticated';
  END IF;
END $$;

-- Widen platform checks so tiktok and webchat can be stored and queued.
DO $$
DECLARE
  constraint_name text;
BEGIN
  FOR constraint_name IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'platform_connections'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%platform%'
      AND pg_get_constraintdef(con.oid) ILIKE '%whatsapp%'
  LOOP
    EXECUTE format('ALTER TABLE public.platform_connections DROP CONSTRAINT %I', constraint_name);
  END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'platform_connections_platform_check') THEN
    ALTER TABLE public.platform_connections
      ADD CONSTRAINT platform_connections_platform_check
      CHECK (platform IN ('instagram', 'facebook', 'messenger', 'whatsapp', 'telegram', 'tiktok', 'webchat'));
  END IF;
END $$;

DO $$
DECLARE
  constraint_name text;
BEGIN
  FOR constraint_name IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'inbound_events'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%platform%'
      AND pg_get_constraintdef(con.oid) ILIKE '%instagram%'
  LOOP
    EXECUTE format('ALTER TABLE public.inbound_events DROP CONSTRAINT %I', constraint_name);
  END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inbound_events_platform_check') THEN
    ALTER TABLE public.inbound_events
      ADD CONSTRAINT inbound_events_platform_check
      CHECK (platform IN ('instagram', 'facebook', 'messenger', 'whatsapp', 'telegram', 'tiktok', 'webchat'));
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Approved WhatsApp templates, copied from the WABA. The browser can read
-- them. Only the service role writes them.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.whatsapp_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id bigint NOT NULL,
  workspace_id uuid,
  phone_number_id text NOT NULL,
  waba_id text,
  name text NOT NULL,
  language text NOT NULL,
  status text NOT NULL,
  category text,
  components jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, phone_number_id, name, language)
);

CREATE INDEX IF NOT EXISTS whatsapp_templates_user_idx
  ON public.whatsapp_templates (user_id, status);

ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS helixa_whatsapp_templates_select ON public.whatsapp_templates;
CREATE POLICY helixa_whatsapp_templates_select ON public.whatsapp_templates
  FOR SELECT TO authenticated
  USING (
    (workspace_id IS NOT NULL AND public.helixa_can_read_workspace(workspace_id))
    OR public.helixa_owns_profile(user_id)
    OR public.helixa_is_admin()
  );

-- ---------------------------------------------------------------------------
-- Website chat. Visitors have no Supabase session. secret_hash is not
-- readable by authenticated or anon. The widget polls a server route.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.webchat_widgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id bigint NOT NULL,
  workspace_id uuid,
  public_key text NOT NULL UNIQUE,
  name text NOT NULL DEFAULT 'Chat',
  greeting text,
  color text NOT NULL DEFAULT '#111111',
  locale text NOT NULL DEFAULT 'en',
  allowed_domains text[] NOT NULL DEFAULT '{}',
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.webchat_visitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  widget_id uuid NOT NULL REFERENCES public.webchat_widgets(id) ON DELETE CASCADE,
  visitor_id text NOT NULL,
  secret_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (widget_id, visitor_id)
);

CREATE TABLE IF NOT EXISTS public.webchat_rate_buckets (
  bucket_key text PRIMARY KEY,
  window_start timestamptz NOT NULL,
  count integer NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.webchat_widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webchat_visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webchat_rate_buckets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS helixa_webchat_widgets_select ON public.webchat_widgets;
CREATE POLICY helixa_webchat_widgets_select ON public.webchat_widgets
  FOR SELECT TO authenticated
  USING (
    (workspace_id IS NOT NULL AND public.helixa_can_read_workspace(workspace_id))
    OR public.helixa_owns_profile(user_id)
    OR public.helixa_is_admin()
  );

-- No policy on webchat_visitors or webchat_rate_buckets: default deny.
-- The service role bypasses RLS. Revoke the hash anyway.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'webchat_visitors' AND column_name = 'secret_hash'
  ) THEN
    EXECUTE 'REVOKE SELECT (secret_hash) ON public.webchat_visitors FROM anon, authenticated';
  END IF;
END $$;
