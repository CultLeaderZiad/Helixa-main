import { CheckCircle, Zap, Star } from "lucide-react"
import Link from "next/link"

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#03010A] text-white">
      <main className="max-w-5xl mx-auto py-24 px-6">
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Simple, transparent pricing</h1>
          <p className="text-neutral-400 max-w-2xl mx-auto text-lg">
            Start for free, then choose a plan that fits your needs. 
            We offer automated billing via Stripe or manual payments via Vodafone Cash.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Trial Plan */}
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

          {/* Monthly Plan */}
          <div className="border border-green-500/30 rounded-2xl p-8 bg-green-500/[0.02] relative flex flex-col shadow-[0_0_40px_-15px_rgba(34,197,94,0.2)]">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-green-500 text-black px-3 py-1 rounded-full text-xs font-bold tracking-wide">
              MOST POPULAR
            </div>
            
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-5 h-5 text-green-400" />
                <h3 className="text-xl font-bold text-green-400">Monthly</h3>
              </div>
              <p className="text-neutral-400 text-sm">For growing creators.</p>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-3xl font-bold">$15</span>
                <span className="text-neutral-500">/mo</span>
              </div>
            </div>
            
            <ul className="space-y-4 mb-8 flex-1">
              {[
                "Unlimited automations",
                "Comment → DM funnels",
                "AI auto-reply via Groq",
                "Live inbox & analytics",
                "Story triggers",
                "Priority support",
                "Pay via Stripe or Vodafone Cash"
              ].map(f => (
                <li key={f} className="flex items-start gap-3 text-sm text-neutral-300">
                  <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <Link href="/login" className="w-full block text-center bg-green-500 hover:bg-green-400 text-black font-bold py-3 rounded-xl transition-colors">
              Subscribe Monthly
            </Link>
          </div>

          {/* Lifetime Plan */}
          <div className="border border-[#ffe14d]/30 rounded-2xl p-8 bg-[#ffe14d]/[0.02] flex flex-col">
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-2">
                <Star className="w-5 h-5 text-[#ffe14d]" />
                <h3 className="text-xl font-bold text-[#ffe14d]">Lifetime</h3>
              </div>
              <p className="text-neutral-400 text-sm">Pay once, own forever.</p>
              <div className="mt-4 text-3xl font-bold">$199</div>
            </div>
            
            <ul className="space-y-4 mb-8 flex-1">
              {[
                "Everything in Monthly",
                "Lifetime access",
                "No recurring fees",
                "All future updates",
                "Founding member badge",
                "Pay via Stripe or Vodafone Cash"
              ].map(f => (
                <li key={f} className="flex items-start gap-3 text-sm text-neutral-300">
                  <CheckCircle className="w-5 h-5 text-[#ffe14d] shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <Link href="/login" className="w-full block text-center bg-[#ffe14d] hover:bg-[#ffe14d]/90 text-black font-bold py-3 rounded-xl transition-colors">
              Get Lifetime
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
