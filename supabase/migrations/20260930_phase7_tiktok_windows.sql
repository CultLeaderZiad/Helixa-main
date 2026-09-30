-- TikTok DM windows: 10 business messages in the 48 hours after each user message.
-- Run after 20260930_phase7_launch.sql. Do not run this from the app.
-- Idempotent. It does not delete tenant rows.

CREATE TABLE IF NOT EXISTS public.tiktok_dm_windows (
  business_open_id text NOT NULL,
  contact_external_id text NOT NULL,
  window_started_at timestamptz NOT NULL,
  business_sends integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (business_open_id, contact_external_id)
);

ALTER TABLE public.tiktok_dm_windows ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tiktok_dm_windows FROM anon, authenticated;
