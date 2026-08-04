import { CheckCircle, Zap, Star } from "lucide-react"
import Link from "next/link"
import { getSupabaseServerClient } from "@/lib/supabase-server"
import ElectricBorder from "@/components/ui/electric-border"
import BackToHome from "@/components/ui/back-to-home"

export const dynamic = 'force-dynamic';

export default async function PricingPage() {
  const supabase = await getSupabaseServerClient()
  const { data: dbPlans, error } = await supabase
    .from("plans")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: true })

  // Use fallback plans if the table doesn't exist yet (SQL not run) or is empty
  const plans = (!error && dbPlans && dbPlans.length > 0) ? dbPlans : [
    {
      id: "fallback-1",
      name: "Monthly Plan",
      description: "Full access, billed monthly",
      price_usd: 9.99,
      billing_cycle: "monthly",
      features: ["Unlimited automations", "Priority support"]
    },
    {
      id: "fallback-2",
      name: "Lifetime Deal",
      description: "Pay once, use forever",
      price_usd: 49.99,
      billing_cycle: "lifetime",
      features: ["Unlimited automations", "Priority support", "Early access to new features"]
    }
  ];

  return (
    <div className="min-h-screen bg-[#03010A] text-white relative">
      <BackToHome />
      <main className="max-w-7xl mx-auto py-24 px-6 relative z-10">
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Simple, transparent pricing</h1>
          <p className="text-neutral-400 max-w-2xl mx-auto text-lg">
            Start for free, then choose a plan that fits your needs. 
            We offer automated billing via Stripe or manual payments via Vodafone Cash.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mt-12 pt-4">
          {/* Trial Plan (Static) */}
          <div className="relative pt-4">
            <ElectricBorder color="#ffffff" speed={6} containerClassName="rounded-2xl flex-col flex h-full">
              <div className="border border-white/10 rounded-2xl p-8 bg-white/[0.02] flex flex-col h-full">
                <div className="mb-8">
                  <h3 className="text-xl font-bold text-white mb-2">Free Trial</h3>
                  <p className="text-neutral-400 text-sm">To test the waters.</p>
                  <div className="mt-4 text-3xl font-bold">$0</div>
                </div>
                
                <ul className="space-y-4 mb-8 flex-1">
                  {["Full access to all features", "7-day limit", "No credit card required"].map(f => (
                    <li key={f} className="flex items-start gap-3 text-sm text-neutral-300">
                      <CheckCircle className="w-5 h-5 text-neutral-500 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <Link href="/login" className="w-full block text-center bg-white/10 hover:bg-white/20 text-white font-medium py-3 rounded-xl transition-colors">
                  Start Free Trial
                </Link>
              </div>
            </ElectricBorder>
          </div>

          {/* Dynamic Plans from DB */}
          {plans?.map((plan, idx) => {
            // Wait! The user might want the second plan to be most popular, or maybe it just needs to be visible.
            const isFeatured = idx === 0; // Highlight the first dynamic plan
            const icon = isFeatured ? <Zap className="w-5 h-5 text-green-400" /> : <Star className="w-5 h-5 text-[#ffe14d]" />;
            const titleColor = isFeatured ? "text-green-400" : "text-[#ffe14d]";
            const btnClass = isFeatured ? "bg-green-500 hover:bg-green-400 text-black" : "bg-[#ffe14d] hover:bg-[#e6c738] text-black";
            const borderColor = isFeatured ? "#22c55e" : "#ffe14d";

            const planCard = (
              <div className="p-8 flex flex-col h-full bg-white/[0.02] rounded-2xl relative">
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-2">
                    {icon}
                    <h3 className={`text-xl font-bold ${titleColor}`}>{plan.name}</h3>
                  </div>
                  <p className="text-neutral-400 text-sm">{plan.description}</p>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-bold">${plan.price_usd}</span>
                    <span className="text-neutral-500">/{plan.billing_cycle === 'monthly' ? 'mo' : plan.billing_cycle}</span>
                  </div>
                </div>
                
                <ul className="space-y-4 mb-8 flex-1">
                  {(plan.features || []).map((f: string) => (
                    <li key={f} className="flex items-start gap-3 text-sm text-neutral-300">
                      <CheckCircle className={`w-5 h-5 shrink-0 ${isFeatured ? 'text-green-400' : 'text-[#ffe14d]'}`} />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <Link href={`/checkout/${plan.id}`} className={`w-full block text-center font-bold py-3 rounded-xl transition-colors ${btnClass}`}>
                  Select {plan.name}
                </Link>
              </div>
            );

            return (
              <div key={plan.id} className="relative pt-4">
                {isFeatured && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-green-500 text-black px-4 py-1.5 rounded-full text-xs font-bold tracking-wider z-20 whitespace-nowrap shadow-xl border border-black/20">
                    MOST POPULAR
                  </div>
                )}
                <ElectricBorder color={borderColor} speed={isFeatured ? 2 : 4} containerClassName="rounded-2xl flex-col flex h-full">
                  {planCard}
                </ElectricBorder>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  )
}
