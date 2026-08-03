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
      price: 9.99,
      billing_interval: "monthly",
      features: ["Unlimited automations", "Priority support"]
    },
    {
      id: "fallback-2",
      name: "Lifetime Deal",
      description: "Pay once, use forever",
      price: 49.99,
      billing_interval: "lifetime",
      features: ["Unlimited automations", "Priority support", "Early access to new features"]
    }
  ];

  return (
    <div className="min-h-screen bg-[#03010A] text-white relative">
      <BackToHome />
      <main className="max-w-5xl mx-auto py-24 px-6 relative z-10">
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Simple, transparent pricing</h1>
          <p className="text-neutral-400 max-w-2xl mx-auto text-lg">
            Start for free, then choose a plan that fits your needs. 
            We offer automated billing via Stripe or manual payments via Vodafone Cash.
          </p>
        </div>

        <div className="grid md:grid-cols-4 gap-8 mt-12">
          {/* Trial Plan (Static) */}
          <div className="border border-white/10 rounded-2xl p-8 bg-white/[0.02] flex flex-col">
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

          {/* Dynamic Plans from DB */}
          {plans?.map((plan, idx) => {
            const isFeatured = idx === 0; // Highlight the first dynamic plan
            const icon = isFeatured ? <Zap className="w-5 h-5 text-green-400" /> : <Star className="w-5 h-5 text-[#ffe14d]" />;
            const titleColor = isFeatured ? "text-green-400" : "text-[#ffe14d]";
            const btnClass = isFeatured ? "bg-green-500 hover:bg-green-400 text-black" : "bg-[#ffe14d] hover:bg-[#e6c738] text-black";

            const planCard = (
              <div className="p-8 flex flex-col h-full bg-white/[0.02] rounded-2xl relative">
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-2">
                    {icon}
                    <h3 className={`text-xl font-bold ${titleColor}`}>{plan.name}</h3>
                  </div>
                  <p className="text-neutral-400 text-sm">{plan.description}</p>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-bold">${plan.price}</span>
                    <span className="text-neutral-500">/{plan.billing_interval === 'monthly' ? 'mo' : plan.billing_interval}</span>
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

            if (isFeatured) {
              return (
                <div key={plan.id} className="relative">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-500 text-black px-3 py-1 rounded-full text-[10px] font-bold tracking-wide z-20 whitespace-nowrap shadow-lg">
                    MOST POPULAR
                  </div>
                  <ElectricBorder color="#22c55e" speed={2} containerClassName="rounded-2xl flex-col flex h-full shadow-[0_0_40px_-15px_rgba(34,197,94,0.2)]">
                    {planCard}
                  </ElectricBorder>
                </div>
              );
            }

            return (
              <div key={plan.id} className="border border-[#ffe14d]/30 rounded-2xl bg-[#ffe14d]/[0.02] flex flex-col">
                {planCard}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  )
}
