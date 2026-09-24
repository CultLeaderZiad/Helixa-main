-- ============================================================
-- 58-schema-platform-connections-alignment.sql
-- The app already reads/writes these columns (facebook connect/callback
-- routes, /api/user/connections, facebook posts + fetch-post routes) but
-- they were only ever added manually in some environments and never
-- migrated. This script is idempotent — safe to run repeatedly.
-- ============================================================

-- 1. When the connection was made (used by GET /api/user/connections,
--    /api/facebook/posts, /api/facebook/fetch-post ordering).
ALTER TABLE public.platform_connections
  ADD COLUMN IF NOT EXISTS connected_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

-- 2. Canonical external id of the connected page/bot (used by webhook
--    routing in lib/facebook-webhook.ts and telegram webhook).
ALTER TABLE public.platform_connections
  ADD COLUMN IF NOT EXISTS external_account_id TEXT;

-- 3. Account UUID key — fallback lookup when no users (Instagram) row
--    exists yet (facebook/fetch-post + facebook/posts fallback paths).
ALTER TABLE public.platform_connections
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_platform_connections_account
  ON public.platform_connections(account_id);

-- 4. Backfill connected_at from created_at for pre-existing rows.
UPDATE public.platform_connections
  SET connected_at = created_at
  WHERE connected_at IS NULL AND created_at IS NOT NULL;
