export const dynamic = "force-dynamic"

import { type NextRequest, NextResponse } from "next/server"
import { requireSessionUser } from "@/lib/auth"
import { getWorkspaceUsage } from "@/lib/billing/workspace-usage"

export async function GET(request: NextRequest) {
  const session = await requireSessionUser(request)
  if (session.response) return session.response

  const workspaceId = session.workspace?.id || null
  const accountId = session.user.id

  const usage = await getWorkspaceUsage(workspaceId, accountId)
  return NextResponse.json(usage)
}
