import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId")
    const automationId = searchParams.get("automationId")

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 })
    }

    let query = supabase.from("automation_events").select(`
      id,
      event_type,
      variant_id,
      automation_variants (
        id,
        variant_name
      )
    `).eq("user_id", userId)

    if (automationId) {
      query = query.eq("automation_id", automationId)
    }

    const { data: events, error } = await query

    if (error) {
      console.error("Failed to fetch events", error)
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    // Process data for Funnel
    // Typical funnel stages: triggered -> sent -> replied -> link_clicked -> converted
    const funnelStages = {
      triggered: 0,
      sent: 0,
      replied: 0,
      link_clicked: 0,
      converted: 0
    }

    // Process data for Variants
    const variants: Record<string, { id: string, name: string, sent: number, replied: number, converted: number }> = {}
    
    // Add "default" variant for events without a variant_id
    variants["default"] = { id: "default", name: "Default Variant", sent: 0, replied: 0, converted: 0 }

    for (const event of events || []) {
      const type = event.event_type || "sent"
      if (funnelStages[type as keyof typeof funnelStages] !== undefined) {
        funnelStages[type as keyof typeof funnelStages]++
      }

      const vId = event.variant_id || "default"
      const variantObj = Array.isArray(event.automation_variants) 
        ? event.automation_variants[0] 
        : event.automation_variants
        
      if (!variants[vId]) {
        variants[vId] = {
          id: vId,
          name: variantObj?.variant_name || `Variant ${vId.slice(0, 4)}`,
          sent: 0,
          replied: 0,
          converted: 0
        }
      }

      if (type === "sent") variants[vId].sent++
      if (type === "replied") variants[vId].replied++
      if (type === "converted") variants[vId].converted++
    }

    return NextResponse.json({
      funnel: funnelStages,
      variants: Object.values(variants)
    })
  } catch (error) {
    console.error("Funnel API error", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
