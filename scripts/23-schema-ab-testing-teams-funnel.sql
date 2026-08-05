-- Migration: A/B Testing, Team Seats, Funnel Analytics
-- Run this in your Supabase SQL Editor

-- ==========================================
-- Part 1: Admin trial exemption
-- ==========================================
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS trial_exempt BOOLEAN DEFAULT FALSE;

-- Set trial_exempt to true for existing admin accounts
UPDATE public.accounts SET trial_exempt = TRUE WHERE role = 'admin';

-- ==========================================
-- Part 2: A/B Testing on Automations
-- ==========================================
CREATE TABLE IF NOT EXISTS public.automation_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id UUID NOT NULL REFERENCES public.automations(id) ON DELETE CASCADE,
  variant_name TEXT NOT NULL, -- e.g. 'Variant A', 'Variant B'
  traffic_weight INTEGER NOT NULL DEFAULT 50,
  response_config JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_automation_variants_automation_id ON public.automation_variants(automation_id);

-- Add variant_id to automation_events to track which variant fired
ALTER TABLE public.automation_events ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES public.automation_variants(id) ON DELETE SET NULL;

-- ==========================================
-- Part 3: Agency Team Seats
-- ==========================================
CREATE TABLE IF NOT EXISTS public.agency_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  member_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'active')),
  permission_level TEXT NOT NULL DEFAULT 'viewer' CHECK (permission_level IN ('viewer', 'editor', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(agency_account_id, email)
);

CREATE INDEX IF NOT EXISTS idx_agency_team_members_agency ON public.agency_team_members(agency_account_id);
CREATE INDEX IF NOT EXISTS idx_agency_team_members_member ON public.agency_team_members(member_account_id);
