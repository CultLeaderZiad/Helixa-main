import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { getSupabaseServerClient } from "@/lib/supabase-server"

export async function POST(request: NextRequest) {
  const adminCheck = await requireAdmin(request)
  if (adminCheck.response) return adminCheck.response

  try {
    const { userId, message } = await request.json()

    if (!userId || !message) {
      return NextResponse.json({ error: "userId and message are required" }, { status: 400 })
    }

    const supabase = await getSupabaseServerClient()
    const { data: user } = await supabase.from("users").select("username").eq("id", userId).single()

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Scaffolded implementation: does not actually send email yet.
    console.log(`[Admin] Simulated email to user ${user.username} (${userId}): ${message}`)

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
