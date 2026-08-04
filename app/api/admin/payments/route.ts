import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { getSupabaseServerClient } from "@/lib/supabase-server"

export async function GET(request: NextRequest) {
  const result = await requireAdmin(request)
  if (result.response) {
    return result.response
  }

  const supabase = await getSupabaseServerClient()
  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status") || "pending"

  try {
    // payment_submissions.user_id is users.id (int64) → users.account_id → accounts.email
    const { data: payments, error } = await supabase
      .from("payment_submissions")
      .select(`
        *,
        users (
          id,
          username,
          account_id,
          accounts (
            email,
            plan
          )
        )
      `)
      .eq("status", status)
      .order("created_at", { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Map nested shape back to the frontend contract ({ accounts?.email, note })
    const mapped = (payments || []).map((payment: any) => {
      const { users: userRow, note, proof_note, ...rest } = payment
      return {
        ...rest,
        note: proof_note ?? note ?? null,
        accounts: userRow?.accounts ?? null,
        users: userRow
          ? { username: userRow.username, plan: userRow.accounts?.plan ?? null }
          : null,
      }
    })

    return NextResponse.json({ payments: mapped })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
