import { type NextRequest, NextResponse } from "next/server"
import { isCronAuthorized } from "@/lib/cron-secret"

export { isCronAuthorized } from "@/lib/cron-secret"

/**
 * Cron routes fail closed. A missing CRON_SECRET is a 503, and a wrong
 * bearer token is a 401. Vercel Cron sends `Authorization: Bearer $CRON_SECRET`
 * when that env var is set on the project.
 */

export function unauthorizedCronResponse(request: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 })
  }
  if (!isCronAuthorized(request.headers.get("authorization"), secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  return null
}
