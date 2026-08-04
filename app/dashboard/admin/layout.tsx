import { redirect } from "next/navigation"
import { getSessionUser } from "@/lib/auth"

export default async function DashboardAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const account = await getSessionUser()

  if (!account) {
    redirect("/login")
  }

  if (account.role !== "admin" || account.is_banned) {
    redirect("/dashboard")
  }

  return <>{children}</>
}
