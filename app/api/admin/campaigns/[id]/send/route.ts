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

    const { id } = await params;
    const supabase = await getSupabaseBypassClient()

    let targetAccountIds: string[] | undefined = undefined;
    try {
      const body = await request.json()
      if (body && Array.isArray(body.targetAccountIds)) {
        targetAccountIds = body.targetAccountIds
      }
    } catch (e) {
      // Ignore JSON parse errors for backwards compatibility
    }

    // 1. Fetch Campaign
    const { data: campaign, error: campaignError } = await supabase
      .from("email_campaigns")
      .select("*")
      .eq("id", id)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
    }

    if (campaign.status !== "draft" && campaign.status !== "failed") {
      return NextResponse.json({ error: "Campaign is already sent or processing" }, { status: 400 })
    }

    // 2. Mark as Sending and save target account IDs
    const updateData: any = { status: "sending" }
    if (targetAccountIds !== undefined) {
      updateData.target_account_ids = targetAccountIds
    }
    await supabase.from("email_campaigns").update(updateData).eq("id", campaign.id)

    // 3. Fetch Audience
    let query = supabase.from("accounts").select("id, email, full_name, role, plan").eq("role", "user")

    if (targetAccountIds !== undefined && targetAccountIds.length > 0) {
      // If we have specific IDs selected from the UI, only send to those
      query = query.in("id", targetAccountIds)
    } else if (campaign.audience_filter !== "all") {
      // Fallback to general filter if no specific IDs provided
      if (campaign.audience_filter === "trial") {
        query = query.eq("plan", "trial")
      } else if (campaign.audience_filter === "monthly") {
        query = query.eq("plan", "monthly")
      } else if (campaign.audience_filter === "one_time") {
        query = query.eq("plan", "one_time")
      } else if (campaign.audience_filter === "expired") {
        query = query.eq("plan", "expired")
      } else if (campaign.audience_filter === "paid") {
        query = query.in("plan", ["monthly", "one_time"])
      }
    }

    const { data: customers, error: customersError } = await query

    if (customersError) {
      await supabase.from("email_campaigns").update({ status: "failed" }).eq("id", campaign.id)
      return NextResponse.json({ error: "Failed to fetch audience" }, { status: 500 })
    }

    if (!customers || customers.length === 0) {
      await supabase.from("email_campaigns").update({ status: "completed", recipient_count: 0 }).eq("id", campaign.id)
      return NextResponse.json({ ok: true, message: "No customers matched the audience filter" })
    }

    // 4. Send Emails in batches (MVP approach: process sequentially in small chunks to avoid memory/rate limits)
    // Note: Vercel functions typically time out after 10-60s. For very large lists (>500), 
    // a background job queue (Inngest/QStash) should replace this synchronous loop.
    let successCount = 0;
    
    // Create initial pending recipient records
    const recipientRecords = customers.map(c => ({
      campaign_id: campaign.id,
      account_id: c.id,
      status: "pending"
    }))
    
    await supabase.from("email_campaigns").update({ recipient_count: customers.length }).eq("id", campaign.id)
    
    // Insert in chunks of 100 to avoid request size limits
    for (let i = 0; i < recipientRecords.length; i += 100) {
      await supabase.from("email_campaign_recipients").insert(recipientRecords.slice(i, i + 100))
    }

    // Fetch the inserted records so we have their IDs to update later
    const { data: insertedRecipients } = await supabase
      .from("email_campaign_recipients")
      .select("id, account_id")
      .eq("campaign_id", campaign.id)

    const recipientMap = new Map(insertedRecipients?.map(r => [r.account_id, r.id]) || [])

    // Process Emails
    for (const customer of customers) {
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
        customerName: customer.full_name || customer.email.split('@')[0], 
      })

      const sendResult = await sendEmail({
        to: customer.email,
        subject: campaign.subject,
        html,
      })

      const recipientId = recipientMap.get(customer.id)
      
      if (sendResult.success) {
        successCount++
        if (recipientId) {
          await supabase.from("email_campaign_recipients").update({
            status: "sent",
            provider_message_id: sendResult.messageId,
            sent_at: new Date().toISOString()
          }).eq("id", recipientId)
        }
        
        // Add to email_logs
        await supabase.from("email_logs").insert({
          campaign_id: campaign.id,
          account_id: customer.id,
          email: customer.email,
          status: "sent",
          provider_message_id: sendResult.messageId
        })
      } else {
        if (recipientId) {
          await supabase.from("email_campaign_recipients").update({
            status: "failed",
            error_message: sendResult.error
          }).eq("id", recipientId)
        }
        
        await supabase.from("email_logs").insert({
          campaign_id: campaign.id,
          account_id: customer.id,
          email: customer.email,
          status: "failed",
          error_message: sendResult.error
        })
      }
    }

    // 5. Mark Campaign Completed
    await supabase.from("email_campaigns").update({ 
      status: "completed", 
      sent_at: new Date().toISOString() 
    }).eq("id", campaign.id)

    return NextResponse.json({ ok: true, recipient_count: customers.length, success_count: successCount })
  } catch (err) {
    console.error("[api/admin/campaigns/[id]/send] Server error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
