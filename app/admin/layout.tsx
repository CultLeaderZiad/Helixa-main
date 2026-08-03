import { redirect } from "next/navigation"
import { getSessionUser } from "@/lib/auth"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const account = await getSessionUser()

  if (!account || account.role !== "admin" || account.is_banned) {
    redirect("/admin/login")
  }

  return (
    <div className="min-h-screen bg-[#03010A] text-[#ededed]">
      <header className="border-b border-white/[0.08] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="font-mono text-sm font-bold text-[#ffe14d]">HELIXA</span>
          <span className="text-white/20 text-xs">/</span>
          <a href="/admin" className="font-mono text-xs text-neutral-400 hover:text-white transition-colors">Users & Stats</a>
          <a href="/admin/plans" className="font-mono text-xs text-neutral-400 hover:text-white transition-colors">Plans</a>
        </div>
        <span className="font-mono text-xs text-neutral-500">@{account.email}</span>
      </header>
      <main className="p-6">{children}</main>
    </div>
  )
}
