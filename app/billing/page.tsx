"use client"

import { useEffect, useState } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase-client"
import { useRouter, useSearchParams } from "next/navigation"
import { Shield, Zap, Star, AlertCircle, ArrowUpRight, CheckCircle, XCircle } from "lucide-react"

type PlanType = "trial" | "monthly" | "one_time" | "expired"

const PLAN_INFO = {
  trial: {
    label: "Free Trial",
    description: "Full access to test automations",
    color: "text-blue-400",
    icon: Zap,
  },
  monthly: {
    label: "Monthly Pro",
    description: "Unlimited access, billed monthly",
    color: "text-green-400",
    icon: Zap,
  },
  one_time: {
    label: "Lifetime Access",
    description: "Pay once, own forever",
    color: "text-[#ffe14d]",
    icon: Star,
  },
  expired: {
    label: "Expired",
    description: "Automations paused",
    color: "text-red-400",
    icon: AlertCircle,
  },
}

export default function BillingPage() {
  const supabase = getSupabaseBrowserClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const status = searchParams.get("status")

  const [user, setUser] = useState<{ id: string; username: string; plan: string; trial_ends_at: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState<"monthly" | "one_time" | null>(null)
  
  // Vodafone Cash state
  const [showVCForm, setShowVCForm] = useState<"monthly" | "one_time" | null>(null)
  const [vcRef, setVcRef] = useState("")
  const [vcNote, setVcNote] = useState("")
  const [vcLoading, setVcLoading] = useState(false)
  const [vcSuccess, setVcSuccess] = useState(false)

  useEffect(() => {
    async function loadUser() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push("/login")
        return
      }

      const res = await fetch("/api/auth/me", { cache: "no-store" })
      const data = await res.json()
      if (data.authenticated) {
        setUser({
          id: data.userId || data.accountId,
          username: data.username || "user",
          plan: data.plan || "trial",
          trial_ends_at: data.trial_ends_at || null,
        })
      }
      setLoading(false)
    }

    loadUser()
  }, [supabase, router])

  const trialDaysLeft = () => {
    if (!user?.trial_ends_at || user.plan !== "trial") return 0
    const diff = new Date(user.trial_ends_at).getTime() - new Date().getTime()
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  }

  const checkout = async (planType: "monthly" | "one_time") => {
    setCheckoutLoading(planType)
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planType }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        alert("Failed to create checkout session")
      }
    } catch {
      alert("Failed to create checkout session")
    } finally {
      setCheckoutLoading(null)
    }
  }

  const submitVC = async (e: React.FormEvent) => {
    e.preventDefault()
    setVcLoading(true)
    try {
      const amount = showVCForm === "monthly" ? 15 : 199
      const res = await fetch("/api/payments/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transaction_reference: vcRef,
          proof_note: vcNote,
          amount,
          payment_method: "vodafone_cash",
          planType: showVCForm === "monthly" ? "monthly" : "one_time",
        })
      })
      if (res.ok) {
        setVcSuccess(true)
        setShowVCForm(null)
      } else {
        alert("Failed to submit payment. Please try again.")
      }
    } catch {
      alert("An error occurred.")
    } finally {
      setVcLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#03010A] flex items-center justify-center">
        <div className="font-mono text-neutral-500">Loading...</div>
      </div>
    )
  }

  if (!user) return null

  const planInfo = PLAN_INFO[user.plan as keyof typeof PLAN_INFO] || PLAN_INFO.expired
  const PlanIcon = planInfo.icon
  const daysLeft = trialDaysLeft()

  return (
    <div className="min-h-screen bg-[#03010A] text-[#ededed] relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#ffe14d]/5 via-transparent to-transparent opacity-20 pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-16">
        <div className="mb-12">
          <button onClick={() => router.push("/dashboard")} className="font-mono text-xs text-neutral-500 hover:text-white mb-8 flex items-center gap-2 transition-colors">
            ← Back to Dashboard
          </button>
          <h1 className="font-serif text-4xl md:text-5xl text-white mb-2">Billing & Plans</h1>
          <p className="text-neutral-500 font-mono text-sm">@{user.username}</p>
        </div>

        {status === "success" && (
          <div className="mb-8 border border-green-500/30 bg-green-500/10 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
            <p className="font-mono text-sm text-green-400">Payment successful! Your plan has been activated.</p>
          </div>
        )}
        {status === "canceled" && (
          <div className="mb-8 border border-neutral-500/30 bg-neutral-500/10 rounded-xl p-4 flex items-center gap-3">
            <XCircle className="w-5 h-5 text-neutral-400 flex-shrink-0" />
            <p className="font-mono text-sm text-neutral-400">Checkout was canceled. No charge was made.</p>
          </div>
        )}
        
        {vcSuccess && (
          <div className="mb-8 border border-blue-500/30 bg-blue-500/10 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-blue-400 flex-shrink-0" />
            <p className="font-mono text-sm text-blue-400">Vodafone Cash payment submitted successfully. An admin will review it shortly.</p>
          </div>
        )}

        <div className="border border-white/[0.08] rounded-2xl p-8 bg-white/[0.02] mb-8">
          <p className="font-mono text-xs text-neutral-500 uppercase tracking-wider mb-4">Current Plan</p>
          <div className="flex items-center gap-4 mb-4">
            <div className={`p-3 rounded-xl border border-white/10 ${planInfo.color} bg-white/[0.03]`}>
              <PlanIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className={`font-mono text-2xl font-bold ${planInfo.color}`}>{planInfo.label}</h2>
              <p className="font-mono text-xs text-neutral-500">{planInfo.description}</p>
            </div>
          </div>

          {user.plan === "trial" && (
            <div className={`mt-4 p-4 rounded-xl border ${daysLeft <= 1 ? "border-red-500/30 bg-red-500/10" : "border-blue-500/30 bg-blue-500/10"}`}>
              <p className={`font-mono text-sm font-bold ${daysLeft <= 1 ? "text-red-400" : "text-blue-400"}`}>
                {daysLeft <= 0 ? "Trial expired!" : `${daysLeft} day${daysLeft !== 1 ? "s" : ""} remaining in your trial`}
              </p>
              <p className="font-mono text-xs text-neutral-500 mt-1">Upgrade before your trial ends to keep your automations running.</p>
            </div>
          )}
        </div>

        {(user.plan === "trial" || user.plan === "expired") && (
          <>
            <p className="font-mono text-xs text-neutral-500 uppercase tracking-wider mb-4">Upgrade Your Plan</p>
            
            {showVCForm ? (
              <div className="border border-white/[0.08] rounded-2xl p-8 bg-white/[0.02] mb-8 relative">
                <button 
                  onClick={() => setShowVCForm(null)}
                  className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-white"
                >
                  <XCircle className="w-5 h-5" />
                </button>
                <h3 className="text-xl font-bold mb-4">Pay via Vodafone Cash</h3>
                <p className="text-neutral-400 text-sm mb-6">
                  Please transfer <strong className="text-white">${showVCForm === "monthly" ? 15 : 199}</strong> (or equivalent in EGP) to:
                  <br /><span className="text-xl text-[#e60000] font-bold mt-2 inline-block">01037312994</span>
                </p>
                <form onSubmit={submitVC} className="space-y-4">
                  <div>
                    <label className="block text-sm text-neutral-400 mb-1">Transaction Reference</label>
                    <input 
                      type="text" 
                      required 
                      value={vcRef}
                      onChange={e => setVcRef(e.target.value)}
                      placeholder="e.g. 123456789"
                      className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white placeholder-neutral-600 focus:outline-none focus:border-white/30"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-neutral-400 mb-1">Note (optional)</label>
                    <input 
                      type="text" 
                      value={vcNote}
                      onChange={e => setVcNote(e.target.value)}
                      placeholder="Any additional details"
                      className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white placeholder-neutral-600 focus:outline-none focus:border-white/30"
                    />
                  </div>
                  <button 
                    type="submit" 
                    disabled={vcLoading}
                    className="w-full bg-[#e60000] text-white font-bold py-3 rounded-lg hover:bg-[#cc0000] transition-colors disabled:opacity-50"
                  >
                    {vcLoading ? "Submitting..." : "Submit Payment for Review"}
                  </button>
                </form>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {/* Monthly */}
                <div className="border border-white/[0.08] rounded-2xl p-6 bg-white/[0.02] hover:border-green-500/30 transition-colors group">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg border border-green-500/20 bg-green-500/10">
                      <Zap className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <h3 className="font-mono text-lg font-bold text-white">Monthly</h3>
                      <p className="font-mono text-xs text-neutral-500">Cancel anytime</p>
                    </div>
                  </div>

                  <ul className="space-y-2 mb-8">
                    {[
                      "Unlimited automations",
                      "Comment → DM funnels",
                      "AI auto-reply",
                      "Live inbox",
                      "Story triggers",
                      "Priority support",
                    ].map(f => (
                      <li key={f} className="font-mono text-xs text-neutral-400 flex items-center gap-2">
                        <CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <div className="space-y-3">
                    <button
                      onClick={() => checkout("monthly")}
                      disabled={checkoutLoading !== null}
                      className="w-full bg-green-500 text-black font-mono text-sm font-bold py-3 rounded-xl hover:bg-green-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {checkoutLoading === "monthly" ? "Redirecting..." : (
                        <>Subscribe Monthly ($15) <ArrowUpRight className="w-4 h-4" /></>
                      )}
                    </button>
                    <button
                      onClick={() => setShowVCForm("monthly")}
                      className="w-full border border-[#e60000]/30 text-[#e60000] font-mono text-sm font-bold py-3 rounded-xl hover:bg-[#e60000]/10 transition-colors flex items-center justify-center gap-2"
                    >
                      Pay via Vodafone Cash
                    </button>
                  </div>
                </div>

                {/* One-time */}
                <div className="border border-[#ffe14d]/20 rounded-2xl p-6 bg-[#ffe14d]/[0.02] hover:border-[#ffe14d]/40 transition-colors group">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg border border-[#ffe14d]/20 bg-[#ffe14d]/10">
                      <Star className="w-5 h-5 text-[#ffe14d]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-mono text-lg font-bold text-white">Lifetime</h3>
                        <span className="font-mono text-[10px] text-[#ffe14d] border border-[#ffe14d]/30 rounded-full px-2 py-0.5">BEST VALUE</span>
                      </div>
                      <p className="font-mono text-xs text-neutral-500">Pay once, own forever</p>
                    </div>
                  </div>

                  <ul className="space-y-2 mb-8">
                    {[
                      "Everything in Monthly",
                      "Lifetime access — no recurring fees",
                      "All future updates included",
                      "First access to new features",
                      "Founding member badge",
                      "Priority support forever",
                    ].map(f => (
                      <li key={f} className="font-mono text-xs text-neutral-400 flex items-center gap-2">
                        <CheckCircle className="w-3.5 h-3.5 text-[#ffe14d] flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <div className="space-y-3">
                    <button
                      onClick={() => checkout("one_time")}
                      disabled={checkoutLoading !== null}
                      className="w-full bg-[#ffe14d] text-black font-mono text-sm font-bold py-3 rounded-xl hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {checkoutLoading === "one_time" ? "Redirecting..." : (
                        <>Get Lifetime Access ($199) <ArrowUpRight className="w-4 h-4" /></>
                      )}
                    </button>
                    <button
                      onClick={() => setShowVCForm("one_time")}
                      className="w-full border border-[#e60000]/30 text-[#e60000] font-mono text-sm font-bold py-3 rounded-xl hover:bg-[#e60000]/10 transition-colors flex items-center justify-center gap-2"
                    >
                      Pay via Vodafone Cash
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {(user.plan === "monthly" || user.plan === "one_time") && (
          <div className="border border-white/[0.08] rounded-2xl p-8 bg-white/[0.02] flex items-center gap-4">
            <Shield className="w-8 h-8 text-green-400 flex-shrink-0" />
            <div>
              <h3 className="font-mono text-lg font-bold text-white mb-1">You're all set!</h3>
              <p className="font-mono text-xs text-neutral-500">
                Your automations are running with full access. 
                {user.plan === "monthly" && " To manage your subscription, contact support."}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
