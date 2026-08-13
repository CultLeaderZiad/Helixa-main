export const dynamic = 'force-dynamic'
import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseBypassClient } from "@/lib/supabase-server"
import { requireAdmin } from "@/lib/auth"
import { sendEmail } from "@/lib/email-provider"
import { generateEmailHtml } from "@/lib/email-templates"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const result = await requireAdmin(request)
    if (result.response) return result.response
    const { user: adminAccount } = result

    const { id } = await params;
    const supabase = await getSupabaseBypassClient()
    const { data: campaign, error } = await supabase
      .from("email_campaigns")
      .select("*")
      .eq("id", id)
      .single()

    if (error || !campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
    }

    const html = generateEmailHtml({
      template: campaign.template,
      subject: campaign.subject,
      previewText: campaign.preview_text,
      heroImage: campaign.hero_image,
      heading: campaign.heading,
      subheading: campaign.subheading,
      bodyText: campaign.body_text,
      features: campaign.features,
      ctaText: campaign.cta_text,
      ctaUrl: campaign.cta_url,
      customerName: "Admin", // Test personalization
    })

    const sendResult = await sendEmail({
      to: adminAccount.email,
      subject: `[TEST] ${campaign.subject}`,
      html,
    })

    if (!sendResult.success) {
      return NextResponse.json({ error: sendResult.error || "Failed to send test email" }, { status: 500 })
    }

    return NextResponse.json({ ok: true, messageId: sendResult.messageId })
  } catch (err) {
    console.error("[api/admin/campaigns/[id]/send-test] Server error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
