"use client"

import { useState } from "react"
import { Loader2, ArrowRight } from "lucide-react"

export default function CheckoutClient({ plan, methods, user, cycle }: { plan: any, methods: any[], user: any, cycle?: string }) {
  const [selectedMethod, setSelectedMethod] = useState<string | null>(
    methods.length > 0 ? methods[0].method : null
  )
  const [transactionRef, setTransactionRef] = useState("")
  const [clientName, setClientName] = useState("")
  const [clientPhone, setClientPhone] = useState("")
  const [countryCode, setCountryCode] = useState("+20")
  const [hasQuestions, setHasQuestions] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const selected = methods.find((m) => m.method === selectedMethod)
  const isStripe = selectedMethod === "stripe"

  const isYearlyCycle = cycle === "yearly"
  const amountToCharge = isYearlyCycle ? Number(plan.price_yearly) : Number(plan.price_usd)

  // plans.billing_cycle: "monthly" | "yearly" | "lifetime" (one-time)
  let planType = plan.billing_cycle === "monthly" ? "monthly" : "one_time"
  if (plan.billing_cycle === "monthly" && isYearlyCycle) {
    planType = "yearly"
  }

  const handleCheckout = async () => {
    if (!selectedMethod) return
    setLoading(true)

    try {
      if (isStripe) {
        const res = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            planType,
            metadata: { clientName, clientPhone: countryCode + clientPhone }
          })
        })
        const data = await res.json()
        if (data.url) {
          window.location.href = data.url
        } else {
          throw new Error(data.error || "Failed to create checkout session")
        }
      } else {
        // Manual / Vodafone Cash — submit proof for admin review
        if (!transactionRef.trim()) {
          throw new Error("Please enter your transaction reference")
        }
        if (!clientName.trim() || !clientPhone.trim()) {
          throw new Error("Please fill in your name and phone number")
        }
        
        const res = await fetch("/api/payments/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transaction_reference: transactionRef.trim(),
            amount: amountToCharge,
            payment_method: selectedMethod,
            plan_id: plan.id,
            note: `${clientName.trim()} | ${countryCode}${clientPhone.trim()}`,
          })
        })
        const data = await res.json()
        if (!data.success) {
          throw new Error(data.error || "Failed to submit payment")
        }
        setSuccess(true)
      }
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="p-8 border border-green-500/30 bg-green-500/10 rounded-2xl text-center space-y-4">
        <h2 className="text-2xl font-bold text-green-400">Payment Request Submitted!</h2>
        <p className="text-neutral-300">
          We have received your payment request for the {plan.name}.
        </p>
        {selected && (
          <div className="bg-black/50 p-4 rounded-lg mt-4 border border-white/10 text-sm text-left text-neutral-300 space-y-2">
            <p><strong>Instructions:</strong> {selected.instructions}</p>
            <p className="mt-4">Our admin will review your payment shortly. Once approved, your account will be activated!</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="border border-white/10 rounded-2xl p-6 bg-white/5">
        <h3 className="text-xl font-bold mb-1">Plan Summary</h3>
        <p className="text-neutral-400 text-sm mb-4">You are subscribing to {plan.name}</p>
        <div className="flex justify-between items-center text-lg font-bold border-t border-white/10 pt-4">
          <span>Total due today:</span>
          <span>${amountToCharge}</span>
        </div>
      </div>

      <div className="space-y-4 p-6 bg-white/[0.02] border border-white/10 rounded-2xl">
        <h3 className="text-lg font-bold">Your Information</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Full Name
            </label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="e.g. John Doe"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-neutral-500 outline-none focus:border-[#ffe14d]/50"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Phone Number
            </label>
            <div className="flex gap-2">
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="w-32 px-2 py-3 rounded-xl bg-white/5 border border-white/10 text-white outline-none focus:border-[#ffe14d]/50 cursor-pointer appearance-none text-center"
              >
                <option value="+20">🇪🇬 +20</option>
                <option value="+1">🇺🇸 +1</option>
                <option value="+44">🇬🇧 +44</option>
                <option value="+971">🇦🇪 +971</option>
                <option value="+966">🇸🇦 +966</option>
              </select>
              <input
                type="tel"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="Phone number"
                className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-neutral-500 outline-none focus:border-[#ffe14d]/50"
                required
              />
            </div>
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${hasQuestions ? 'bg-[#ffe14d] border-[#ffe14d]' : 'bg-white/5 border-white/20 group-hover:border-white/40'}`}>
                {hasQuestions && <svg className="w-3.5 h-3.5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
              </div>
              <span className="text-sm text-neutral-300 group-hover:text-white transition-colors">I have specific questions before I buy</span>
            </label>
          </div>

          {hasQuestions && (
            <div className="mt-4 p-5 border border-white/10 rounded-xl bg-[#03010A] animate-in fade-in slide-in-from-top-2">
              <h4 className="text-[#ffe14d] font-bold mb-2">Contact Support</h4>
              <p className="text-sm text-neutral-400 mb-4">
                We're here to help! Please reach out to our lead developer directly for any questions before you finalize your plan.
              </p>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3 text-neutral-300">
                  <span className="text-neutral-500 w-20">Developer:</span>
                  <span className="font-medium text-white">Ziad (CultLeaderZoz)</span>
                </div>
                <div className="flex items-center gap-3 text-neutral-300">
                  <span className="text-neutral-500 w-20">Email:</span>
                  <a href="mailto:cultleaderzoz.dev@gmail.com" className="font-medium text-blue-400 hover:underline">
                    cultleaderzoz.dev@gmail.com
                  </a>
                </div>
                <div className="flex items-center gap-3 text-neutral-300">
                  <span className="text-neutral-500 w-20">LinkedIn:</span>
                  <a href="https://www.linkedin.com/in/ziadelzallat/" target="_blank" rel="noopener noreferrer" className="font-medium text-blue-400 hover:underline">
                    View Profile
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-bold">Select Payment Method</h3>
        <div className="grid gap-4">
          {methods.map((m) => (
            <div
              key={m.method}
              onClick={() => setSelectedMethod(m.method)}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                selectedMethod === m.method ? "border-[#ffe14d] bg-[#ffe14d]/10" : "border-white/10 bg-white/5 hover:border-white/30"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold">{m.display_name}</span>
                {m.method === "vodafone_cash" && (
                  <img src="/vodafone-cash.svg" alt="Vodafone Cash" className="h-6" />
                )}
              </div>
              {m.instructions && (
                <p className="text-xs text-neutral-400 mt-2">{m.instructions}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {!isStripe && selected && (
        <div className="space-y-4">
          <div className="p-4 bg-white/5 border border-[#ffe14d]/30 rounded-xl">
            <h4 className="font-bold text-[#ffe14d] mb-2">Payment Instructions</h4>
            <p className="text-sm text-neutral-300 mb-2">
              Please transfer exactly <strong className="text-white text-base">${amountToCharge}</strong> to the following Vodafone Cash number:
            </p>
            <div className="bg-black/50 p-3 rounded-lg text-[#ffe14d] font-mono text-xl text-center border border-white/10 font-bold tracking-wider">
              +01037312994
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-neutral-300">
              Transaction Reference / Wallet Number
            </label>
            <input
              type="text"
              value={transactionRef}
              onChange={(e) => setTransactionRef(e.target.value)}
              placeholder="e.g. 01012345678 or Transaction ID"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-neutral-500 outline-none focus:border-[#ffe14d]/50"
              required
            />
          </div>
        </div>
      )}

      <button
        onClick={handleCheckout}
        disabled={loading || !selectedMethod}
        className="w-full flex items-center justify-center gap-2 bg-[#ffe14d] text-black font-bold py-4 rounded-xl hover:brightness-110 disabled:opacity-50 transition-all"
      >
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Complete Purchase"}
        {!loading && <ArrowRight className="w-5 h-5" />}
      </button>
    </div>
  )
}
