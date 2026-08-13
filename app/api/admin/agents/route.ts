export const dynamic = 'force-dynamic'
import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseBypassClient } from "@/lib/supabase-server"
import { requireAdmin } from "@/lib/auth"

export async function GET(req: NextRequest) {
  try {
    const adminCheck = await requireAdmin(req)
    if (adminCheck.response) return adminCheck.response

    const supabase = await getSupabaseBypassClient()
    const { data: agents, error } = await supabase
      .from("agents")
      .select("*")
      .order("sort_order", { ascending: true })

    if (error) throw new Error(error.message)

    return NextResponse.json(agents)
  } catch (error: any) {
    console.error("[admin/agents] GET error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const adminCheck = await requireAdmin(req)
    if (adminCheck.response) return adminCheck.response

    const { id, name, description, category, is_active } = await req.json()
    if (!id) return NextResponse.json({ error: "Missing agent ID" }, { status: 400 })

    const supabase = await getSupabaseBypassClient()
    
    // Only update fields that are provided
    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (category !== undefined) updateData.category = category
    if (is_active !== undefined) updateData.is_active = is_active

    const { error } = await supabase
      .from("agents")
      .update(updateData)
      .eq("id", id)

    if (error) throw new Error(error.message)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[admin/agents] PATCH error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

