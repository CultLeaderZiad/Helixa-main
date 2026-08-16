-- Migration: Newsletter Subscribers
-- Run this in your Supabase SQL Editor

-- 1. Create Newsletter Subscribers Table
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS for newsletter_subscribers
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Admins can view and manage newsletter_subscribers
CREATE POLICY "Admins can manage newsletter_subscribers" ON public.newsletter_subscribers FOR ALL
USING (EXISTS (SELECT 1 FROM public.accounts WHERE id = auth.uid() AND role = 'admin'));

-- 2. Alter email_campaign_recipients table
ALTER TABLE public.email_campaign_recipients 
  ALTER COLUMN account_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS subscriber_id UUID REFERENCES public.newsletter_subscribers(id) ON DELETE CASCADE;

-- Ensure at least one is present
ALTER TABLE public.email_campaign_recipients
  ADD CONSTRAINT chk_recipient_target CHECK (account_id IS NOT NULL OR subscriber_id IS NOT NULL);

-- 3. Alter email_logs table
ALTER TABLE public.email_logs
  ADD COLUMN IF NOT EXISTS subscriber_id UUID REFERENCES public.newsletter_subscribers(id) ON DELETE SET NULL;
