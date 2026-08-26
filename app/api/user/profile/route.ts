export const dynamic = 'force-dynamic'
import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth"
import { getSupabaseBypassClient } from "@/lib/supabase-server"

export async function PUT(request: NextRequest) {
  try {
    const account = await getSessionUser(request)
    if (!account) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (account.is_banned) {
      return NextResponse.json({ error: "Forbidden", is_banned: true }, { status: 403 })
    }

    const body = await request.json()
    const { full_name, profile_picture_url } = body
    
    // We only update provided fields
    const updates: any = {}
    if (full_name !== undefined) updates.full_name = full_name
    if (profile_picture_url !== undefined) updates.profile_picture_url = profile_picture_url

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 })
    }

    const adminSupabase = await getSupabaseBypassClient()

    const { error } = await adminSupabase
      .from("accounts")
      .update(updates)
      .eq("id", account.id)

    if (error) {
      console.error("[Profile Update] DB Error:", error)
      return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
    }

    return NextResponse.json({ success: true, updates })
  } catch (error) {
    console.error("[Profile Update] Server Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

