-- ============================================================================
-- Agents system: catalog, plan-gating, per-account settings, encrypted BYOK
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- The catalog of AI agents that exist in the codebase (admin-managed)
CREATE TABLE IF NOT EXISTS public.agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  provider TEXT NOT NULL CHECK (provider IN ('groq', 'gemini', 'openrouter', 'byok')),
  category TEXT,
  requires_byok BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Which agents are included in which plan (admin-managed matrix)
CREATE TABLE IF NOT EXISTS public.plan_agents (
  plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  PRIMARY KEY (plan_id, agent_id)
);

-- Per-account agent state: on/off, which platform, and encrypted BYOK key
CREATE TABLE IF NOT EXISTS public.account_agent_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  platform_connection_id UUID REFERENCES public.platform_connections(id) ON DELETE SET NULL,
  byok_key_encrypted BYTEA,
  byok_provider TEXT,
  byok_connected_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (account_id, agent_id)
);
CREATE INDEX IF NOT EXISTS idx_account_agent_settings_account ON public.account_agent_settings(account_id);

-- Reuse the existing ai_usage_log pattern, extended with an agent reference
ALTER TABLE public.ai_usage_log ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL;

ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_agent_settings ENABLE ROW LEVEL SECURITY;

-- Seed the initial catalog (safe to run once — ON CONFLICT DO NOTHING)
INSERT INTO public.agents (agent_key, name, description, provider, category, requires_byok, sort_order)
VALUES
  ('send_trigger_replies', 'Send-trigger replies', 'Rewrites replies to earn more DM shares', 'groq', 'growth', false, 1),
  ('weekly_coach_digest', 'Weekly coach digest', 'Plain-English performance summary', 'groq', 'analytics', false, 2),
  ('hook_strength_checker', 'Hook strength checker', 'Reviews a reel''s first 3 seconds', 'gemini', 'content', false, 3),
  ('comment_themes', 'What people are asking', 'Clusters recent comments into themes', 'groq', 'analytics', false, 4),
  ('faq_detector', 'FAQ detector', 'Surfaces repeated DM questions', 'groq', 'analytics', false, 5),
  ('niche_consistency', 'Niche consistency', 'Flags topic drift across recent posts', 'groq', 'content', false, 6)
ON CONFLICT (agent_key) DO NOTHING;
