export const dynamic = "force-dynamic"
export const maxDuration = 60

import { type NextRequest, NextResponse } from "next/server"
import { unauthorizedCronResponse } from "@/lib/cron-auth"
import { getSupabaseBypassClient } from "@/lib/supabase-server"
import { drainInboundEvents } from "@/lib/inbound-worker"

/**
 * GET /api/cron/process-inbound-events
 *
 * Safety net for the inbound queue. Webhooks also drain via `after()` once
 * the row is stored, so a delivery is not stuck waiting for the next minute.
 * Failures, rate-limit defers, and a crashed drain are picked up here.
 *
 * Vercel invokes this with `Authorization: Bearer $CRON_SECRET`.
 * A every-minute schedule needs a plan that allows it (Vercel Pro). On Hobby,
 * point any external cron at this path with the same bearer token.
 */
export async function GET(request: NextRequest) {
  const denied = unauthorizedCronResponse(request)
  if (denied) return denied

  try {
    const supabase = await getSupabaseBypassClient()
    const summary = await drainInboundEvents(supabase)
    return NextResponse.json(summary)
  } catch (error: any) {
    console.error("[cron/process-inbound-events]", error)
    return NextResponse.json({ error: error?.message || "Drain failed" }, { status: 500 })
  }
}
