-- Migration: Add audience selection to email campaigns
-- Run this in your Supabase SQL Editor

ALTER TABLE public.email_campaigns
ADD COLUMN IF NOT EXISTS target_account_ids UUID[] DEFAULT NULL;
