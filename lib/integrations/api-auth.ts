import { type NextRequest } from "next/server"
import { getSupabaseBypassClient } from "@/lib/supabase-server"
import { hashApiKey } from "@/lib/integrations/webhooks"

export async function workspaceFromApiKey(request: NextRequest): Promise<{ userId: string | number; workspaceId: string | null } | null> {
  const header = request.headers.get("authorization") || ""
  const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : ""
  if (!token.startsWith("hx_live_")) return null
  const supabase = await getSupabaseBypassClient()
  const { data } = await supabase.from("workspace_api_keys").select("id, user_id, workspace_id").eq("key_hash", hashApiKey(token)).maybeSingle()
  if (!data) return null
  const { accountIdForProfile, assertFeature, loadAccount, PlanLimitError } = await import("@/lib/billing/enforce")
  const accountId = await accountIdForProfile(supabase, data.user_id)
  const account = accountId ? await loadAccount(supabase, accountId) : null
  if (account) {
    try {
      await assertFeature(supabase, account, "apiAccess")
    } catch (error) {
      if (error instanceof PlanLimitError) return null
      throw error
    }
  }
  await supabase.from("workspace_api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", data.id)
  return { userId: data.user_id, workspaceId: data.workspace_id }
}
