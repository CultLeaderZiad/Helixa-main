-- Payment ledger for merchant commerce (Paymob/Tap) and platform-billing receipts.
-- Each callback now binds to the stored payment intent using the id the provider
-- signed, never body metadata, and guards every row on status='pending' so a
-- replay is a no-op.
--
-- RLS: billing_accounts owns entitlements. This ledger is write-once for a given
-- provider/transaction id and is read by the receipts router; it does not change
-- what a tenant may do. Impose grants as in your deployment (admin/service_role).

-- payment_intents: the single source of truth the callbacks verify against
CREATE TABLE IF NOT EXISTS public.payment_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  order_id text,            -- legacy orders.id the merchant_order_id pointed at (nullable)
  invoice_id uuid,          -- client_invoices.id (nullable)
  provider text NOT NULL,   -- paymob | tap | stripe
  provider_order_id text NOT NULL,  -- Paymob obj.id / Tap charge id / Stripe session id
  amount_minor integer NOT NULL,
  currency text NOT NULL,
  status text NOT NULL DEFAULT 'pending',  -- pending | paid | cancelled | failed
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_intents ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_intents_provider_check') THEN
    ALTER TABLE public.payment_intents
      ADD CONSTRAINT payment_intents_provider_check
      CHECK (provider IN ('paymob', 'tap', 'stripe'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_intents_provider_order
  ON public.payment_intents (provider, provider_order_id);

-- payment_receipts: idempotent log for every successful capture, keyed by the
-- provider's own transaction id so replays never duplicate a receipt.
CREATE TABLE IF NOT EXISTS public.payment_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  provider_order_id text NOT NULL,
  transaction_id text NOT NULL,   -- provider's transaction/charge id
  account_id uuid NOT NULL,
  amount_minor integer NOT NULL,
  currency text NOT NULL,
  status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  reminders_sent boolean NOT NULL DEFAULT false
);

ALTER TABLE public.payment_receipts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_receipts_provider_check') THEN
    ALTER TABLE public.payment_receipts
      ADD CONSTRAINT payment_receipts_provider_check
      CHECK (provider IN ('paymob', 'tap', 'stripe'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_receipts_transaction
  ON public.payment_receipts (provider, transaction_id);
