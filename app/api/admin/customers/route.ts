export const dynamic = 'force-dynamic'
import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseBypassClient } from "@/lib/supabase-server"
import { requireAdmin } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const result = await requireAdmin(request)
    if (result.response) return result.response

    const { searchParams } = new URL(request.url)
    const filter = searchParams.get("filter") || "all"

    const supabase = await getSupabaseBypassClient()

    if (filter === "newsletter") {
      const { data: subscribers, error: subError } = await supabase
        .from("newsletter_subscribers")
        .select("id, email, created_at")
        .order("created_at", { ascending: false })

      if (subError) {
        console.error("[api/admin/customers] GET error (newsletter):", subError)
        return NextResponse.json({ error: "Failed to fetch newsletter subscribers" }, { status: 500 })
      }

      // Map to same shape as customers
      const mapped = subscribers?.map(s => ({
        id: s.id,
        email: s.email,
        full_name: "Newsletter Subscriber",
        plan: "newsletter",
        created_at: s.created_at,
        subscription_status: "active"
      })) || []

      return NextResponse.json({ customers: mapped })
    }

    // Exclude administrators so all customer accounts (role = 'user', 'customer', etc.) are included
    // Use select('*') to avoid failures when columns like full_name or subscription_status don't exist
    let query = supabase
      .from("accounts")
      .select("*")
      .neq("role", "admin")
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
      } else if (filter === "flagged") {
        query = query.eq("is_flagged", true)
      }
    }

    const { data: customers, error } = await query

    if (error) {
      console.error("[api/admin/customers] GET error:", error)
      return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 })
    }

    // Map to consistent shape — handle missing columns gracefully
    const mapped = (customers || []).map((c: any) => ({
      id: c.id,
      email: c.email,
      full_name: c.full_name || c.raw_user_meta_data?.full_name || c.email?.split("@")[0] || "User",
      plan: c.plan || "trial",
      role: c.role || "customer",
      created_at: c.created_at,
      subscription_status: c.subscription_status || "active",
      is_flagged: c.is_flagged || false,
    }))

    return NextResponse.json({ customers: mapped })
  } catch (err) {
    console.error("[api/admin/customers] Server error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
