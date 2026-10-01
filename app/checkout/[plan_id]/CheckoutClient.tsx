"use client"

import { useState } from "react"
import Link from "next/link"
import { Loader2, ArrowRight, Clock, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import CopyButton from "@/components/ui/CopyButton"

export default function CheckoutClient({ plan, methods, user, cycle }: { plan: any, methods: any[], user: any, cycle?: string }) {
  const [selectedMethod, setSelectedMethod] = useState<string | null>(
    methods.length > 0 ? methods[0].method : null
  )
  const [transactionRef, setTransactionRef] = useState("")
  const [clientName, setClientName] = useState("")
  const [clientPhone, setClientPhone] = useState("")
  const [countryCode, setCountryCode] = useState("+20")
  const [hasQuestions, setHasQuestions] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [submittedRef, setSubmittedRef] = useState("")

  const selected = methods.find((m) => m.method === selectedMethod)
  const isStripe = selectedMethod === "stripe"

  const isYearlyCycle = cycle === "yearly"
  const amountToCharge = isYearlyCycle ? Number(plan.price_yearly) : Number(plan.price_usd)

  // plans.billing_cycle: "monthly" | "yearly" | "lifetime" (one-time)
  let planType = plan.billing_cycle === "monthly" ? "monthly" : "one_time"
  if (plan.billing_cycle === "monthly" && isYearlyCycle) {
    planType = "yearly"
  }

  const billingSummary = plan.billing_cycle === "monthly"
    ? (isYearlyCycle
        ? "You are subscribing to a yearly plan, billed once every 12 months. It renews automatically until you cancel — cancel anytime from your Billing page."
        : "You are subscribing to a monthly plan, billed in advance every month. It renews automatically until you cancel — cancel anytime from your Billing page, no cancellation fee.")
    : "This is a one-time purchase: you pay once and keep access. No recurring charges."

  const handleCheckout = async () => {
    if (!selectedMethod) return
    if (!termsAccepted) {
      toast.error("Please accept the Terms, Refund & Cancellation, and Privacy policies before continuing.")
      return
    }
    setLoading(true)

    try {
      if (isStripe) {
        // Stripe collects the payer's name/contact on its hosted page — we don't
        // collect them here (data minimization): nothing server-side reads them.
        const res = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planType })
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
        setSubmittedRef(transactionRef.trim())
        setSuccess(true)
      }
    } catch (err: any) {
      toast.error(err.message)
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
        {submittedRef && (
          <div className="bg-black/50 p-4 rounded-lg mt-4 border border-white/10 text-sm text-left text-neutral-300 space-y-2">
            <p className="text-xs uppercase tracking-wider text-neutral-500 font-mono-ui">Your transaction reference (keep this for support)</p>
            <div className="flex items-center justify-between gap-3 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
              <code className="font-mono text-[#e5a93c] text-base break-all">{submittedRef}</code>
              <CopyButton value={submittedRef} label="transaction reference" />
            </div>
          </div>
        )}
        {selected && (
          <div className="bg-black/50 p-4 rounded-lg mt-4 border border-white/10 text-sm text-left text-neutral-300 space-y-2">
            <p><strong>Instructions:</strong> {selected.instructions}</p>
            <p className="mt-4">Our admin will review your payment shortly — typically within 24–48 hours. Once approved, your account will be activated and you'll receive a confirmation. If the reference cannot be matched (wrong amount, wrong number, or duplicate), we'll contact you on the phone number you provided and refund the transfer to the sending wallet if it can't be resolved.</p>
          </div>
        )}
        <Link href="/dashboard/billing" className="inline-block mt-2 bg-[#e5a93c] hover:bg-[#d4952b] text-black font-bold py-2.5 px-6 rounded-xl transition-colors text-sm">
          Go to Billing
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="border border-white/10 rounded-2xl p-6 bg-white/5">
        <h3 className="text-xl font-bold mb-1">Plan Summary</h3>
        <p className="text-neutral-400 text-sm mb-4">You are purchasing the {plan.name}</p>
        <div className="flex justify-between items-center text-lg font-bold border-t border-white/10 pt-4">
          <span>Total due today:</span>
          <span>${amountToCharge}</span>
        </div>
        <p className="text-xs text-neutral-400 mt-4 leading-relaxed">{billingSummary}</p>
        <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
          Prices are shown in USD. By continuing you'll see exactly what you're charged before any payment is taken.
        </p>
      </div>

      {!isStripe && (
      <div className="space-y-4 p-6 bg-white/[0.02] border border-white/10 rounded-2xl">
        <h3 className="text-lg font-bold">Your Information</h3>
        <p className="text-xs text-neutral-400">We use your name and phone number only to verify your manual payment and contact you if the reference can't be matched.</p>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="checkout-name" className="block text-sm font-medium text-neutral-300 mb-2">
              Full Name
            </label>
            <input
              id="checkout-name"
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="e.g. John Doe"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-neutral-500 outline-none focus:border-[#e5a93c]/50"
              required
            />
          </div>

          <div>
            <label htmlFor="checkout-phone" className="block text-sm font-medium text-neutral-300 mb-2">
              Phone Number
            </label>
            <div className="flex gap-2">
              <select
                aria-label="Country code"
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="w-32 px-2 py-3 rounded-xl bg-white/5 border border-white/10 text-white outline-none focus:border-[#e5a93c]/50 cursor-pointer appearance-none text-center"
              >
                <option value="+20">🇪🇬 +20</option>
                <option value="+1">🇺🇸 +1</option>
                <option value="+44">🇬🇧 +44</option>
                <option value="+971">🇦🇪 +971</option>
                <option value="+966">🇸🇦 +966</option>
              </select>
              <input
                id="checkout-phone"
                type="tel"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="Phone number"
                className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-neutral-500 outline-none focus:border-[#e5a93c]/50"
                required
              />
            </div>
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${hasQuestions ? 'bg-[#e5a93c] border-[#e5a93c]' : 'bg-white/5 border-white/20 group-hover:border-white/40'}`}>
                {hasQuestions && <svg className="w-3.5 h-3.5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
              </div>
              <span className="text-sm text-neutral-300 group-hover:text-white transition-colors">I have specific questions before I buy</span>
            </label>
          </div>

          {hasQuestions && (
            <div className="mt-4 p-5 border border-white/10 rounded-xl bg-[#03010A] animate-in fade-in slide-in-from-top-2">
              <h4 className="text-[#e5a93c] font-bold mb-2">Contact Support</h4>
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
      )}

      <div className="space-y-4">
        <h3 className="text-lg font-bold">Select Payment Method</h3>
        <div className="grid gap-4">
          {methods.map((m) => (
            <div
              key={m.method}
              onClick={() => setSelectedMethod(m.method)}
              role="radio"
              aria-checked={selectedMethod === m.method}
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedMethod(m.method) } }}
              className={`p-4 rounded-xl border cursor-pointer transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#e5a93c] ${
                selectedMethod === m.method ? "border-[#e5a93c] bg-[#e5a93c]/10" : "border-white/10 bg-white/5 hover:border-white/30"
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
          <div className="p-4 bg-white/5 border border-[#e5a93c]/30 rounded-xl">
            <h4 className="font-bold text-[#e5a93c] mb-2">Payment Instructions</h4>
            <p className="text-sm text-neutral-300 mb-2">
              Please transfer exactly <strong className="text-white text-base">${amountToCharge}</strong> to the following Vodafone Cash number:
            </p>
            <div className="bg-black/50 p-3 rounded-lg text-[#e5a93c] font-mono text-xl text-center border border-white/10 font-bold tracking-wider flex items-center justify-center gap-2">
              +01037312994
              <CopyButton value="+201037312994" label="Vodafone Cash number" />
            </div>
          </div>

          <div className="p-4 border border-white/10 rounded-xl bg-white/[0.02] space-y-2 text-sm text-neutral-300">
            <h4 className="font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#e5a93c]" /> Vodafone Cash terms
            </h4>
            <ul className="list-disc pl-5 space-y-1.5 text-xs leading-relaxed">
              <li>Activation is manual: our team verifies your transfer and activates your plan, typically within <strong className="text-white">24–48 hours</strong>.</li>
              <li>Submit the transaction reference exactly as it appears in your Vodafone Cash SMS.</li>
              <li>If the reference cannot be matched (wrong amount, wrong number, invalid or duplicate submission), we will contact you on the phone number above. If it cannot be resolved, the submission is rejected and the transferred amount is <strong className="text-white">refunded to the sending wallet</strong>.</li>
              <li>This purchase does not auto-renew — you'll need to submit a new payment when the period ends.</li>
              <li>Refund terms: see the <Link href="/refund" className="text-[#e5a93c] hover:underline">Refund &amp; Cancellation Policy</Link>.</li>
            </ul>
          </div>
          
          <div className="space-y-2">
            <label htmlFor="checkout-txref" className="block text-sm font-medium text-neutral-300">
              Transaction Reference / Wallet Number
            </label>
            <input
              id="checkout-txref"
              type="text"
              value={transactionRef}
              onChange={(e) => setTransactionRef(e.target.value)}
              placeholder="e.g. 01012345678 or Transaction ID"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-neutral-500 outline-none focus:border-[#e5a93c]/50"
              required
            />
          </div>
        </div>
      )}

      {/* Terms acceptance — required before commitment */}
      <div className="p-4 border border-white/10 rounded-xl bg-white/[0.02]">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-[#e5a93c] cursor-pointer"
          />
          <span className="text-xs text-neutral-300 leading-relaxed">
            I agree to the{" "}
            <Link href="/terms" target="_blank" className="text-[#e5a93c] hover:underline">Terms of Service</Link>,{" "}
            <Link href="/refund" target="_blank" className="text-[#e5a93c] hover:underline">Refund &amp; Cancellation Policy</Link>, and{" "}
            <Link href="/privacy" target="_blank" className="text-[#e5a93c] hover:underline">Privacy Policy</Link>.{" "}
            {plan.billing_cycle === "monthly" && "I understand this subscription renews automatically and how to cancel."}
          </span>
        </label>
        <p className="flex items-start gap-2 text-[11px] text-neutral-500 mt-3 leading-relaxed">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-neutral-500" />
          {plan.billing_cycle === "monthly"
            ? "Renews automatically until canceled. Cancel anytime from Billing & Subscription — your plan stays active until the end of the paid period."
            : "One-time payment. No recurring charges. 14-day full refund window applies."}
        </p>
      </div>

      <button
        onClick={handleCheckout}
        disabled={loading || !selectedMethod}
        aria-label={isStripe ? "Continue to secure Stripe payment" : "Submit Vodafone Cash payment for review"}
        className="w-full flex items-center justify-center gap-2 bg-[#e5a93c] hover:bg-[#d4952b] text-black font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(229,169,60,0.25)] disabled:opacity-50 transition-all cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e5a93c]"
      >
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isStripe ? "Continue to Payment" : "Submit Payment for Review")}
        {!loading && <ArrowRight className="w-5 h-5" />}
      </button>
    </div>
  )
}
