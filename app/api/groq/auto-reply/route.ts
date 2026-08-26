export const dynamic = 'force-dynamic'
import { NextResponse } from "next/server"
import { requireSessionUser } from "@/lib/auth"
import { getSupabaseBypassClient } from "@/lib/supabase-server"

export async function GET(request: Request) {
    try {
        const nextReq = request as any
        const result = await requireSessionUser(nextReq)
        if (result.response) return result.response
        const { user: account, igUser } = result

        const { searchParams } = new URL(request.url)
        const paramUserId = searchParams.get("userId")
        
        // Ensure the requested userId matches the logged-in user's ig_user_id
        if (paramUserId && paramUserId !== account.id.toString()) {
            return NextResponse.json({ error: "Unauthorized userId" }, { status: 403 })
        }

        const supabase = await getSupabaseBypassClient()
        
        const { data, error } = await supabase
            .from("users")
            .select("ai_enabled, ai_context")
            .eq("id", account.id)
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
        const nextReq = request as any
        const result = await requireSessionUser(nextReq)
        if (result.response) return result.response
        const { user: account, igUser } = result

        const body = await request.json()
        const { userId, enabled, ai_context } = body

        if (userId && userId.toString() !== account.id.toString()) {
            return NextResponse.json({ error: "Unauthorized userId" }, { status: 403 })
        }

        const supabase = await getSupabaseBypassClient()
        
        const updateData: any = {}
        if (enabled !== undefined) updateData.ai_enabled = enabled
        if (ai_context !== undefined) updateData.ai_context = ai_context

        const { error } = await supabase
            .from("users")
            .update(updateData)
            .eq("id", account.id)

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true })

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

