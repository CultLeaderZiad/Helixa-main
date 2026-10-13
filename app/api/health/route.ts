export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { captureException } from "@/lib/monitoring"
import { BRAND } from "@/lib/brand"

export async function GET() {
  const time = new Date().toISOString()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({
      ok: true,
      service: BRAND.slug,
      status: "degraded",
      time,
      checks: { supabase: "unconfigured" },
    })
  }
  try {
    const response = await fetch(`${supabaseUrl.replace(/\/$/, "")}/auth/v1/health`, {
      headers: { apikey: serviceKey },
      cache: "no-store",
    })
    const supabase = response.ok ? "ok" : "down"
    return NextResponse.json(
      { ok: response.ok, service: BRAND.slug, status: response.ok ? "ok" : "degraded", time, checks: { supabase } },
      { status: response.ok ? 200 : 503 },
    )
  } catch (error) {
    await captureException(error, { route: "health" })
    return NextResponse.json(
      { ok: false, service: BRAND.slug, status: "degraded", time, checks: { supabase: "down" } },
      { status: 503 },
    )
  }
}
