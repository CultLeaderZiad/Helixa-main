import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseBypassClient } from "@/lib/supabase-server"

export async function GET(req: NextRequest) {
  try {
    // In a real app, you'd get the accountId from auth. Hardcoding for now if no auth logic is present in this prompt context
    // Actually we should get it from a header or cookie if possible. We will assume user is authenticated and we have an accountId.
    const accountId = "00000000-0000-0000-0000-000000000000" // Fallback - replace with actual auth logic
    
    // We can also extract accountId from query param or session
    const searchParams = req.nextUrl.searchParams
    const accId = searchParams.get("accountId") || accountId

    const supabase = await getSupabaseBypassClient()
    
    // 1. Get all active agents
    const { data: agents, error: agentsError } = await supabase
      .from("agents")
      .select("*")
      .eq("is_active", true)
      .order("sort_order")

    if (agentsError) throw new Error(agentsError.message)

    // 2. Get user's plan and plan_agents mapping
    // Since we don't have the full auth session in this standalone script context, we'll try to find an account
    const { data: account } = await supabase.from("accounts").select("plan_id").eq("id", accId).single()
    let planAgents: string[] = []
    
    if (account?.plan_id) {
      const { data: pa } = await supabase.from("plan_agents").select("agent_id").eq("plan_id", account.plan_id)
      if (pa) planAgents = pa.map(p => p.agent_id)
    }

    // 3. Get user's agent settings
    const { data: settings } = await supabase
      .from("account_agent_settings")
      .select("agent_id, is_enabled, byok_provider, byok_connected_at")
      .eq("account_id", accId)

    const settingsMap = (settings || []).reduce((acc: any, s: any) => {
      acc[s.agent_id] = s
      return acc
    }, {})

    // Merge everything
    const result = agents.map(agent => ({
      ...agent,
      is_unlocked: planAgents.includes(agent.id), // Or check top tier logic
      settings: settingsMap[agent.id] || { is_enabled: false }
    }))

    return NextResponse.json({ agents: result, plan_id: account?.plan_id })
  } catch (error: any) {
    console.error("[api/agents] GET error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { accountId, agentId, is_enabled, byok_key, byok_provider } = await req.json()
    if (!accountId || !agentId) return NextResponse.json({ error: "Missing ids" }, { status: 400 })

    const supabase = await getSupabaseBypassClient()

    if (byok_key) {
      // Handling BYOK key via RPC
      const secret = process.env.BYOK_ENCRYPTION_SECRET
      if (!secret) throw new Error("BYOK_ENCRYPTION_SECRET is not configured on server.")
      
      const { error } = await supabase.rpc("set_agent_byok_key", {
        p_account_id: accountId,
        p_agent_id: agentId,
        p_api_key: byok_key,
        p_provider: byok_provider || "unknown",
        p_secret: secret
      })

      if (error) throw new Error(error.message)
    } else if (is_enabled !== undefined) {
      // Just toggling on/off
      const { error } = await supabase
        .from("account_agent_settings")
        .upsert(
          { account_id: accountId, agent_id: agentId, is_enabled },
          { onConflict: "account_id,agent_id" }
        )
      
      if (error) throw new Error(error.message)
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[api/agents] PATCH error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
