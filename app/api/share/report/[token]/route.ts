export const dynamic = "force-dynamic"

import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseBypassClient } from "@/lib/supabase-server"
import { renderReportPdf, type ReportKpis } from "@/lib/agency/reports"

export async function GET(request: NextRequest, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params
  if (!/^[a-f0-9]{20,64}$/i.test(token)) return NextResponse.json({ error: "Not found" }, { status: 404 })
  const supabase = await getSupabaseBypassClient()
  const { data } = await supabase.from("client_report_runs").select("period_label, kpis, workspace_id").eq("share_token", token).maybeSingle()
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 })
  const kpis = data.kpis as ReportKpis
  if (request.nextUrl.searchParams.get("format") === "pdf") {
    const bytes = await renderReportPdf({ appName: "Helixa", clientName: "Client", periodLabel: data.period_label, kpis })
    return new NextResponse(Buffer.from(bytes), {
      headers: { "Content-Type": "application/pdf", "Content-Disposition": "inline; filename=report.pdf" },
    })
  }
  return NextResponse.json({ period: data.period_label, kpis })
}
