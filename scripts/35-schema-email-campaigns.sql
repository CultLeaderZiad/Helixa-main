-- Migration: Email Campaigns System
-- Run this in your Supabase SQL Editor

-- 1. Create Email Campaigns Table
CREATE TABLE IF NOT EXISTS public.email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  preview_text TEXT,
  template TEXT NOT NULL,
  hero_image TEXT,
  heading TEXT,
  subheading TEXT,
  body_text TEXT,
  features JSONB DEFAULT '[]'::jsonb,
  cta_text TEXT,
  cta_url TEXT,
  audience_filter TEXT NOT NULL, -- e.g., 'all', 'trial', 'monthly', 'expired'
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sending', 'completed', 'failed')),
  recipient_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  sent_at TIMESTAMPTZ
);

-- 2. Create Email Campaign Recipients Table
CREATE TABLE IF NOT EXISTS public.email_campaign_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  provider_message_id TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  sent_at TIMESTAMPTZ
);

-- 3. Create Email Logs Table (for standalone logs and webhooks)
CREATE TABLE IF NOT EXISTS public.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.email_campaigns(id) ON DELETE SET NULL,
  account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent',
  provider_message_id TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_campaign_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- Admins can manage campaigns
CREATE POLICY "Admins can manage campaigns" ON public.email_campaigns FOR ALL
USING (EXISTS (SELECT 1 FROM public.accounts WHERE id = auth.uid() AND role = 'admin'));

-- Admins can manage recipients
CREATE POLICY "Admins can manage recipients" ON public.email_campaign_recipients FOR ALL
USING (EXISTS (SELECT 1 FROM public.accounts WHERE id = auth.uid() AND role = 'admin'));

-- Admins can view logs
CREATE POLICY "Admins can view logs" ON public.email_logs FOR ALL
USING (EXISTS (SELECT 1 FROM public.accounts WHERE id = auth.uid() AND role = 'admin'));
