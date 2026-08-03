-- ============================================================
-- 07-multi-platform-schema.sql
-- Additive migration for Multi-Platform Support (Facebook, Messenger, WhatsApp)
-- ============================================================

-- 1. Create platform_connections table
CREATE TABLE IF NOT EXISTS public.platform_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('facebook', 'messenger', 'whatsapp')),
  page_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, platform, page_id)
);

CREATE INDEX IF NOT EXISTS idx_platform_connections_user ON public.platform_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_platform_connections_page ON public.platform_connections(page_id);

-- 2. Add platform to automations
ALTER TABLE public.automations ADD COLUMN IF NOT EXISTS platform TEXT NOT NULL DEFAULT 'instagram';
CREATE INDEX IF NOT EXISTS idx_automations_platform ON public.automations(platform);

-- 3. Add platform to automation_events
ALTER TABLE public.automation_events ADD COLUMN IF NOT EXISTS platform TEXT NOT NULL DEFAULT 'instagram';
CREATE INDEX IF NOT EXISTS idx_automation_events_platform ON public.automation_events(platform);
