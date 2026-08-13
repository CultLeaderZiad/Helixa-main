export const dynamic = 'force-dynamic'
import { NextResponse } from "next/server"
import { getSupabaseBypassClient } from "@/lib/supabase-server"

export async function GET() {
  try {
    const supabase = await getSupabaseBypassClient()
    const { data, error } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "update_banner")
      .single()

    if (error || !data) {
      return NextResponse.json({ isActive: false, message: "", link: "" })
    }

    return NextResponse.json(data.value)
  } catch (error) {
    console.error("[api/settings/banner] GET error:", error)
    return NextResponse.json({ isActive: false, message: "", link: "" })
  }
}

