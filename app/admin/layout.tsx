import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { getSupabaseServerClient } from "@/lib/supabase-server"

async function getAdminUser() {
  const cookieStore = await cookies()
  const token = cookieStore.get("insta_session")?.value
  if (!token) return null

  const supabase = await getSupabaseServerClient()
  const { data: session } = await supabase
    .from("sessions")
    .select("user_id")
    .eq("session_token", token)
    .gt("expires_at", new Date().toISOString())
    .single()

  if (!session) return null

  const { data: user } = await supabase
    .from("users")
    .select("id, username, role")
    .eq("id", session.user_id)
    .single()

  return user
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getAdminUser()

  if (!user || user.role !== "admin") {
    redirect("/")
  }

  return (
    <div className="min-h-screen bg-[#03010A] text-[#ededed]">
      <header className="border-b border-white/[0.08] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="font-mono text-sm font-bold text-[#ffe14d]">HELIXA</span>
          <span className="text-white/20 text-xs">/</span>
          <span className="font-mono text-xs text-neutral-400">Admin Console</span>
        </div>
        <span className="font-mono text-xs text-neutral-500">@{user.username}</span>
      </header>
      <main className="p-6">{children}</main>
    </div>
  )
}
