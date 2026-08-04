import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"
import { requireInstagramUser } from "@/lib/auth"

export async function GET(request: NextRequest) {
    try {
        const result = await requireInstagramUser(request)
        if (result.response) return result.response
        const igUser = result.igUser
        const igUserId = igUser.id

        const supabase = await getSupabaseServerClient()
        const { data, error } = await supabase
            .from("ice_breakers")
            .select("*")
            .eq("user_id", igUserId)
            .order("created_at", { ascending: true })

        if (error) throw error

        return NextResponse.json(data)
    } catch (error) {
        console.error("Ice Breaker GET Error:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const result = await requireInstagramUser(request)
        if (result.response) return result.response
        const igUser = result.igUser
        const igUserId = igUser.id

        const body = await request.json()
        const { iceBreakers } = body // Array of ice breakers

        if (!Array.isArray(iceBreakers)) {
            return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
        }

        const supabase = await getSupabaseServerClient()

        // Update Database (Delete all for session user and re-insert)
        const { error: deleteError } = await supabase
            .from("ice_breakers")
            .delete()
            .eq("user_id", igUserId)

        if (deleteError) throw deleteError

        const { data: inserted, error: insertError } = await supabase
            .from("ice_breakers")
            .insert(iceBreakers.map((ib: any) => ({
                user_id: igUserId,
                question: ib.question,
                response: ib.response,
                is_active: true
            })))
            .select()

        if (insertError) throw insertError

        // Sync to Instagram
        if (igUser.access_token && igUser.page_id) {
            const ice_breakers = inserted.map((ib: any) => ({
                question: ib.question,
                payload: `ICE_BREAKER_${ib.id}`
            }))

            const response = await fetch(
                `https://graph.instagram.com/v21.0/me/messenger_profile?access_token=${igUser.access_token}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        ice_breakers: ice_breakers,
                        platform: "instagram"
                    })
                }
            )
            const igResult = await response.json()
            if (igResult.error) {
                console.error("IG Sync Error", igResult.error)
                return NextResponse.json({ success: true, warning: "Saved to DB but IG Sync failed", error: igResult.error }, { status: 200 })
            }
        }

        return NextResponse.json({ success: true, data: inserted })

    } catch (error) {
        console.error("Ice Breaker POST Error:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
