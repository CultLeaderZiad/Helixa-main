import { isPlaceholderToken } from "@/lib/token-crypto"

const TEN_DAYS_MS = 10 * 24 * 60 * 60 * 1000
const ONE_DAY_MS = 24 * 60 * 60 * 1000

export function isMetaAuthError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false
  const code = (error as { code?: number | string }).code
  return code === 190 || code === "190"
}

export function instagramNeedsReconnect(user: {
  access_token?: string | null
  business_account_id?: string | number | null
  page_id?: string | null
  reconnect_required?: boolean | null
  token_expires_at?: string | null
} | null | undefined): boolean {
  if (!user) return false
  const connected = Boolean(
    user.business_account_id ||
      user.page_id ||
      (user.access_token && !isPlaceholderToken(user.access_token)),
  )
  if (!connected) return false
  if (user.reconnect_required) return true
  if (user.token_expires_at) {
    const expires = Date.parse(user.token_expires_at)
    if (!Number.isNaN(expires) && expires <= Date.now()) return true
  }
  return false
}

/**
 * Refresh long-lived Instagram tokens that expire within 10 days.
 * Meta rejects refresh calls for tokens younger than 24 hours, so skip those.
 * Already-expired tokens cannot be refreshed; the dashboard asks for a reconnect.
 */
export function tokenNeedsRefresh(
  row: {
    token_expires_at?: string | null
    token_refreshed_at?: string | null
    updated_at?: string | null
    created_at?: string | null
    reconnect_required?: boolean | null
    access_token?: string | null
  },
  now = Date.now(),
): boolean {
  if (!row.token_expires_at || row.reconnect_required) return false
  if (isPlaceholderToken(row.access_token)) return false
  const expires = Date.parse(row.token_expires_at)
  if (Number.isNaN(expires) || expires <= now) return false
  if (expires - now > TEN_DAYS_MS) return false
  const issuedAt = Date.parse(row.token_refreshed_at || row.updated_at || row.created_at || "")
  if (!Number.isNaN(issuedAt) && now - issuedAt < ONE_DAY_MS) return false
  return true
}

type QueryResult = { error: { message?: string } | null }

function isMissingColumn(error: { message?: string } | null, column: string): boolean {
  if (!error?.message) return false
  return error.message.toLowerCase().includes(column.toLowerCase())
}

/**
 * Writes reconnect state. If the phase-1 column is not on the database yet,
 * the update is retried without it so token refresh can still persist.
 */
export async function updateUserTokenFields(
  supabase: { from: (table: string) => any },
  userId: string | number,
  fields: Record<string, unknown>,
): Promise<{ error: { message?: string } | null }> {
  const first: QueryResult = await supabase.from("users").update(fields).eq("id", userId)
  if (!first.error) return first

  const optional = ["reconnect_required", "token_refreshed_at"]
  const missing = optional.filter((column) => isMissingColumn(first.error, column))
  if (missing.length === 0) return first

  const reduced = { ...fields }
  for (const column of missing) delete reduced[column]
  if (Object.keys(reduced).length === 0) return { error: null }
  return supabase.from("users").update(reduced).eq("id", userId)
}

export async function markInstagramReconnect(
  supabase: { from: (table: string) => any },
  userId: string | number,
): Promise<void> {
  const { error } = await updateUserTokenFields(supabase, userId, { reconnect_required: true })
  if (error) {
    console.error("[instagram-token] Failed to mark reconnect_required:", error.message)
  }
}
