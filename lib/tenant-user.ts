import { isPlaceholderToken } from "@/lib/token-crypto"

export interface TenantProfile {
  id: number | string
  account_id?: string | null
  username?: string | null
  access_token?: string | null
  token_expires_at?: string | null
  business_account_id?: string | number | null
  page_id?: string | null
  created_at?: string | null
  updated_at?: string | null
  [key: string]: unknown
}

/** Tables whose `user_id` points at `users.id`. Missing tables are skipped. */
const CHILD_TABLES = [
  "platform_connections",
  "automations",
  "automation_events",
  "conversations",
  "messages",
  "leads",
  "conversation_state",
  "ice_breakers",
  "ai_usage_log",
  "ai_comment_themes",
  "ai_faq_suggestions",
  "media_cache",
  "content_pool",
  "scheduler_config",
  "reels_posts",
  "subscriptions",
  "payment_submissions",
  "manual_payments",
  "webhook_events",
]

export function hasInstagramCredentials(row: TenantProfile): boolean {
  return Boolean(row.business_account_id || row.page_id || (row.access_token && !isPlaceholderToken(row.access_token)))
}

/** Oldest row is the stable tenant key. Later Instagram connects must update it, not insert another. */
export function pickCanonicalProfile(rows: TenantProfile[]): TenantProfile | null {
  if (rows.length === 0) return null
  return [...rows].sort((a, b) => {
    const at = a.created_at ? Date.parse(a.created_at) : 0
    const bt = b.created_at ? Date.parse(b.created_at) : 0
    if (at !== bt) return at - bt
    return String(a.id).localeCompare(String(b.id))
  })[0]
}

export function placeholderUsername(account: { id: string; email?: string | null }, attempt = 0): string {
  const local = (account.email?.split("@")[0] || "user").replace(/[^a-zA-Z0-9_]/g, "").slice(0, 24) || "user"
  const suffix = account.id.replace(/-/g, "").slice(0, 8)
  return attempt === 0 ? `${local}_${suffix}` : `${local}_${suffix}_${attempt}`
}

export function randomProfileId(): number {
  return Math.floor(1_000_000_000 + Math.random() * 8_000_000_000)
}

export async function listProfilesForAccount(supabase: any, accountId: string): Promise<TenantProfile[]> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("account_id", accountId)
    .order("created_at", { ascending: true })
  if (error) throw error
  return data || []
}

/**
 * Collapse duplicate `users` rows for one account onto the oldest row.
 * Connecting Telegram or Facebook first used to insert a placeholder, and a
 * later Instagram login inserted a second row. `maybeSingle()` then errored
 * and every authenticated route returned 401.
 */
export async function consolidateTenantProfiles(supabase: any, rows: TenantProfile[]): Promise<void> {
  const survivor = pickCanonicalProfile(rows)
  if (!survivor || rows.length < 2) return
  const others = rows.filter((row) => String(row.id) !== String(survivor.id))
  const donor = [...rows].reverse().find((row) => hasInstagramCredentials(row))

  for (const other of others) {
    const { error } = await supabase
      .from("users")
      .update({ username: `merged_${other.id}`.slice(0, 80) })
      .eq("id", other.id)
    if (error) console.warn("[tenant-user] Could not free username on duplicate profile:", error.message)
  }

  if (donor && String(donor.id) !== String(survivor.id) && hasInstagramCredentials(donor)) {
    const patch: Record<string, unknown> = {
      username: donor.username,
      access_token: donor.access_token,
      token_expires_at: donor.token_expires_at ?? null,
      business_account_id: donor.business_account_id ?? null,
      page_id: donor.page_id ?? null,
      updated_at: new Date().toISOString(),
    }
    let { error } = await supabase.from("users").update(patch).eq("id", survivor.id)
    if (error && /token_expires_at/i.test(error.message || "")) {
      delete patch.token_expires_at
      const retry = await supabase.from("users").update(patch).eq("id", survivor.id)
      error = retry.error
    }
    if (error) console.warn("[tenant-user] Could not copy Instagram fields onto canonical profile:", error.message)
  }

  for (const other of others) {
    for (const table of CHILD_TABLES) {
      const { error } = await supabase.from(table).update({ user_id: survivor.id }).eq("user_id", other.id)
      if (error && !/schema cache|does not exist|Could not find/i.test(error.message || "")) {
        console.warn(`[tenant-user] Could not move ${table} rows from ${other.id} to ${survivor.id}:`, error.message)
      }
    }
    const { error: deleteError } = await supabase.from("users").delete().eq("id", other.id)
    if (deleteError) {
      console.warn("[tenant-user] Could not delete duplicate profile:", deleteError.message)
    }
  }
}

export async function resolveTenantProfile(supabase: any, accountId: string): Promise<TenantProfile | null> {
  let rows = await listProfilesForAccount(supabase, accountId)
  if (rows.length > 1) {
    await consolidateTenantProfiles(supabase, rows)
    rows = await listProfilesForAccount(supabase, accountId)
  }
  if (rows.length === 0) return null
  return rows.length === 1 ? rows[0] : pickCanonicalProfile(rows)
}

/**
 * One profile row per Helixa account. Reuses an existing row instead of
 * inserting a second one when Instagram is not connected yet.
 */
export async function ensureTenantProfile(
  supabase: any,
  account: { id: string; email?: string | null },
  placeholderToken: "facebook_managed" | "telegram_managed",
): Promise<TenantProfile> {
  const existing = await resolveTenantProfile(supabase, account.id)
  if (existing) return existing

  let lastError: { message?: string; code?: string } | null = null
  for (let attempt = 0; attempt < 3; attempt++) {
    const id = randomProfileId()
    const { data, error } = await supabase
      .from("users")
      .insert({
        id,
        account_id: account.id,
        username: placeholderUsername(account, attempt),
        access_token: placeholderToken,
      })
      .select("*")
      .maybeSingle()
    if (!error && data) return data
    lastError = error
    if (error?.code !== "23505") break
  }
  throw new Error(lastError?.message || "Could not create a profile for this account")
}
