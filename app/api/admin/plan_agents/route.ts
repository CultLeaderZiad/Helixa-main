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
    console.error("[admin/plan_agents] GET error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const adminCheck = await requireAdmin(req)
    if (adminCheck.response) return adminCheck.response

    const body = await req.json()
    const { plan_id, agent_id, is_enabled } = body
    if (!plan_id || !agent_id || is_enabled === undefined) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const supabase = await getSupabaseBypassClient()
    
    // Upsert the record
    const { error } = await supabase
      .from("plan_agents")
      .upsert({
          plan_id,
          agent_id,
          is_enabled,
          updated_at: new Date().toISOString()
      }, { onConflict: "plan_id, agent_id" })

    if (error) throw new Error(error.message)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[admin/plan_agents] PUT error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

