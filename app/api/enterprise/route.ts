export const dynamic = 'force-dynamic'
import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"

export async function POST(req: Request) {
  try {
    const supabase = await getSupabaseServerClient()
    
    // We optionally get the user session
    const { data: { session } } = await supabase.auth.getSession()
    const account_id = session?.user?.id || null 

    const body = await req.json()
    const { full_name, email, company, needs_description } = body

    if (!full_name || !email) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 })
    }

    const { error } = await supabase.from("enterprise_inquiries").insert({
      account_id,
      full_name,
      email,
      company,
      needs_description
    })

    if (error) {
      console.error("Error creating enterprise inquiry:", error)
      return NextResponse.json({ error: "Failed to submit inquiry. Please try again later." }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("Enterprise inquiry error:", err)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

