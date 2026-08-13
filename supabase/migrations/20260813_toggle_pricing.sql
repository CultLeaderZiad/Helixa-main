-- ============================================================================
-- Toggle-based pricing (monthly/annual same tier) + Enterprise inquiries
-- ============================================================================

-- Support a second price for the annual toggle on the same plan row,
-- instead of separate Monthly/Yearly plan rows
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS price_yearly NUMERIC(10,2);
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS is_contact_sales BOOLEAN NOT NULL DEFAULT FALSE;

-- Widen billing_cycle to allow an 'enterprise' marker (dynamic, safe
-- against whatever values already exist — same pattern as the earlier
-- billing_cycle fix)
DO $$
DECLARE
  existing_values TEXT[];
  new_values TEXT[] := ARRAY['monthly','yearly','lifetime','enterprise'];
  all_values TEXT[];
  constraint_list TEXT;
  r RECORD;
BEGIN
  EXECUTE 'SELECT array_agg(DISTINCT billing_cycle) FROM public.plans' INTO existing_values;
  IF existing_values IS NULL THEN existing_values := ARRAY[]::TEXT[]; END IF;
  SELECT array_agg(DISTINCT v) INTO all_values FROM unnest(existing_values || new_values) AS v;

  FOR r IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.plans'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%billing_cycle%'
  LOOP
    EXECUTE format('ALTER TABLE public.plans DROP CONSTRAINT %I', r.conname);
  END LOOP;

  SELECT string_agg(quote_literal(v), ', ') INTO constraint_list FROM unnest(all_values) AS v;
  EXECUTE format(
    'ALTER TABLE public.plans ADD CONSTRAINT plans_billing_cycle_check CHECK (billing_cycle IN (%s))',
    constraint_list
  );
END $$;

-- Enterprise/custom plan inquiries — public lead capture, admin-reviewed
CREATE TABLE IF NOT EXISTS public.enterprise_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  needs_description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note TEXT,
  reviewed_by BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_enterprise_inquiries_status ON public.enterprise_inquiries(status);

ALTER TABLE public.enterprise_inquiries ENABLE ROW LEVEL SECURITY;
