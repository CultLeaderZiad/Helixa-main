-- 1. Create ice_breakers table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.ice_breakers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    response TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create ai_usage_log table
CREATE TABLE IF NOT EXISTS public.ai_usage_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    feature TEXT NOT NULL,
    model TEXT NOT NULL,
    tokens_used INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Add AI configuration columns to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS ai_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ai_context TEXT;

-- 4. Set up RLS (Row Level Security) for new tables
ALTER TABLE public.ice_breakers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_log ENABLE ROW LEVEL SECURITY;

-- 5. Create basic RLS policies
-- (Note: Service role always bypasses RLS)

CREATE POLICY "Users can manage their own ice breakers"
    ON public.ice_breakers
    FOR ALL
    USING (user_id IN (
        SELECT id FROM public.users WHERE id = auth.uid()
    ));

CREATE POLICY "Users can view their own AI usage logs"
    ON public.ai_usage_log
    FOR SELECT
    USING (user_id IN (
        SELECT id FROM public.users WHERE id = auth.uid()
    ));
