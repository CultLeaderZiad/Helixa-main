-- Migration: Plans → new schema (price_usd / billing_cycle)
-- Run this in your Supabase SQL Editor (DESTRUCTIVE for the old `plans` table + its rows).
--
-- Summary:
--   1. Drops the OLD live `plans` table (schema: price / currency 'EGP' / slug /
--      billing_interval / trial_enabled / trial_days / is_featured / sort_order).
--   2. Recreates `plans` with the schema the app expects
--      (price_usd / billing_cycle / stripe_price_id, features JSONB).
--   3. Seeds default USD plans (editable later in Admin → Plans).
--   4. Adds plan_id / proof_note / payment_method columns to payment_submissions
--      (required by the checkout submission + admin review flow).
--   5. Creates the payment_methods table (schema completeness, from script 16).

-- ==========================================
-- 1. Drop OLD plans table (CASCADE is safe: payment_submissions has no FK to plans)
-- ==========================================
DROP TABLE IF EXISTS public.plans CASCADE;

-- ==========================================
-- 2. Recreate plans with the NEW schema
-- ==========================================
CREATE TABLE public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price_usd DECIMAL(10, 2) NOT NULL,
  billing_cycle TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly', 'lifetime')),
  features JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT true,
  stripe_price_id TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 3. Seed default plans (covers all billing_cycle values the UI supports)
-- ==========================================
INSERT INTO public.plans (name, description, price_usd, billing_cycle, features, is_active)
VALUES
  ('Monthly Plan', 'Full access, billed monthly', 9.99, 'monthly', '["Unlimited automations", "Priority support"]', true),
  ('Yearly Plan', 'Full access, billed yearly', 99.99, 'yearly', '["Unlimited automations", "Priority support", "2 months free"]', true),
  ('Lifetime Deal', 'Pay once, use forever', 199.99, 'lifetime', '["Unlimited automations", "Priority support", "Early access to new features"]', true);

-- ==========================================
-- 4. payment_submissions: add columns used by checkout submit + admin review
-- ==========================================
ALTER TABLE public.payment_submissions ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES public.plans(id);
ALTER TABLE public.payment_submissions ADD COLUMN IF NOT EXISTS proof_note TEXT;
ALTER TABLE public.payment_submissions ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'vodafone_cash' CHECK (payment_method IN ('stripe', 'vodafone_cash'));

-- ==========================================
-- 5. payment_methods (from script 16; kept for schema completeness)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL CHECK (provider IN ('stripe', 'vodafone_cash', 'manual')),
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
