export const dynamic = "force-dynamic"

import { type NextRequest, NextResponse } from "next/server"
import { requireSessionUser } from "@/lib/auth"
import { getSupabaseBypassClient } from "@/lib/supabase-server"
import { listMemberships } from "@/lib/workspaces"
import { sumKpis, type ReportKpis } from "@/lib/agency/reports"

export async function GET(request: NextRequest) {
  const session = await requireSessionUser(request)
  if (session.response) return session.response
  const supabase = await getSupabaseBypassClient()
  const memberships = await listMemberships(supabase, session.user.id)
  const owned = (memberships || []).filter((membership) => membership.role === "owner" || membership.role === "admin")
  const clients: Array<{ workspaceId: string; name: string; kpis: ReportKpis }> = []
  for (const membership of owned) {
    const profile = await supabase.from("users").select("id").eq("workspace_id", membership.workspaceId).maybeSingle()
    const userId = profile.data?.id
    const kpis = await kpisFor(supabase, userId)
    clients.push({ workspaceId: membership.workspaceId, name: membership.name, kpis })
  }
  return NextResponse.json({ clients, totals: sumKpis(clients.map((client) => client.kpis)) })
}

async function kpisFor(supabase: any, userId: string | number | undefined): Promise<ReportKpis> {
  if (!userId) return { conversations: 0, newContacts: 0, orders: 0, revenueCents: 0, aiReplies: 0, handoffs: 0 }
  const [contacts, orders, answers, conversations] = await Promise.all([
    supabase.from("contacts").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("orders").select("total_cents, status").eq("user_id", userId).limit(500),
    supabase.from("ai_answer_logs").select("id, handoff").eq("user_id", userId).limit(500),
    supabase.from("conversations").select("id", { count: "exact", head: true }).eq("user_id", userId),
  ])
  const paid = (orders.data || []).filter((row: any) => row.status === "paid" || row.status === "fulfilled")
  return {
    conversations: conversations.count || 0,
    newContacts: contacts.count || 0,
    orders: (orders.data || []).length,
    revenueCents: paid.reduce((sum: number, row: any) => sum + Number(row.total_cents || 0), 0),
    aiReplies: (answers.data || []).length,
    handoffs: (answers.data || []).filter((row: any) => row.handoff).length,
  }
}
