export const dynamic = 'force-dynamic'
import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseBypassClient } from "@/lib/supabase-server"
import { requireAdmin } from "@/lib/auth"
import { sendCampaign } from "@/lib/campaign-sender"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const result = await requireAdmin(request)
    if (result.response) return result.response

    const { id } = await params;
    const supabase = await getSupabaseBypassClient()

    let targetAccountIds: string[] | undefined = undefined;
    try {
      const body = await request.json()
      if (body && Array.isArray(body.targetAccountIds)) {
        targetAccountIds = body.targetAccountIds
      }
    } catch (e) {
      // Ignore JSON parse errors
    }

    const { recipientCount, successCount } = await sendCampaign(id, supabase, targetAccountIds)

    return NextResponse.json({ ok: true, recipient_count: recipientCount, success_count: successCount })
  } catch (err: any) {
    console.error("[api/admin/campaigns/[id]/send] Server error:", err)
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 })
  }
}
