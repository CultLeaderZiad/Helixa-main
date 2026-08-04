import { type NextRequest, NextResponse } from "next/server"
import { requireInstagramUser } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const result = await requireInstagramUser(request)
    if (result.response) return result.response
    const igUser = result.igUser

    // Fetch Media (Smart Method: /me/media)
    const url = `https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp&limit=24&access_token=${igUser.access_token}`

    const res = await fetch(url, { cache: 'no-store' }) 
    const data = await res.json()

    if (data.error) {
      console.error("[v0] Instagram Media Error:", data.error)
      if (data.error.code === 190) {
         return NextResponse.json({ error: "Session Expired. Please Logout & Login." }, { status: 401 })
      }
      return NextResponse.json({ error: data.error.message }, { status: 500 })
    }

    return NextResponse.json({ data: data.data || [] })
  } catch (error) {
    console.error("[v0] Server Error:", error)
    return NextResponse.json({ error: "Server Error" }, { status: 500 })
  }
}
