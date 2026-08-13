export const dynamic = 'force-dynamic'
import { NextResponse } from "next/server"
import { requireInstagramUser } from "@/lib/auth"
import { getSupabaseBypassClient } from "@/lib/supabase-server"

export async function GET(request: Request) {
    try {
        const result = await requireInstagramUser()
        if (result.response) return result.response
        const { igUser } = result

        const { searchParams } = new URL(request.url)
        const paramUserId = searchParams.get("userId")
        
        // Ensure the requested userId matches the logged-in user's ig_user_id
        if (paramUserId && paramUserId !== igUser.id.toString()) {
            return NextResponse.json({ error: "Unauthorized userId" }, { status: 403 })
        }

        const supabase = await getSupabaseBypassClient()
        
        const { data, error } = await supabase
            .from("users")
            .select("ai_enabled, ai_context")
            .eq("id", igUser.id)
            .single()

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({
            enabled: data?.ai_enabled ?? false,
            ai_context: data?.ai_context ?? ""
        })

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function PUT(request: Request) {
    try {
        const result = await requireInstagramUser()
        if (result.response) return result.response
        const { igUser } = result

        const body = await request.json()
        const { userId, enabled, ai_context } = body

        if (userId && userId.toString() !== igUser.id.toString()) {
            return NextResponse.json({ error: "Unauthorized userId" }, { status: 403 })
        }

        const supabase = await getSupabaseBypassClient()
        
        const updateData: any = {}
        if (enabled !== undefined) updateData.ai_enabled = enabled
        if (ai_context !== undefined) updateData.ai_context = ai_context

        const { error } = await supabase
            .from("users")
            .update(updateData)
            .eq("id", igUser.id)

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true })

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

