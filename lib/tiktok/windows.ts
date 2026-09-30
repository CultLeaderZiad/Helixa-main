import type { Db } from "@/lib/channels/types"
import { emptyTikTokWindow, recordUserMessage, type TikTokWindowState } from "@/lib/tiktok/quota"

const memory = new Map<string, TikTokWindowState>()

function key(businessId: string, contactId: string): string {
  return `${businessId}\n${contactId}`
}

function missingRelation(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false
  const message = error.message || ""
  return error.code === "42P01" || error.code === "PGRST205" || /schema cache|does not exist|Could not find the table/i.test(message)
}

export function rememberTikTokWindow(businessId: string, contactId: string, state: TikTokWindowState): void {
  memory.set(key(businessId, contactId), state)
}

export function memoryTikTokWindow(businessId: string, contactId: string): TikTokWindowState {
  return memory.get(key(businessId, contactId)) || emptyTikTokWindow()
}

export async function readTikTokWindow(supabase: Db, businessId: string, contactId: string): Promise<TikTokWindowState> {
  const local = memoryTikTokWindow(businessId, contactId)
  const { data, error } = await supabase
    .from("tiktok_dm_windows")
    .select("window_started_at, business_sends")
    .eq("business_open_id", businessId)
    .eq("contact_external_id", contactId)
    .maybeSingle()
  if (error || !data) {
    if (error && !missingRelation(error)) console.warn("[tiktok] window read failed:", error.message)
    return local
  }
  const started = Date.parse(data.window_started_at)
  const remote: TikTokWindowState = {
    lastUserMessageAt: Number.isFinite(started) ? started : local.lastUserMessageAt,
    businessSends: Number(data.business_sends) || 0,
  }
  rememberTikTokWindow(businessId, contactId, remote)
  return remote
}

export async function recordTikTokUserMessage(
  supabase: Db,
  businessId: string,
  contactId: string,
  at: number,
): Promise<TikTokWindowState> {
  const state = recordUserMessage(at)
  rememberTikTokWindow(businessId, contactId, state)
  const { error } = await supabase.from("tiktok_dm_windows").upsert(
    {
      business_open_id: businessId,
      contact_external_id: contactId,
      window_started_at: new Date(at).toISOString(),
      business_sends: 0,
      updated_at: new Date(at).toISOString(),
    },
    { onConflict: "business_open_id,contact_external_id" },
  )
  if (error && !missingRelation(error)) console.warn("[tiktok] window reset failed:", error.message)
  return state
}

export async function recordTikTokBusinessSend(
  supabase: Db,
  businessId: string,
  contactId: string,
  state: TikTokWindowState,
): Promise<void> {
  const next: TikTokWindowState = {
    lastUserMessageAt: state.lastUserMessageAt,
    businessSends: state.businessSends + 1,
  }
  rememberTikTokWindow(businessId, contactId, next)
  state.businessSends = next.businessSends
  const { error } = await supabase.from("tiktok_dm_windows").upsert(
    {
      business_open_id: businessId,
      contact_external_id: contactId,
      window_started_at: new Date(next.lastUserMessageAt || Date.now()).toISOString(),
      business_sends: next.businessSends,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "business_open_id,contact_external_id" },
  )
  if (error && !missingRelation(error)) console.warn("[tiktok] window increment failed:", error.message)
}
