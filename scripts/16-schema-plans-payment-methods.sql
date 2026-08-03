-- Migration: Plans and Payment Methods
-- Run this in your Supabase SQL Editor

-- ==========================================
-- plans
-- ==========================================
CREATE TABLE IF NOT EXISTS public.plans (
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
-- payment_methods
-- ==========================================
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL CHECK (provider IN ('stripe', 'vodafone_cash', 'manual')),
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  config JSONB NOT NULL DEFAULT '{}', -- e.g. {"phone_number": "+20 01037312994", "instructions": "..."}
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Seed initial plans
INSERT INTO public.plans (name, description, price_usd, billing_cycle, features, is_active)
VALUES
  ('Monthly Plan', 'Full access, billed monthly', 9.99, 'monthly', '["Unlimited automations", "Priority support"]', true),
  ('Lifetime Deal', 'Pay once, use forever', 49.99, 'lifetime', '["Unlimited automations", "Priority support", "Early access to new features"]', true);

-- Seed initial payment methods
INSERT INTO public.payment_methods (provider, name, is_active, config)
VALUES
  ('stripe', 'Credit / Debit Card', true, '{}'),
  ('vodafone_cash', 'Vodafone Cash', true, '{"phone_number": "+20 01037312994", "instructions": "Send exact amount to this number and submit the transaction receipt details below."}');
