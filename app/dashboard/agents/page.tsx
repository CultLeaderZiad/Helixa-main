import { redirect } from "next/navigation"

export default function AgentsPage() {
  redirect("/dashboard/ai-engine?tab=agents")
}
