-- ============================================================================
-- Migration 57: Platform Content & Comment Sentiment Analysis
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
-- ============================================================================

-- 1. Table: platform_content (Resolved posts from Facebook & Instagram)
CREATE TABLE IF NOT EXISTS public.platform_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('facebook', 'instagram', 'telegram', 'messenger', 'whatsapp')),
  external_post_id TEXT NOT NULL,
  permalink TEXT,
  caption TEXT,
  thumbnail_url TEXT,
  author_name TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (account_id, platform, external_post_id)
);

CREATE INDEX IF NOT EXISTS idx_platform_content_account ON public.platform_content(account_id);
CREATE INDEX IF NOT EXISTS idx_platform_content_post ON public.platform_content(external_post_id);
CREATE INDEX IF NOT EXISTS idx_platform_content_platform_post ON public.platform_content(platform, external_post_id);

-- 2. Table: comment_sentiment (Groq-analyzed sentiment cached per comment)
CREATE TABLE IF NOT EXISTS public.comment_sentiment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  platform_content_id UUID REFERENCES public.platform_content(id) ON DELETE SET NULL,
  external_post_id TEXT NOT NULL,
  comment_id TEXT NOT NULL UNIQUE,
  comment_text TEXT NOT NULL,
  sentiment TEXT NOT NULL CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  confidence NUMERIC(4, 2) DEFAULT 1.0,
  raw_analysis JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_comment_sentiment_post ON public.comment_sentiment(external_post_id);
CREATE INDEX IF NOT EXISTS idx_comment_sentiment_account ON public.comment_sentiment(account_id);
CREATE INDEX IF NOT EXISTS idx_comment_sentiment_comment ON public.comment_sentiment(comment_id);

-- 3. Enhance automation_events with post_id for direct per-post activity queries
ALTER TABLE public.automation_events ADD COLUMN IF NOT EXISTS post_id TEXT;
CREATE INDEX IF NOT EXISTS idx_automation_events_post_id ON public.automation_events(post_id);

-- 4. Row-Level Security (RLS)
ALTER TABLE public.platform_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_sentiment ENABLE ROW LEVEL SECURITY;

-- Allow accounts to manage their own platform_content
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Accounts can view and manage their own platform content' AND tablename = 'platform_content') THEN
    CREATE POLICY "Accounts can view and manage their own platform content"
      ON public.platform_content
      FOR ALL
      USING (account_id = auth.uid())
      WITH CHECK (account_id = auth.uid());
  END IF;
END $$;

-- Allow accounts to view and manage their own comment_sentiment
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Accounts can view and manage their comment sentiment' AND tablename = 'comment_sentiment') THEN
    CREATE POLICY "Accounts can view and manage their comment sentiment"
      ON public.comment_sentiment
      FOR ALL
      USING (account_id = auth.uid())
      WITH CHECK (account_id = auth.uid());
  END IF;
END $$;
