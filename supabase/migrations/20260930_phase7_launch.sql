-- Phase 7: plans, usage meters, reseller billing, trials, dunning, data deletion.
-- Run after 20260930_phase6_differentiators.sql. Do not run this from the app.
-- Idempotent. It does not delete tenant rows.

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS bot_locale text NOT NULL DEFAULT 'en';
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS bot_locale text NOT NULL DEFAULT 'en';

CREATE TABLE IF NOT EXISTS public.billing_accounts (
  account_id uuid PRIMARY KEY,
  plan_id text NOT NULL,
  status text NOT NULL DEFAULT 'trialing',
  interval text NOT NULL DEFAULT 'month',
  provider text,
  provider_customer_id text,
  provider_subscription_id text,
  current_period_end timestamptz,
  trial_ends_at timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  scheduled_plan_id text,
  grace_until timestamptz,
  dunning_step integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'billing_accounts_status_check') THEN
    ALTER TABLE public.billing_accounts
      ADD CONSTRAINT billing_accounts_status_check
      CHECK (status IN ('trialing', 'active', 'past_due', 'canceled', 'expired'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.usage_meters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL,
  metric text NOT NULL,
  period text NOT NULL,
  used integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, metric, period)
);

CREATE INDEX IF NOT EXISTS usage_meters_account_idx ON public.usage_meters (account_id, period);

CREATE TABLE IF NOT EXISTS public.client_workspace_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  workspace_id uuid NOT NULL UNIQUE,
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'usd',
  interval text NOT NULL DEFAULT 'month',
  provider text NOT NULL DEFAULT 'stripe',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.client_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  workspace_id uuid NOT NULL,
  user_id bigint,
  amount_cents integer NOT NULL,
  currency text NOT NULL,
  provider text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  provider_reference text,
  checkout_url text,
  period_start timestamptz,
  period_end timestamptz,
  due_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS client_invoices_workspace_idx ON public.client_invoices (workspace_id, created_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'client_invoices_status_check') THEN
    ALTER TABLE public.client_invoices
      ADD CONSTRAINT client_invoices_status_check
      CHECK (status IN ('open', 'paid', 'past_due', 'void'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.data_deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  confirmation_code text NOT NULL UNIQUE,
  provider text NOT NULL,
  external_user_id text,
  status text NOT NULL DEFAULT 'received',
  detail text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE OR REPLACE FUNCTION public.increment_usage(p_account uuid, p_metric text, p_period text, p_delta int)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_used int;
BEGIN
  INSERT INTO public.usage_meters (account_id, metric, period, used)
  VALUES (p_account, p_metric, p_period, GREATEST(COALESCE(p_delta, 1), 0))
  ON CONFLICT (account_id, metric, period)
  DO UPDATE SET used = public.usage_meters.used + EXCLUDED.used, updated_at = now()
  RETURNING used INTO next_used;
  RETURN next_used;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_usage(uuid, text, text, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_usage(uuid, text, text, int) TO service_role;

ALTER TABLE public.billing_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_meters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_workspace_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_deletion_requests ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.data_deletion_requests FROM anon, authenticated;

DROP POLICY IF EXISTS helixa_billing_accounts_select ON public.billing_accounts;
CREATE POLICY helixa_billing_accounts_select ON public.billing_accounts
  FOR SELECT TO authenticated
  USING (account_id = auth.uid() OR public.helixa_is_admin());

DROP POLICY IF EXISTS helixa_usage_meters_select ON public.usage_meters;
CREATE POLICY helixa_usage_meters_select ON public.usage_meters
  FOR SELECT TO authenticated
  USING (account_id = auth.uid() OR public.helixa_is_admin());

DROP POLICY IF EXISTS helixa_client_prices_select ON public.client_workspace_prices;
CREATE POLICY helixa_client_prices_select ON public.client_workspace_prices
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.agencies a
      WHERE a.id = agency_id AND (a.owner_account_id = auth.uid() OR public.helixa_is_admin())
    )
  );

DROP POLICY IF EXISTS helixa_client_invoices_select ON public.client_invoices;
CREATE POLICY helixa_client_invoices_select ON public.client_invoices
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.agencies a
      WHERE a.id = agency_id AND (a.owner_account_id = auth.uid() OR public.helixa_is_admin())
    )
  );
