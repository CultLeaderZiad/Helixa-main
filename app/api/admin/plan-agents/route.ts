export const dynamic = 'force-dynamic'
import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseBypassClient } from "@/lib/supabase-server"
import { requireAdmin } from "@/lib/auth"

export async function GET(req: NextRequest) {
  try {
    const adminCheck = await requireAdmin(req)
    if (adminCheck.response) return adminCheck.response

    const supabase = await getSupabaseBypassClient()
    const { data: planAgents, error } = await supabase
      .from("plan_agents")
      .select("*")

    if (error) throw new Error(error.message)

    return NextResponse.json(planAgents)
  } catch (error: any) {
    console.error("[admin/plan-agents] GET error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminCheck = await requireAdmin(req)
    if (adminCheck.response) return adminCheck.response

    const { plan_id, agent_id, enable } = await req.json()
    if (!plan_id || !agent_id) return NextResponse.json({ error: "Missing ids" }, { status: 400 })

    const supabase = await getSupabaseBypassClient()
    
    if (enable) {
      const { error } = await supabase
        .from("plan_agents")
        .insert({ plan_id, agent_id })
      if (error && error.code !== "23505") throw new Error(error.message) // Ignore unique constraint violation
    } else {
      const { error } = await supabase
        .from("plan_agents")
        .delete()
        .match({ plan_id, agent_id })
      if (error) throw new Error(error.message)
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[admin/plan-agents] POST error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

