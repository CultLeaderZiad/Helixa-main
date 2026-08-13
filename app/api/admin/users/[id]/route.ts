export const dynamic = 'force-dynamic'
import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { getSupabaseBypassClient } from "@/lib/supabase-server"

/**
 * PATCH /api/admin/users/[id]
 * Admin-only: updates role, plan, is_flagged, flagged_reason for an account.
 * Mirrors plan changes to users + subscriptions; logs to admin_audit_log (int64).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAdmin(request)
  if (result.response) return result.response
  const adminAccount = result.user

  const { id: targetAccountId } = await params
  if (!targetAccountId) {
    return NextResponse.json({ error: "User ID required" }, { status: 400 })
  }

  try {
    const supabase = await getSupabaseBypassClient()
    const body = await request.json()

    const allowedFields = ["role", "plan", "is_flagged", "flagged_reason", "is_banned", "banned_reason"]
    const updates: Record<string, any> = {}
    for (const field of allowedFields) {
      if (field in body) updates[field] = body[field]
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })
    }

    updates.updated_at = new Date().toISOString()

    // Fetch current account state for audit diff
    const { data: targetAccount, error: fetchError } = await supabase
      .from("accounts")
      .select("id, email, role, plan, is_flagged, flagged_reason, is_banned, banned_reason")
      .eq("id", targetAccountId)
      .single()

    if (fetchError || !targetAccount) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Apply the update to accounts (source of truth)
    const { error: updateError } = await supabase
      .from("accounts")
      .update(updates)
      .eq("id", targetAccountId)

    if (updateError) throw updateError

    // Resolve the linked users row (int64) for plan mirroring + audit log
    let targetUserId: number | null = null
    const { data: targetUser } = await supabase
      .from("users")
      .select("id")
      .eq("account_id", targetAccountId)
      .maybeSingle()
    targetUserId = targetUser?.id ?? null

    // Mirror plan to users + subscriptions when plan changed
    if (updates.plan && targetUserId !== null) {
      await supabase.from("users").update({ plan: updates.plan }).eq("id", targetUserId)

      const { data: existingSub } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("user_id", targetUserId)
        .maybeSingle()
      if (existingSub) {
        await supabase.from("subscriptions").update({
          plan_type: updates.plan,
          status: updates.plan === "expired" ? "canceled" : "active",
          updated_at: new Date().toISOString(),
        }).eq("id", existingSub.id)
      } else {
        await supabase.from("subscriptions").insert({
          user_id: targetUserId,
          plan_type: updates.plan,
          status: updates.plan === "expired" ? "canceled" : "active",
        })
      }
    }

    // Resolve admin's int64 users.id for the audit log
    let adminUserId: number | null = null
    const { data: adminUser } = await supabase
      .from("users")
      .select("id")
      .eq("account_id", adminAccount.id)
      .maybeSingle()
    adminUserId = adminUser?.id ?? null

    // Write to audit log
    const auditDetails: Record<string, any> = { before: {}, after: {} }
    for (const field of Object.keys(updates)) {
      if (field === "updated_at") continue
      auditDetails.before[field] = (targetAccount as any)[field]
      auditDetails.after[field] = updates[field]
    }

    if (adminUserId !== null && targetUserId !== null) {
      await supabase.from("admin_audit_log").insert({
        admin_user_id: adminUserId,
        action: "update_user",
        target_user_id: targetUserId,
        details: auditDetails,
      })
    }

    return NextResponse.json({ success: true, updated: updates })
  } catch (error: any) {
    console.error("[admin/users/[id]] Error:", error)
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 })
  }
}
