import { NextResponse } from "next/server"
import { getSupabaseBypassClient } from "@/lib/supabase-server"

export async function GET() {
  const supabase = await getSupabaseBypassClient()
  const { data, error } = await supabase
    .from("plans")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}
