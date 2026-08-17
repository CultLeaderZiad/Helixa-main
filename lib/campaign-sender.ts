import { sendEmail } from "./email-provider"
import { generateEmailHtml } from "./email-templates"

export async function sendCampaign(campaignId: string, supabase: any, targetAccountIds?: string[]) {
  try {
    // 1. Fetch Campaign
    const { data: campaign, error: campaignError } = await supabase
      .from("email_campaigns")
      .select("*")
      .eq("id", campaignId)
      .single()

    if (campaignError || !campaign) {
      throw new Error("Campaign not found")
    }

    if (campaign.status !== "draft" && campaign.status !== "failed" && campaign.status !== "scheduled") {
      throw new Error("Campaign is already sent or processing")
    }

    // 2. Mark as Sending and save target account IDs if provided
    const updateData: any = { status: "sending" }
    if (targetAccountIds !== undefined) {
      updateData.target_account_ids = targetAccountIds
    }
    await supabase.from("email_campaigns").update(updateData).eq("id", campaign.id)

    // 3. Fetch Audience
    let customers: any[] = []
    let isNewsletter = false

    if (targetAccountIds !== undefined && targetAccountIds.length > 0) {
      if (campaign.audience_filter === "newsletter") {
        isNewsletter = true
        const { data, error } = await supabase.from("newsletter_subscribers").select("id, email").in("id", targetAccountIds)
        if (error) {
          await supabase.from("email_campaigns").update({ status: "failed" }).eq("id", campaign.id)
          throw new Error("Failed to fetch newsletter audience")
        }
        customers = data || []
      } else {
        const { data, error } = await supabase.from("accounts").select("id, email, full_name, role, plan").in("id", targetAccountIds)
        if (error) {
          await supabase.from("email_campaigns").update({ status: "failed" }).eq("id", campaign.id)
          throw new Error("Failed to fetch audience")
        }
        customers = data || []
      }
    } else if (campaign.audience_filter === "newsletter") {
      isNewsletter = true
      const { data, error } = await supabase.from("newsletter_subscribers").select("id, email")
      if (error) {
        await supabase.from("email_campaigns").update({ status: "failed" }).eq("id", campaign.id)
        throw new Error("Failed to fetch newsletter audience")
      }
      customers = data || []
    } else {
      let query = supabase.from("accounts").select("id, email, full_name, role, plan").eq("role", "user")

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

      const { data, error } = await query
      if (error) {
        await supabase.from("email_campaigns").update({ status: "failed" }).eq("id", campaign.id)
        throw new Error("Failed to fetch audience")
      }
      customers = data || []
    }

    if (!customers || customers.length === 0) {
      await supabase.from("email_campaigns").update({ status: "completed", recipient_count: 0 }).eq("id", campaign.id)
      return { recipientCount: 0, successCount: 0 }
    }

    let successCount = 0

    // Create initial pending recipient records
    const recipientRecords = customers.map(c => ({
      campaign_id: campaign.id,
      account_id: isNewsletter ? null : c.id,
      subscriber_id: isNewsletter ? c.id : null,
      status: "pending"
    }))

    await supabase.from("email_campaigns").update({ recipient_count: customers.length }).eq("id", campaign.id)

    // Insert in chunks of 100
    for (let i = 0; i < recipientRecords.length; i += 100) {
      await supabase.from("email_campaign_recipients").insert(recipientRecords.slice(i, i + 100))
    }

    // Fetch the inserted records
    const { data: insertedRecipients } = await supabase
      .from("email_campaign_recipients")
      .select("id, account_id, subscriber_id")
      .eq("campaign_id", campaign.id)

    const recipientMap = new Map(insertedRecipients?.map((r: any) => [isNewsletter ? r.subscriber_id : r.account_id, r.id]) || [])

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
          account_id: isNewsletter ? null : customer.id,
          subscriber_id: isNewsletter ? customer.id : null,
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
          account_id: isNewsletter ? null : customer.id,
          subscriber_id: isNewsletter ? customer.id : null,
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

    return { recipientCount: customers.length, successCount }
  } catch (error: any) {
    await supabase.from("email_campaigns").update({ status: "failed" }).eq("id", campaignId)
    console.error("[sendCampaign] Error:", error)
    throw error
  }
}
