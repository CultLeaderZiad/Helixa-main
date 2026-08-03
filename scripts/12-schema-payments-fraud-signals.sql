-- Migration: Manual Payments and Fraud Signals
-- Run this in your Supabase SQL Editor

-- ==========================================
-- payment_submissions
-- ==========================================
CREATE TABLE IF NOT EXISTS public.payment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  transaction_reference TEXT NOT NULL,
  note TEXT,
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by BIGINT REFERENCES public.users(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payment_submissions_user ON public.payment_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_submissions_status ON public.payment_submissions(status);
CREATE INDEX IF NOT EXISTS idx_payment_submissions_created ON public.payment_submissions(created_at DESC);

-- ==========================================
-- Add missing columns to subscriptions
-- ==========================================
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'stripe' CHECK (payment_method IN ('stripe', 'vodafone_cash'));

-- ==========================================
-- Add missing columns to users
-- ==========================================
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS vpn_suspected BOOLEAN DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS ip_risk_score INTEGER;

CREATE INDEX IF NOT EXISTS idx_users_ip_risk ON public.users(ip_risk_score);
