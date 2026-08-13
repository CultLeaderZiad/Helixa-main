-- Migration: Add platforms JSONB column to plans table
ALTER TABLE public.plans
ADD COLUMN IF NOT EXISTS platforms JSONB DEFAULT '{"instagram":true,"facebook":true,"whatsapp":false,"telegram":false,"tiktok":false}'::jsonb NOT NULL;
