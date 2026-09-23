-- ============================================================================
-- 41. AI Weekly Coach Digest storage
-- ----------------------------------------------------------------------------
-- The `weekly_coach_digest` agent was seeded in scripts/32 but had NO runtime:
-- there was no cron job and nowhere to store a digest. This table stores one
-- row per account per ISO week so the AI Engine can display the latest digest
-- and the cron job can skip weeks that were already generated.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ai_coach_digests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  content TEXT NOT NULL,
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  provider TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (account_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_ai_coach_digests_account
  ON public.ai_coach_digests(account_id, week_start DESC);

ALTER TABLE public.ai_coach_digests ENABLE ROW LEVEL SECURITY;

-- Users can read only their own digests (service role bypasses RLS for writes)
DROP POLICY IF EXISTS "Users read own coach digests" ON public.ai_coach_digests;
CREATE POLICY "Users read own coach digests"
  ON public.ai_coach_digests
  FOR SELECT
  USING (account_id = auth.uid());

-- ============================================================================
-- Ensure the agent catalog contains the runtime agents added in this release.
-- Safe to re-run (ON CONFLICT DO NOTHING).
-- ============================================================================
INSERT INTO public.agents (agent_key, name, description, provider, category, requires_byok, sort_order)
VALUES
  ('auto_reply', 'AI Auto-Reply', 'Answers DMs with conversation memory when no rule matches', 'groq', 'growth', false, 10),
  ('weekly_coach_digest', 'Weekly coach digest', 'Plain-English performance summary, generated every week', 'groq', 'analytics', false, 2)
ON CONFLICT (agent_key) DO NOTHING;
