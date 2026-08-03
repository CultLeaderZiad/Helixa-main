"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  CheckCircle, Clock, XCircle, ArrowUpRight, Zap, Star, Shield
} from "lucide-react"
import Ferrofluid from "@/components/ui/ferrofluid"

interface User {
  id: number
  username: string
  plan: string
  trial_ends_at: string | null
}

const PLAN_INFO = {
  trial: {
    label: "Free Trial",
    color: "text-blue-400",
    icon: Clock,
    description: "7-day full-access trial",
  },
  monthly: {
    label: "Monthly Plan",
    color: "text-green-400",
    icon: CheckCircle,
    description: "Billed monthly, cancel anytime",
  },
  one_time: {
    label: "Lifetime Access",
    color: "text-purple-400",
    icon: Star,
    description: "One-time payment, access forever",
  },
  expired: {
    label: "Expired",
    color: "text-red-400",
    icon: XCircle,
    description: "Your access has ended",
  },
}

export default function BillingPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)
  const router = useRouter()

  // Get success/cancel from URL
  const [status, setStatus] = useState<"success" | "canceled" | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get("success")) setStatus("success")
    if (params.get("canceled")) setStatus("canceled")

    const userId = localStorage.getItem("ig_user_id")
    const username = localStorage.getItem("ig_username")
    if (!userId || !username) {
      router.push("/")
      return
    }

    // Fetch user data to get current plan
    fetch(`/api/user/me`)
      .then(r => r.json())
      .then(d => {
        if (d.user) setUser(d.user)
        else router.push("/")
      })
      .catch(() => router.push("/"))
      .finally(() => setLoading(false))
  }, [router])

  const trialDaysLeft = () => {
    if (!user?.trial_ends_at) return 0
    const diff = new Date(user.trial_ends_at).getTime() - Date.now()
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
      {/* Ferrofluid background */}
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <Ferrofluid
          colors={["#ffffff", "#ffffff", "#ffffff"]}
          speed={0.3}
          scale={1}
          turbulence={0.5}
          fluidity={0.1}
          rimWidth={0.2}
          sharpness={3}
          shimmer={1}
          glow={1.5}
          flowDirection="down"
          opacity={1}
          mouseInteraction={false}
          mouseStrength={0}
          mouseRadius={0}
        />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="mb-12">
          <button onClick={() => router.push("/dashboard")} className="font-mono text-xs text-neutral-500 hover:text-white mb-8 flex items-center gap-2 transition-colors">
            ← Back to Dashboard
          </button>
          <h1 className="font-serif text-4xl md:text-5xl text-white mb-2">Billing & Plans</h1>
          <p className="text-neutral-500 font-mono text-sm">@{user.username}</p>
        </div>

        {/* Status banner */}
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

        {/* Current Plan Card */}
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

        {/* Upgrade options — only show if not already on paid plan */}
        {(user.plan === "trial" || user.plan === "expired") && (
          <>
            <p className="font-mono text-xs text-neutral-500 uppercase tracking-wider mb-4">Upgrade Your Plan</p>
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

                <button
                  onClick={() => checkout("monthly")}
                  disabled={checkoutLoading !== null}
                  className="w-full bg-green-500 text-black font-mono text-sm font-bold py-3 rounded-xl hover:bg-green-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {checkoutLoading === "monthly" ? "Redirecting..." : (
                    <>Subscribe Monthly <ArrowUpRight className="w-4 h-4" /></>
                  )}
                </button>
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

                <button
                  onClick={() => checkout("one_time")}
                  disabled={checkoutLoading !== null}
                  className="w-full bg-[#ffe14d] text-black font-mono text-sm font-bold py-3 rounded-xl hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {checkoutLoading === "one_time" ? "Redirecting..." : (
                    <>Get Lifetime Access <ArrowUpRight className="w-4 h-4" /></>
                  )}
                </button>
              </div>
            </div>
          </>
        )}

        {/* Already paid */}
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
