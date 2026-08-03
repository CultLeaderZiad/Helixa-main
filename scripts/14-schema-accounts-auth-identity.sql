-- Migration: Accounts, Auth Identity, and Entitlements
-- Run this in your Supabase SQL Editor

-- 1. Create Accounts Table
CREATE TABLE IF NOT EXISTS public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  plan TEXT NOT NULL DEFAULT 'trial' CHECK (plan IN ('trial', 'monthly', 'one_time', 'expired')),
  trial_ends_at TIMESTAMPTZ DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days'),
  is_banned BOOLEAN NOT NULL DEFAULT false,
  banned_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON public.accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_email ON public.accounts(email);

-- 2. Add Account ID to existing Users (Instagram/Facebook Connections)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_users_account_id ON public.users(account_id);

-- 3. Trigger to Auto-Create Account on Signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.accounts (user_id, email, role, plan, trial_ends_at)
  VALUES (
    new.id, 
    new.email, 
    'user', 
    'trial', 
    CURRENT_TIMESTAMP + INTERVAL '7 days'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Safely recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Enable RLS (Assuming standard security)
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own account" 
  ON public.accounts FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all accounts" 
  ON public.accounts FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.accounts 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
