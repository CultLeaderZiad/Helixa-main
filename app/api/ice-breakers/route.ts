export const dynamic = 'force-dynamic'
import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseBypassClient } from "@/lib/supabase-server"
import { requireSessionUser } from "@/lib/auth"

export async function GET(request: NextRequest) {
    try {
        const result = await requireSessionUser(request)
        if (result.response) return result.response
        const { user: account, igUser } = result
    const igUserId = igUser?.id || account.id

        const supabase = await getSupabaseBypassClient()
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
        const result = await requireSessionUser(request)
        if (result.response) return result.response
        const { user: account, igUser } = result
    const igUserId = igUser?.id || account.id

        const body = await request.json()
        const { iceBreakers } = body // Array of ice breakers

        if (!Array.isArray(iceBreakers)) {
            return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
        }

        const supabase = await getSupabaseBypassClient()

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

        // Sync to Instagram/Messenger if access token exists
        const supabase2 = await getSupabaseBypassClient()
        const { data: igUserData } = await supabase2
            .from("users")
            .select("access_token, page_id")
            .eq("id", igUserId)
            .single()

        if (igUserData?.access_token && igUserData?.page_id) {
            const ice_breakers = inserted.map((ib: any) => ({
                question: ib.question,
                payload: `ICE_BREAKER_${ib.id}`
            }))

            const response = await fetch(
                `https://graph.instagram.com/v21.0/me/messenger_profile?access_token=${igUserData.access_token}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        ice_breakers: [
                            {
                                locale: "default",
                                call_to_actions: ice_breakers
                            }
                        ],
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

