import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"
import { requireAdmin } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const result = await requireAdmin(request)
    if (result.response) return result.response

    const { searchParams } = new URL(request.url)
    const filter = searchParams.get("filter") || "all"

    const supabase = await getSupabaseServerClient()

    let query = supabase
      .from("accounts")
      .select("id, email, plan, created_at, subscription_status")
      .eq("role", "user")
      .order("created_at", { ascending: false })

    if (filter !== "all") {
      if (filter === "trial") {
        query = query.eq("plan", "trial")
      } else if (filter === "monthly") {
        query = query.eq("plan", "monthly")
      } else if (filter === "one_time") {
        query = query.eq("plan", "one_time")
      } else if (filter === "expired") {
        query = query.eq("plan", "expired")
      } else if (filter === "paid") {
        query = query.in("plan", ["monthly", "one_time"])
      } else if (filter === "active") {
        query = query.in("subscription_status", ["active", "trialing"])
      } else if (filter === "inactive") {
        query = query.in("subscription_status", ["canceled", "unpaid", "past_due"])
      }
    }

    const { data: customers, error } = await query

    if (error) {
      console.error("[api/admin/customers] GET error:", error)
      return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 })
    }

    return NextResponse.json({ customers: customers || [] })
  } catch (err) {
    console.error("[api/admin/customers] Server error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
