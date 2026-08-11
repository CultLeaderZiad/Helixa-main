import { NextResponse } from "next/server"
import { getSessionInstagramUser } from "@/lib/auth"
import { getSupabaseBypassClient } from "@/lib/supabase-server"

export async function GET(request: Request) {
    try {
        const sessionUser = await getSessionInstagramUser()
        if (!sessionUser) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const paramUserId = searchParams.get("userId")
        
        // Ensure the requested userId matches the logged-in user's ig_user_id
        if (paramUserId && paramUserId !== sessionUser.id.toString()) {
            return NextResponse.json({ error: "Unauthorized userId" }, { status: 403 })
        }

        const supabase = await getSupabaseBypassClient()
        
        const { data, error } = await supabase
            .from("users")
            .select("ai_enabled, ai_context")
            .eq("id", sessionUser.id)
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
        const sessionUser = await getSessionInstagramUser()
        if (!sessionUser) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await request.json()
        const { userId, enabled, ai_context } = body

        if (userId && userId.toString() !== sessionUser.id.toString()) {
            return NextResponse.json({ error: "Unauthorized userId" }, { status: 403 })
        }

        const supabase = await getSupabaseBypassClient()
        
        const updateData: any = {}
        if (enabled !== undefined) updateData.ai_enabled = enabled
        if (ai_context !== undefined) updateData.ai_context = ai_context

        const { error } = await supabase
            .from("users")
            .update(updateData)
            .eq("id", sessionUser.id)

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true })

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
