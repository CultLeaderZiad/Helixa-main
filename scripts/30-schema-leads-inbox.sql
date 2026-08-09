-- 1. Create leads table
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL DEFAULT 'instagram',
  ig_user_id TEXT NOT NULL,
  ig_username TEXT,
  email TEXT,
  phone TEXT,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, ig_user_id)
);

-- 2. Create conversation_state table
CREATE TABLE IF NOT EXISTS public.conversation_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  ig_user_id TEXT NOT NULL,
  automation_id UUID REFERENCES public.automations(id) ON DELETE CASCADE,
  current_step TEXT NOT NULL, 
  data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, ig_user_id)
);

-- 3. Ensure messages table has platform column (useful for later)
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'instagram';
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'instagram';

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_leads_user ON public.leads(user_id);
CREATE INDEX IF NOT EXISTS idx_conv_state_user ON public.conversation_state(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user ON public.conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id);

-- 4. Create ai_usage_log table
CREATE TABLE IF NOT EXISTS public.ai_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  feature TEXT NOT NULL,
  model TEXT NOT NULL,
  tokens_used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_user_date ON public.ai_usage_log(user_id, created_at);
