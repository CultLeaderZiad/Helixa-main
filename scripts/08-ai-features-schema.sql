-- Migration: AI Features Schema (Usage Logs and Suggestions)

CREATE TABLE public.ai_usage_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  feature text NOT NULL, -- e.g., 'analytics', 'copy_suggestion', 'keyword_suggestion'
  model text NOT NULL, -- e.g., 'llama3-8b-8192'
  tokens_used integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- Index for querying recent usage and rate-limiting
CREATE INDEX ai_usage_log_user_id_created_at_idx ON public.ai_usage_log(user_id, created_at);

CREATE TABLE public.ai_copy_suggestions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  automation_id uuid REFERENCES public.automations(id) ON DELETE CASCADE,
  original_text text NOT NULL,
  suggested_text text NOT NULL,
  accepted boolean, -- null initially, true when applied, false when dismissed
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX ai_copy_suggestions_user_id_idx ON public.ai_copy_suggestions(user_id);
CREATE INDEX ai_copy_suggestions_automation_id_idx ON public.ai_copy_suggestions(automation_id);

CREATE TABLE public.ai_keyword_suggestions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  automation_id uuid REFERENCES public.automations(id) ON DELETE CASCADE,
  original_keywords text NOT NULL,
  suggested_keywords text NOT NULL,
  accepted boolean,
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX ai_keyword_suggestions_user_id_idx ON public.ai_keyword_suggestions(user_id);
CREATE INDEX ai_keyword_suggestions_automation_id_idx ON public.ai_keyword_suggestions(automation_id);

-- Enable RLS and setup policies
ALTER TABLE public.ai_usage_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_copy_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_keyword_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own usage logs" ON public.ai_usage_log
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own copy suggestions" ON public.ai_copy_suggestions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own keyword suggestions" ON public.ai_keyword_suggestions
  FOR ALL USING (auth.uid() = user_id);
