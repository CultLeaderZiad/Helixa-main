-- ============================================================================
-- 42. OAuth session hand-off table
-- ----------------------------------------------------------------------------
-- Previously /api/facebook/discover returned the user's LONG-LIVED Facebook
-- access token to the browser so the client could pass it back to
-- /api/facebook/connect. That token must never live in the browser.
--
-- This table holds the token server-side, AES-256-GCM encrypted (same scheme
-- as lib/crypto.ts), for a maximum of 15 minutes, one-time use. The client
-- only ever sees the opaque session id.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.oauth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('facebook', 'instagram')),
  token_encrypted TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_oauth_sessions_account
  ON public.oauth_sessions(account_id, expires_at);

ALTER TABLE public.oauth_sessions ENABLE ROW LEVEL SECURITY;

-- No client reads/writes: the service role (bypass client) handles everything.
-- Sessions older than their expiry can be cleaned opportunistically.

COMMENT ON TABLE public.oauth_sessions IS
  'Short-lived, encrypted OAuth token hand-off between /discover and /connect steps. Never exposed to clients.';
