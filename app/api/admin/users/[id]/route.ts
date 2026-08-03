import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { getSupabaseServerClient } from "@/lib/supabase-server"

/**
 * PATCH /api/admin/users/[id]
 * Admin-only: updates role, plan, is_flagged, flagged_reason for a user.
 * Logs every change to admin_audit_log.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAdmin(request)
  if (result.response) return result.response
  const adminUser = result.user

  const { id: targetUserId } = await params
  if (!targetUserId) {
    return NextResponse.json({ error: "User ID required" }, { status: 400 })
  }

  try {
    const supabase = await getSupabaseServerClient()
    const body = await request.json()

    const allowedFields = ["role", "plan", "is_flagged", "flagged_reason"]
    const updates: Record<string, any> = {}
    for (const field of allowedFields) {
      if (field in body) updates[field] = body[field]
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })
    }

    updates.updated_at = new Date().toISOString()

    // Fetch current user state for audit diff
    const { data: targetUser, error: fetchError } = await supabase
      .from("users")
      .select("id, username, role, plan, is_flagged, flagged_reason")
      .eq("id", targetUserId)
      .single()

    if (fetchError || !targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Apply the update
    const { error: updateError } = await supabase
      .from("users")
      .update(updates)
      .eq("id", targetUserId)

    if (updateError) throw updateError

    // Also update subscriptions table if plan changed
    if (updates.plan) {
      await supabase.from("subscriptions").upsert(
        {
          user_id: Number(targetUserId),
          plan_type: updates.plan,
          status: updates.plan === "expired" ? "canceled" : "active",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      )
    }

    // Write to audit log
    const auditDetails: Record<string, any> = { before: {}, after: {} }
    for (const field of Object.keys(updates)) {
      if (field === "updated_at") continue
      auditDetails.before[field] = (targetUser as any)[field]
      auditDetails.after[field] = updates[field]
    }

    await supabase.from("admin_audit_log").insert({
      admin_user_id: adminUser.id,
      action: "update_user",
      target_user_id: Number(targetUserId),
      details: auditDetails,
    })

    return NextResponse.json({ success: true, updated: updates })
  } catch (error: any) {
    console.error("[admin/users/[id]] Error:", error)
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 })
  }
}
