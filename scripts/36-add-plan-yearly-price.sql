-- Migration: Add price_yearly and is_contact_sales to plans

ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS price_yearly DECIMAL(10, 2);
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS is_contact_sales BOOLEAN NOT NULL DEFAULT false;
