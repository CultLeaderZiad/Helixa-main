import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseBypassClient } from "@/lib/supabase-server"
import { getSessionUser } from "@/lib/auth"

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    // We can also extract accountId from query param or session, defaulting to the authenticated user
    const searchParams = req.nextUrl.searchParams
    const accId = searchParams.get("accountId") || user.id

    const supabase = await getSupabaseBypassClient()
    
    // 1. Get all active agents
    const { data: agents, error: agentsError } = await supabase
      .from("agents")
      .select("*")
      .eq("is_active", true)
      .order("sort_order")

    if (agentsError) {
      if (agentsError.code === '42P01') {
        // Table doesn't exist yet, return empty list gracefully
        return NextResponse.json({ agents: [], plan_id: null })
      }
      throw new Error(agentsError.message)
    }

    // 2. Get user's plan, role, and plan_agents mapping
    const { data: account } = await supabase.from("accounts").select("plan, role").eq("id", accId).maybeSingle()
    let planAgents: string[] = []
    
    if (account?.role === 'admin') {
      planAgents = agents?.map((a: any) => a.id) || []
    } else if (account?.plan) {
      const { data: pa, error: paError } = await supabase.from("plan_agents").select("agent_id").eq("plan_id", account.plan)
      if (pa && !paError) planAgents = pa.map((p: any) => p.agent_id)
    }

    // 3. Get user's agent settings
    const { data: settings, error: settingsError } = await supabase
      .from("account_agent_settings")
      .select("agent_id, is_enabled, byok_provider, byok_connected_at")
      .eq("account_id", accId)

    const settingsMap = (!settingsError && settings ? settings : []).reduce((acc: any, s: any) => {
      acc[s.agent_id] = s
      return acc
    }, {})

    // Merge everything
    const result = agents?.map((agent: any) => ({
      ...agent,
      is_unlocked: planAgents.includes(agent.id),
      settings: settingsMap[agent.id] || { is_enabled: false }
    })) || []

    return NextResponse.json({ agents: result, plan_id: account?.plan })
  } catch (error: any) {
    console.error("[api/agents] GET error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getSessionUser(req)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { accountId, agentId, is_enabled, byok_key, byok_provider } = await req.json()
    // Use the passed accountId or default to the user's id
    const accId = accountId || user.id

    if (!accId || !agentId) return NextResponse.json({ error: "Missing ids" }, { status: 400 })

    const supabase = await getSupabaseBypassClient()

    if (byok_key) {
      // Handling BYOK key via RPC
      const secret = process.env.BYOK_ENCRYPTION_SECRET
      if (!secret) throw new Error("BYOK_ENCRYPTION_SECRET is not configured on server.")
      
      const { error } = await supabase.rpc("set_agent_byok_key", {
        p_account_id: accId,
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
          { account_id: accId, agent_id: agentId, is_enabled },
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
