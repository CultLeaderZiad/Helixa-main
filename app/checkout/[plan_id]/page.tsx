import { getSessionUser } from "@/lib/auth"
import { getSupabaseBypassClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import CheckoutClient from "./CheckoutClient"
import BackToHome from "@/components/ui/back-to-home"

export default async function CheckoutPage(props: { params: Promise<{ plan_id: string }> }) {
  const params = await props.params
  const user = await getSessionUser()
  if (!user) {
    redirect(`/signup?plan_id=${params.plan_id}`)
  }

  const supabase = await getSupabaseBypassClient()
  const { data: plan, error: planError } = await supabase
    .from("plans")
    .select("*")
    .eq("id", params.plan_id)
    .maybeSingle()

  if (planError || !plan) {
    return <div className="p-12 text-center text-white">Plan not found.</div>
  }

  const { data: methods } = await supabase
    .from("payment_method_settings")
    .select("*")
    .eq("is_enabled", true)

  return (
    <div className="min-h-screen bg-[#03010A] text-white py-24 px-6 relative">
      <BackToHome />
      <div className="max-w-xl mx-auto space-y-8 relative z-10">
        <h1 className="text-3xl font-bold text-center">Complete your checkout</h1>
        <CheckoutClient plan={plan} methods={methods || []} user={user} />
      </div>
    </div>
  )
}
