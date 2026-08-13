export const dynamic = 'force-dynamic'
import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseBypassClient } from "@/lib/supabase-server"
import { requireInstagramUser } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const result = await requireInstagramUser(request)
    if (result.response) return result.response
    const { igUser } = result

    const supabase = await getSupabaseBypassClient()

    const { transaction_reference, amount, note, proof_note, plan_id, payment_method } = await request.json()

    if (!transaction_reference || !amount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // plan_id is provided by the checkout flow; the new plans schema has no slug column
    const resolvedPlanId: string | null = plan_id || null

    // Insert payment submission (user_id is the Instagram users.id int64)
    const { error: insertError } = await supabase
      .from("payment_submissions")
      .insert({
        user_id: igUser.id,
        transaction_reference,
        proof_note: proof_note || note || null,
        amount,
        status: "pending",
        payment_method: payment_method || "vodafone_cash",
        plan_id: resolvedPlanId,
      })

    if (insertError) {
      console.error("Error inserting payment submission:", insertError)
      return NextResponse.json({ error: "Failed to submit payment" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Payment submission error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

