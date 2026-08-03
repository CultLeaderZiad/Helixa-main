import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"

export async function POST(req: Request) {
  try {
    const supabase = await getSupabaseServerClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { transaction_reference, note, amount } = await req.json()

    if (!transaction_reference || !amount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Insert payment submission
    const { error: insertError } = await supabase
      .from("payment_submissions")
      .insert({
        user_id: session.user.id,
        transaction_reference,
        note: note || null,
        amount,
        status: "pending"
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
