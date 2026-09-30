-- Phase 3: workspace contacts, messaging window, message direction, click tracking.
-- Run after 20260930_phase2_workspaces_and_events.sql. Idempotent. Does not delete rows.
-- Do not run this from the app. Run it in the Supabase SQL editor.

-- ---------------------------------------------------------------------------
-- Outbound vs inbound. The old is_from_instagram flag meant inbound on
-- Instagram and WhatsApp, and was false for both directions on Messenger
-- and Telegram. sender_id matching the conversation recipient is the inbound
-- message.
-- ---------------------------------------------------------------------------
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS direction text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'messages_direction_check'
  ) THEN
    ALTER TABLE public.messages
      ADD CONSTRAINT messages_direction_check
      CHECK (direction IS NULL OR direction IN ('in', 'out'));
  END IF;
END $$;

UPDATE public.messages m
SET direction = CASE
  WHEN c.recipient_id IS NOT NULL AND m.sender_id::text = c.recipient_id::text THEN 'in'
  WHEN COALESCE(m.is_from_instagram, false) THEN 'in'
  ELSE 'out'
END
FROM public.conversations c
WHERE m.conversation_id = c.id
  AND m.direction IS NULL;

UPDATE public.messages
SET direction = CASE WHEN COALESCE(is_from_instagram, false) THEN 'in' ELSE 'out' END
WHERE direction IS NULL;

CREATE INDEX IF NOT EXISTS messages_user_direction_idx
  ON public.messages (user_id, direction);

-- ---------------------------------------------------------------------------
-- One contact per person per channel, scoped to the workspace.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id bigint NOT NULL,
  channel text NOT NULL,
  external_id text NOT NULL,
  display_name text,
  username text,
  tags text[] NOT NULL DEFAULT '{}',
  custom_fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  source text,
  source_automation_id uuid,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  last_inbound_at timestamptz,
  bot_paused boolean NOT NULL DEFAULT false,
  email text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS contacts_user_channel_external_idx
  ON public.contacts (user_id, channel, external_id);

CREATE INDEX IF NOT EXISTS contacts_workspace_idx
  ON public.contacts (workspace_id, last_seen_at DESC);

CREATE INDEX IF NOT EXISTS contacts_last_inbound_idx
  ON public.contacts (user_id, channel, last_inbound_at);

-- ---------------------------------------------------------------------------
-- Redirect targets for /r/[code]. A hit writes automation_events.link_click.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tracked_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  workspace_id uuid,
  user_id bigint,
  automation_id uuid,
  variant_id uuid,
  channel text,
  contact_external_id text,
  destination_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tracked_links_user_idx ON public.tracked_links (user_id);

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracked_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS helixa_contacts_select ON public.contacts;
CREATE POLICY helixa_contacts_select ON public.contacts
  FOR SELECT TO authenticated
  USING (
    (workspace_id IS NOT NULL AND public.helixa_can_read_workspace(workspace_id))
    OR public.helixa_owns_profile(user_id)
    OR public.helixa_is_admin()
  );

DROP POLICY IF EXISTS helixa_tracked_links_select ON public.tracked_links;
CREATE POLICY helixa_tracked_links_select ON public.tracked_links
  FOR SELECT TO authenticated
  USING (
    (workspace_id IS NOT NULL AND public.helixa_can_read_workspace(workspace_id))
    OR public.helixa_owns_profile(user_id)
    OR public.helixa_is_admin()
  );

-- The redirect and the webhooks use the service role, which bypasses RLS.
-- authenticated has no insert/update policy, so the browser cannot write these.
