import crypto from "crypto"
import { type NextRequest, NextResponse } from "next/server"

/**
 * Cron routes fail closed. A missing CRON_SECRET is a 503, and a wrong
 * bearer token is a 401. Vercel Cron sends `Authorization: Bearer $CRON_SECRET`
 * when that env var is set on the project.
 */
export function isCronAuthorized(authorizationHeader: string | null, secret: string | undefined): boolean {
  if (!secret) return false
  const expected = `Bearer ${secret}`
  const actual = authorizationHeader ?? ""
  const actualBuf = Buffer.from(actual)
  const expectedBuf = Buffer.from(expected)
  if (actualBuf.length !== expectedBuf.length) return false
  return crypto.timingSafeEqual(actualBuf, expectedBuf)
}

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
