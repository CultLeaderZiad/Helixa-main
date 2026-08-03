-- ============================================================
-- 02-supabase-schema-upgrade.sql
-- Additive, idempotent migration for InstaAuto security overhaul.
-- Safe to run multiple times — uses IF NOT EXISTS throughout.
-- ============================================================

-- 1. Sessions table — server-verified opaque tokens
CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Fast lookup by token (the hot path on every authenticated request)
CREATE INDEX IF NOT EXISTS idx_sessions_token ON public.sessions(session_token);
-- Cleanup of expired sessions
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON public.sessions(expires_at);

-- 2. New columns on users for RBAC, trial, and abuse tracking
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'trial';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS signup_ip TEXT;
