import { redirect } from "next/navigation"

export default function AnalyticsPage() {
  redirect("/dashboard/ai-engine?tab=analytics")
}
