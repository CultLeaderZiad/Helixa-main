export const dynamic = 'force-dynamic'
import { NextResponse } from "next/server"
import { getSupabaseBypassClient } from "@/lib/supabase-server"

export async function GET() {
  try {
    const supabase = await getSupabaseBypassClient()
    const { data: plans, error } = await supabase
      .from("plans")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    const { data: planAgents } = await supabase
      .from("plan_agents")
      .select("plan_id, is_enabled, agents(id, name, category, icon)")

    const plansWithAgents = plans.map((plan: any) => {
        const activeAgents = planAgents?.filter((pa: any) => pa.plan_id === plan.id && pa.is_enabled)
            .map((pa: any) => pa.agents) || []
        return { ...plan, active_agents: activeAgents }
    })

    return NextResponse.json(plansWithAgents)
  } catch (error: any) {
    console.error("[plans] Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

