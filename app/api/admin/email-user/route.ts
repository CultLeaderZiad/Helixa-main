export const dynamic = 'force-dynamic'
import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { getSupabaseBypassClient } from "@/lib/supabase-server"
import { sendEmail } from "@/lib/email-provider"
import { generateEmailHtml, type EmailTemplateData } from "@/lib/email-templates"

export async function POST(request: NextRequest) {
  const adminCheck = await requireAdmin(request)
  if (adminCheck.response) return adminCheck.response

  try {
    const { userId, message } = await request.json()

    if (!userId || !message) {
      return NextResponse.json({ error: "userId and message are required" }, { status: 400 })
    }

    const supabase = await getSupabaseBypassClient()
    const { data: user } = await supabase.from("users").select("username, email").eq("id", userId).single()

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    if (!user.email) {
      return NextResponse.json({ error: "User has no email address" }, { status: 400 })
    }

    const templateData: EmailTemplateData = {
      template: "custom",
      subject: "Message from Helixa",
      heading: "A message from the Helixa team",
      bodyText: message,
      customerName: user.username || undefined,
    }

    const html = generateEmailHtml(templateData)

    const result = await sendEmail({
      to: user.email,
      subject: templateData.subject,
      html,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed to send email" }, { status: 500 })
    }

    return NextResponse.json({ success: true, messageId: result.messageId })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

