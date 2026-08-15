import { CheckCircle, Zap, Star } from "lucide-react"
import Link from "next/link"
import { getSupabaseBypassClient } from "@/lib/supabase-server"
import BackToHome from "@/components/ui/back-to-home"

import PricingClient from "./PricingClient"

export const revalidate = 0;
export const dynamic = 'force-dynamic';

export default async function PricingPage() {
  const supabase = await getSupabaseBypassClient()
  const { data: dbPlans, error } = await supabase
    .from("plans")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: true })

  const { data: planAgents } = await supabase
    .from("plan_agents")
    .select("plan_id, is_enabled, agents(name)")
    .eq("is_enabled", true)

  const plans = (!error && dbPlans && dbPlans.length > 0) ? dbPlans.map((p: any) => {
    const agentsForPlan = planAgents
      ?.filter((pa: any) => pa.plan_id === p.id)
      .map((pa: any) => pa.agents?.name)
      .filter(Boolean) || []
    
    return {
      ...p,
      features: [...(p.features || []), ...agentsForPlan]
    }
  }) : [
    {
      id: "fallback-1",
      name: "Pro Plan",
      description: "Full access",
      price_usd: 9.99,
      price_yearly: 99.99,
      billing_cycle: "monthly",
      features: ["Unlimited automations", "Priority support"]
    },
    {
      id: "fallback-2",
      name: "Enterprise",
      description: "For large teams",
      billing_cycle: "enterprise",
      is_contact_sales: true,
      features: ["Custom integrations", "Dedicated account manager"]
    }
  ];

  return (
    <div className="min-h-screen bg-[#03010A] text-white relative">
      <BackToHome />
      <main className="max-w-7xl mx-auto py-24 px-6 relative z-10">
        <div className="text-center space-y-4 mb-12">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Simple, transparent pricing</h1>
          <p className="text-neutral-400 max-w-2xl mx-auto text-lg">
            Start for free, then choose a plan that fits your needs. 
            We offer automated billing via Stripe or manual payments via Vodafone Cash.
          </p>
        </div>

        <PricingClient plans={plans} />
      </main>
    </div>
  )
}
