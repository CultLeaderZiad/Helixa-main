import { redirect } from "next/navigation"

export default function IceBreakersPage() {
  redirect("/dashboard/automations?type=ice_breaker")
}
