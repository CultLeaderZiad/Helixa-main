-- Migration: Add scheduling to email campaigns
-- Run this in your Supabase SQL Editor

ALTER TABLE public.email_campaigns 
  ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE public.email_campaigns 
  DROP CONSTRAINT IF EXISTS email_campaigns_status_check;

ALTER TABLE public.email_campaigns 
  ADD CONSTRAINT email_campaigns_status_check CHECK (status IN ('draft', 'scheduled', 'sending', 'completed', 'failed'));
