export const dynamic = "force-dynamic"

import { type NextRequest, NextResponse } from "next/server"
import { requireSessionUser } from "@/lib/auth"
import { getSupabaseBypassClient } from "@/lib/supabase-server"
import { botLocale } from "@/lib/bot-copy"

export async function POST(request: NextRequest) {
  const session = await requireSessionUser(request)
  if (session.response) return session.response
  const body = await request.json().catch(() => ({}))
  const locale = botLocale(String(body.locale || ""))
  const supabase = await getSupabaseBypassClient()
  await supabase.from("accounts").update({ bot_locale: locale }).eq("id", session.user.id)
  if (session.igUser?.id) await supabase.from("users").update({ bot_locale: locale }).eq("id", session.igUser.id)
  else await supabase.from("users").update({ bot_locale: locale }).eq("account_id", session.user.id)
  return NextResponse.json({ locale })
}
