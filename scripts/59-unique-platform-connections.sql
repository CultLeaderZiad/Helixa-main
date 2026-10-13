-- ============================================================
-- 59-unique-platform-connections.sql
-- Enforces single tenant ownership for connected external channels.
-- Deduplicates any legacy duplicate connection rows by preserving the
-- most recently connected/updated row, then adds a unique index on
-- (platform, page_id) so webhooks never route to multiple tenants.
-- ============================================================

-- 1. Deduplicate by keeping the highest/most recent id for each (platform, page_id)
DELETE FROM public.platform_connections a
USING public.platform_connections b
WHERE a.id < b.id
  AND a.platform = b.platform
  AND a.page_id = b.page_id
  AND a.page_id IS NOT NULL;

-- 2. Create unique index to guarantee uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS idx_uq_platform_connections_platform_page
  ON public.platform_connections (platform, page_id)
  WHERE page_id IS NOT NULL;
