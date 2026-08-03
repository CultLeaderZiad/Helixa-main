import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { getSupabaseServerClient } from "@/lib/supabase-server"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAdmin(request)
  if (result.response) {
    return result.response
  }

  const { id: paymentId } = await params

  const adminUser = result.user

  try {
    const { action, rejection_reason } = await request.json()
    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    const supabase = await getSupabaseServerClient()

    // Fetch the payment submission
    const { data: payment, error: fetchError } = await supabase
      .from("payment_submissions")
      .select("*")
      .eq("id", paymentId)
      .single()

    if (fetchError || !payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 })
    }

    if (payment.status !== 'pending') {
      return NextResponse.json({ error: "Payment is not pending" }, { status: 400 })
    }

    // Process the payment
    const updates: any = {
      status: action === 'approve' ? 'approved' : 'rejected',
      reviewed_by: adminUser.id,
      reviewed_at: new Date().toISOString()
    }
    if (action === 'reject') {
      updates.rejection_reason = rejection_reason || null
    }

    const { error: updateError } = await supabase
      .from("payment_submissions")
      .update(updates)
      .eq("id", paymentId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    if (action === 'approve') {
      // 1. Update user plan
      const planType = payment.amount === 199 ? 'one_time' : 'monthly'
      await supabase.from("users").update({ plan: planType }).eq("id", payment.user_id)

      // 2. Upsert subscription
      const currentPeriodEnd = new Date()
      if (planType === 'monthly') {
        currentPeriodEnd.setDate(currentPeriodEnd.getDate() + 30) // +30 days for monthly
      } else {
        currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 100) // "forever" for one_time
      }

      const { data: existingSub } = await supabase.from("subscriptions").select("id").eq("user_id", payment.user_id).single()
      if (existingSub) {
        await supabase.from("subscriptions").update({
          plan_type: planType,
          status: 'active',
          payment_method: 'vodafone_cash',
          current_period_end: currentPeriodEnd.toISOString(),
          updated_at: new Date().toISOString()
        }).eq("user_id", payment.user_id)
      } else {
        await supabase.from("subscriptions").insert({
          user_id: payment.user_id,
          plan_type: planType,
          status: 'active',
          payment_method: 'vodafone_cash',
          current_period_end: currentPeriodEnd.toISOString()
        })
      }
    }

    // Log the audit action
    await supabase.from("admin_audit_log").insert({
      admin_user_id: adminUser.id,
      target_user_id: payment.user_id,
      action: `payment_${action}`,
      details: { payment_id: paymentId, amount: payment.amount }
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
