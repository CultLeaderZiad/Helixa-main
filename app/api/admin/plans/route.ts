import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { getSupabaseServerClient } from "@/lib/supabase-server"

export async function GET(request: NextRequest) {
  const adminCheck = await requireAdmin()
  if (adminCheck.response) return adminCheck.response

  const supabase = await getSupabaseServerClient()
  const { data, error } = await supabase
    .from("plans")
    .select("*")
    .order("created_at", { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const adminCheck = await requireAdmin()
  if (adminCheck.response) return adminCheck.response

  try {
    const body = await request.json()
    const { name, description, price_usd, billing_cycle, features, stripe_price_id } = body
    const supabase = await getSupabaseServerClient()

    const { data, error } = await supabase
      .from("plans")
      .insert({
        name,
        description,
        price_usd,
        billing_cycle,
        features: features || [],
        stripe_price_id,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
