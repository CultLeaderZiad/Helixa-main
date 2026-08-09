-- Migration: AI Comment Themes and FAQ Suggestions

CREATE TABLE public.ai_comment_themes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id bigint REFERENCES public.users(id) ON DELETE CASCADE,
  theme text NOT NULL,
  keywords text NOT NULL,
  examples text,
  count integer DEFAULT 1,
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX ai_comment_themes_user_id_idx ON public.ai_comment_themes(user_id);

CREATE TABLE public.ai_faq_suggestions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id bigint REFERENCES public.users(id) ON DELETE CASCADE,
  question text NOT NULL,
  suggested_answer text NOT NULL,
  count integer DEFAULT 1,
  is_dismissed boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX ai_faq_suggestions_user_id_idx ON public.ai_faq_suggestions(user_id);

-- Add rate limiting columns to users
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS ai_themes_last_analyzed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS ai_faq_last_analyzed_at timestamp with time zone;

-- Enable RLS and setup policies
ALTER TABLE public.ai_comment_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_faq_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own comment themes" ON public.ai_comment_themes
  FOR ALL USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can manage their own faq suggestions" ON public.ai_faq_suggestions
  FOR ALL USING (auth.uid()::text = user_id::text);
