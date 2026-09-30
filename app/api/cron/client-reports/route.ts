export const dynamic = "force-dynamic"
export const maxDuration = 60

import { type NextRequest, NextResponse } from "next/server"
import { unauthorizedCronResponse } from "@/lib/cron-auth"
import { getSupabaseBypassClient } from "@/lib/supabase-server"
import { nextReportAt, renderReportPdf, reportIsDue, shareToken, type ReportKpis } from "@/lib/agency/reports"
import { sendEmail } from "@/lib/email-provider"

export async function GET(request: NextRequest) {
  const denied = unauthorizedCronResponse(request)
  if (denied) return denied
  const supabase = await getSupabaseBypassClient()
  const { data, error } = await supabase.from("client_reports").select("*").eq("enabled", true).limit(50)
  if (error) return NextResponse.json({ error: error.message, sent: 0 }, { status: 200 })
  const now = Date.now()
  let sent = 0
  for (const report of data || []) {
    if (!reportIsDue({ cadence: report.cadence, enabled: report.enabled, nextSendAt: report.next_send_at, lastSentAt: report.last_sent_at }, now)) continue
    const kpis = await loadKpis(supabase, report.user_id)
    const token = shareToken()
    const period = new Date(now).toISOString().slice(0, 10)
    await supabase.from("client_report_runs").insert({
      report_id: report.id,
      workspace_id: report.workspace_id,
      period_label: period,
      kpis,
      share_token: token,
    })
    const origin = process.env.NEXT_PUBLIC_APP_URL || "https://helixa.local"
    const link = `${origin}/share/report/${token}`
    const pdf = report.format === "pdf" ? await renderReportPdf({ appName: "Helixa", clientName: report.recipient_email, periodLabel: period, kpis }) : null
    const mailed = await sendEmail({
      to: report.recipient_email,
      subject: `Your Helixa report · ${period}`,
      html: `<p>Your latest numbers are ready.</p><p><a href="${link}">Open the report</a></p>${pdf ? `<p>PDF: <a href="${link}?format=pdf">Download</a></p>` : ""}`,
    })
    await supabase.from("client_reports").update({
      last_sent_at: new Date(now).toISOString(),
      next_send_at: new Date(nextReportAt(report.cadence === "monthly" ? "monthly" : "weekly", now)).toISOString(),
    }).eq("id", report.id)
    if (mailed.success) sent += 1
  }
  return NextResponse.json({ sent, checked: (data || []).length })
}

async function loadKpis(supabase: any, userId: string | number): Promise<ReportKpis> {
  const [contacts, orders, answers, conversations] = await Promise.all([
    supabase.from("contacts").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("orders").select("total_cents, status").eq("user_id", userId).limit(500),
    supabase.from("ai_answer_logs").select("handoff").eq("user_id", userId).limit(500),
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
