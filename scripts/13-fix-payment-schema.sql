-- Migration: Add missing columns to payment_submissions
-- Run this in your Supabase SQL Editor

ALTER TABLE public.payment_submissions 
ADD COLUMN IF NOT EXISTS proof_note TEXT;

ALTER TABLE public.payment_submissions 
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'vodafone_cash';

ALTER TABLE public.payment_submissions 
ADD COLUMN IF NOT EXISTS plan_id TEXT;
