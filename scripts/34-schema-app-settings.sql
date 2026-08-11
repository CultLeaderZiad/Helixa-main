-- Create app_settings table
CREATE TABLE IF NOT EXISTS public.app_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Seed banner setting
INSERT INTO public.app_settings (key, value)
VALUES (
    'update_banner',
    '{"isActive": false, "message": "Helixa v2.0 is live! Check out the new features.", "link": "/dashboard/agents"}'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- Policies for app_settings
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Read access for everyone
CREATE POLICY "Public read access for app_settings"
    ON public.app_settings
    FOR SELECT
    TO authenticated, anon
    USING (true);

-- Update access for service role only (API routes handling auth)
CREATE POLICY "Service role full access on app_settings"
    ON public.app_settings
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
