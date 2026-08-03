"use client"

import { useState } from "react"
import { Loader2, ArrowRight } from "lucide-react"

export default function CheckoutClient({ plan, methods, user }: { plan: any, methods: any[], user: any }) {
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(methods.length > 0 ? methods[0].id : null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const selectedMethod = methods.find(m => m.id === selectedMethodId)

  const handleCheckout = async () => {
    if (!selectedMethod) return
    setLoading(true)

    try {
      if (selectedMethod.provider === "stripe") {
        const res = await fetch("/api/stripe/create-checkout-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planId: plan.id })
        })
        const data = await res.json()
        if (data.url) {
          window.location.href = data.url
        } else {
          throw new Error(data.error || "Failed to create checkout session")
        }
      } else if (selectedMethod.provider === "vodafone_cash" || selectedMethod.provider === "manual") {
        // Handle manual flow or just show success screen indicating pending activation
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
        {selectedMethod?.provider === "vodafone_cash" && (
          <div className="bg-black/50 p-4 rounded-lg mt-4 border border-white/10 text-sm text-left text-neutral-300 space-y-2">
            <p><strong>Instructions:</strong> {selectedMethod.config?.instructions}</p>
            <p><strong>Phone Number:</strong> <span className="text-[#ffe14d]">{selectedMethod.config?.phone_number}</span></p>
            <p className="mt-4">Please upload your receipt to our support chat or wait 24h for manual activation.</p>
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
          <span>${plan.price_usd}</span>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-bold">Select Payment Method</h3>
        <div className="grid gap-4">
          {methods.map(m => (
            <div 
              key={m.id} 
              onClick={() => setSelectedMethodId(m.id)}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                selectedMethodId === m.id ? "border-[#ffe14d] bg-[#ffe14d]/10" : "border-white/10 bg-white/5 hover:border-white/30"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold">{m.name}</span>
                {m.provider === 'vodafone_cash' && (
                  <img src="/vodafone-cash.svg" alt="Vodafone Cash" className="h-6" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={handleCheckout}
        disabled={loading || !selectedMethodId}
        className="w-full flex items-center justify-center gap-2 bg-[#ffe14d] text-black font-bold py-4 rounded-xl hover:brightness-110 disabled:opacity-50 transition-all"
      >
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Complete Purchase"}
        {!loading && <ArrowRight className="w-5 h-5" />}
      </button>
    </div>
  )
}
