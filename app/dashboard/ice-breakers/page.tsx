import { redirect } from "next/navigation"

export default function IceBreakersPage() {
  redirect("/dashboard/ai-engine?tab=ice-breakers")
}
