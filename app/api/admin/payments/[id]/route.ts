// Admin review for Vodafone Cash (and other manual) payments.
// Billing source of truth is billing_accounts. The review is an atomic
// compare-and-set on status='pending', so a double-click or a replay grants (or
// rejects) the plan exactly once. activatePlan() runs only when this request won
// the race.
//
// PATCH /api/admin/payments/[id]
import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { getSupabaseBypassClient } from "@/lib/supabase-server"
import { activatePlan } from "@/lib/billing/activation"
import { sendManualPaymentApproved, sendManualPaymentRejected, getEmailForUserId } from "@/lib/receipt-emails"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const result = await requireAdmin(request)
  if (result.response) return result.response

  const { id: paymentId } = await params
  const adminAccount = result.user

  try {
    const { action, rejection_reason } = await request.json()
    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    const supabase = await getSupabaseBypassClient()

    const { data: payment, error: fetchError } = await supabase
      .from("payment_submissions")
      .select("*")
      .eq("id", paymentId)
      .single()
    if (fetchError || !payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 })
    }
    if (payment.status !== "pending") {
      return NextResponse.json({ error: "Payment is not pending" }, { status: 409 })
    }

    // The reviewing admin's users.id (int64) for the audit trail.
    const { data: adminUserRow } = await supabase
      .from("users")
      .select("id")
      .eq("account_id", adminAccount.id)
      .maybeSingle()
    const adminUserId: number | null = adminUserRow?.id ?? null

    const nextStatus = action === "approve" ? "approved" : "rejected"

    // Compare-and-set on status='pending'. Exactly one review wins the race.
    const { data: reviewed, error: updateError } = await supabase
      .from("payment_submissions")
      .update({
        status: nextStatus,
        reviewed_by: adminUserId,
        reviewed_at: new Date().toISOString(),
        rejection_reason: action === "reject" ? rejection_reason || null : null,
      })
      .eq("id", paymentId)
      .eq("status", "pending")
      .select("id")
    if (updateError) {
      return NextResponse.json({ error: "Could not update the payment." }, { status: 500 })
    }
    if (!reviewed || reviewed.length === 0) {
      // Another review already won. No-op so money is never applied twice.
      return NextResponse.json({ success: true, note: "Already reviewed" })
    }

    // Resolve the target account for the entitlement write.
    const { data: targetUser } = await supabase
      .from("users")
      .select("account_id")
      .eq("id", payment.user_id)
      .maybeSingle()
    const accountId: string | null = targetUser?.account_id ?? null

    if (action === "approve" && accountId) {
      let planId: string
      if (payment.plan_id) {
        const { data: plan } = await supabase
          .from("plans")
          .select("billing_cycle")
          .eq("id", payment.plan_id)
          .maybeSingle()
        planId = plan?.billing_cycle === "monthly" ? "creator" : "creator_plus"
      } else {
        planId = Number(payment.amount) === 199 ? "creator_plus" : "creator"
      }

      try {
        await activatePlan({
          accountId,
          planId,
          interval: "month",
          source: payment.payment_method ?? "vodafone_cash",
          providerRef: String(payment.id),
        })
      } catch (activateError: any) {
        console.error("[admin/payments] activatePlan failed:", activateError?.message ?? activateError)
        return NextResponse.json({ error: "Could not activate the plan" }, { status: 500 })
      }
    }

    if (adminUserId !== null) {
      await supabase.from("admin_audit_log").insert({
        admin_user_id: adminUserId,
        target_user_id: payment.user_id,
        action: `payment_${action}`,
        details: { payment_id: paymentId, amount: payment.amount },
      })
    }

    // Transactional notice to the customer. Non-blocking.
    try {
      const toEmail = await getEmailForUserId(payment.user_id)
      if (toEmail) {
        let planName = "Helixa Plan"
        if (payment.plan_id) {
          const { data: planRow } = await supabase
            .from("plans")
            .select("name")
            .eq("id", payment.plan_id)
            .maybeSingle()
          planName = planRow?.name || planName
        }
        if (action === "approve") {
          const { data: subRow } = await supabase
            .from("subscriptions")
            .select("current_period_end")
            .eq("user_id", payment.user_id)
            .maybeSingle()
          await sendManualPaymentApproved({
            to: toEmail,
            planName,
            amount: Number(payment.amount),
            transactionReference: payment.transaction_reference,
            periodEnd: subRow?.current_period_end ? new Date(subRow.current_period_end).toLocaleDateString() : undefined,
          })
        } else {
          await sendManualPaymentRejected({
            to: toEmail,
            amount: Number(payment.amount),
            transactionReference: payment.transaction_reference,
            reason: rejection_reason || undefined,
          })
        }
      }
    } catch (e) {
      console.error("[admin/payments] Notice email failed (non-blocking):", e)
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("[admin/payments] Error:", err?.message ?? err)
    return NextResponse.json({ error: "Failed to review payment" }, { status: 500 })
  }
}
