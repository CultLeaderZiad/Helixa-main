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

export async function POST(request: NextRequest) {
  try {
    const result = await requireInstagramUser(request)
    if (result.response) return result.response
    const igUser = result.igUser

    const { url } = await request.json()
    if (!url) return NextResponse.json({ error: "Missing url" }, { status: 400 })

    const match = url.match(/(?:instagram\.com|instagr\.am)\/(?:p|reel|tv)\/([^\/?#&]+)/i)
    if (!match) return NextResponse.json({ error: "Invalid Instagram URL" }, { status: 400 })
    
    const shortcode = match[1]

    // Fetch media with shortcode to find the id
    const graphUrl = `https://graph.instagram.com/me/media?fields=id,shortcode,caption,media_type,media_url,thumbnail_url,permalink,timestamp&limit=100&access_token=${igUser.access_token}`
    
    const res = await fetch(graphUrl, { cache: 'no-store' })
    const data = await res.json()

    if (data.error) {
      return NextResponse.json({ error: data.error.message }, { status: 500 })
    }

    const mediaList = data.data || []
    const foundMedia = mediaList.find((m: any) => m.shortcode === shortcode || m.permalink?.includes(shortcode))

    if (foundMedia) {
      return NextResponse.json({
        id: foundMedia.id,
        image_url: foundMedia.thumbnail_url || foundMedia.media_url,
        media_type: foundMedia.media_type,
        caption: foundMedia.caption
      })
    }

    // Not found in recent 100, might need pagination or just return error
    return NextResponse.json({ error: "Media not found in recent posts" }, { status: 404 })
  } catch (error) {
    console.error("[v0] Media resolve error:", error)
    return NextResponse.json({ error: "Failed to resolve media" }, { status: 500 })
  }
}
