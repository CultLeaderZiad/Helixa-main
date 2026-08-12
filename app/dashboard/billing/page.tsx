"use client"

import { useEffect, useState } from "react"
import { CreditCard, AlertTriangle, CheckCircle, Package } from "lucide-react"
import { useLanguage } from "@/lib/i18n/LanguageContext"

interface Subscription {
    id: string
    plan: string
    status: string
    current_period_end: string
}

export default function BillingPage() {
    const [subscription, setSubscription] = useState<Subscription | null>(null)
    const [plans, setPlans] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const { t } = useLanguage()

    useEffect(() => {
        const fetchSubscriptionAndPlans = async () => {
            try {
                // In a real app, this would fetch from /api/user/subscription
                // For now, we simulate a Free Trial
                setSubscription({
                    id: "sub_123",
                    plan: "Free Trial",
                    status: "active",
                    current_period_end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
                })

                // Fetch dynamic plans
                const res = await fetch("/api/plans")
                if (res.ok) {
                    const data = await res.json()
                    setPlans(data)
                }
            } catch (err) {
                console.error("Failed to fetch subscription", err)
                setError("Failed to load subscription details")
            } finally {
                setLoading(false)
            }
        }
        fetchSubscriptionAndPlans()
    }, [])

    return (
        <div className="p-8 space-y-12 animate-in fade-in duration-700 max-w-6xl mx-auto">
            <div>
                <h1 className="font-serif-display text-4xl text-white mb-2 tracking-tight">{t.billingTitle}</h1>
                <p className="text-neutral-400 text-sm max-w-lg">
                    {t.billingDesc}
                </p>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5" />
                    <span className="font-medium text-sm">{error}</span>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Current Plan */}
                <div className="p-6 rounded-3xl border border-white/[0.08] bg-black/40 backdrop-blur-xl relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                                    <Package className="w-6 h-6 text-indigo-400" />
                                </div>
                                <div>
                                    <h3 className="text-white font-bold text-lg">Current Plan</h3>
                                    <p className="text-xs text-neutral-400 font-mono">Your active subscription</p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="space-y-4 mb-8">
                            {loading ? (
                                <div className="text-sm text-neutral-500 animate-pulse">Loading subscription data...</div>
                            ) : subscription ? (
                                <div className="bg-white/[0.03] p-5 rounded-2xl border border-white/[0.05]">
                                    <div className="flex justify-between items-center mb-3">
                                        <div className="text-2xl text-white font-black tracking-tight">{subscription.plan}</div>
                                        <div className="text-[10px] uppercase tracking-wider font-bold text-[#ffe14d] bg-[#ffe14d]/10 border border-[#ffe14d]/20 px-3 py-1.5 rounded-full">{subscription.status}</div>
                                    </div>
                                    <div className="text-sm text-neutral-400">
                                        {subscription.plan === "Free Trial" ? "Trial ends on" : "Renews on"} <span className="text-white font-medium">{new Date(subscription.current_period_end).toLocaleDateString()}</span>
                                    </div>
                                    
                                    {subscription.plan === "Free Trial" && (
                                        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                                            <p className="text-xs text-red-400 leading-relaxed font-medium">
                                                Your 7-day free trial banner will be removed and AI features unlocked once you upgrade to a paid plan.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-sm text-neutral-500">No active subscription found.</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Billing Methods & Vodafone Cash */}
                <div className="p-6 rounded-3xl border border-white/[0.08] bg-black/40 backdrop-blur-xl relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center justify-center">
                                <CreditCard className="w-6 h-6 text-neutral-400" />
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-lg">Payment Methods</h3>
                                <p className="text-xs text-neutral-400 font-mono">Manage billing options</p>
                            </div>
                        </div>
                        
                        <div className="space-y-3 mb-6">
                            {/* Stripe (Default) */}
                            <div className="flex items-center justify-between p-4 bg-white/[0.03] rounded-2xl border border-white/[0.05]">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-6 bg-white rounded flex items-center justify-center overflow-hidden">
                                        {/* Stripe Logo Placeholder */}
                                        <div className="text-[#635BFF] font-black text-xs">Stripe</div>
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-white">Credit Card (Stripe)</p>
                                        <p className="text-xs text-neutral-500">Available for global users</p>
                                    </div>
                                </div>
                                <span className="text-[10px] bg-green-500/10 text-green-400 px-2 py-1 rounded-full border border-green-500/20 font-bold uppercase tracking-wider">Active</span>
                            </div>

                            {/* Vodafone Cash */}
                            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-red-600/10 to-transparent rounded-2xl border border-red-500/20">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg overflow-hidden p-1">
                                        <img src="/vodafone-cash-logo.png" alt="Vodafone Cash" className="w-full h-full object-contain" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-white">Vodafone Cash</p>
                                        <p className="text-[11px] text-red-200/70">Local mobile wallet (Egypt)</p>
                                    </div>
                                </div>
                                <span className="text-[10px] bg-yellow-500/10 text-yellow-500 px-2 py-1 rounded-full border border-yellow-500/20 font-bold uppercase tracking-wider">Manual</span>
                            </div>
                            <div className="px-4 py-4 bg-[#E60000]/5 border border-[#E60000]/20 rounded-xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-2 opacity-10 pointer-events-none">
                                    <img src="/vodafone-cash-logo.png" alt="Vodafone Cash" className="w-32 h-32 object-contain filter grayscale contrast-200" />
                                </div>
                                <h4 className="text-white font-bold text-sm mb-2">How to upgrade with Vodafone Cash:</h4>
                                <ol className="text-xs text-neutral-300 space-y-2 list-decimal list-inside relative z-10">
                                    <li>Transfer the plan amount to <strong className="text-[#ffe14d] font-mono text-sm px-1 bg-black/40 rounded">+20 01037312994</strong></li>
                                    <li>Take a screenshot of the successful transfer receipt</li>
                                    <li>Send the screenshot to <a href="mailto:cultleaderzoz.dev@gmail.com" className="text-blue-400 hover:underline">cultleaderzoz.dev@gmail.com</a> along with your account email</li>
                                    <li>Your account features will be unlocked within 24 hours</li>
                                </ol>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Upgrade Plans (Electric Border) */}
            <div className="pt-8 border-t border-white/5">
                <div className="text-center mb-10">
                    <h2 className="text-2xl font-serif-display text-white mb-3">Upgrade Your Plan</h2>
                    <p className="text-neutral-400 text-sm">Remove the 7-day trial banner and unlock all AI capabilities.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    {plans.map((plan, idx) => {
                        const isFeatured = idx === 0;
                        const borderColor = isFeatured ? "from-white/20" : "from-[#ffe14d]";
                        const titleColor = isFeatured ? "text-white" : "text-white";
                        
                        return (
                            <div key={plan.id} className={`relative group p-[${isFeatured ? '1px' : '2px'}] rounded-[2rem] overflow-hidden ${isFeatured ? 'bg-white/5' : 'bg-[#ffe14d]/20 shadow-[0_0_40px_rgba(255,225,77,0.15)]'}`}>
                                <div className={`absolute inset-0 bg-gradient-to-br ${borderColor} ${isFeatured ? 'to-transparent opacity-0 group-hover:opacity-100' : 'via-[#ffaa00] to-transparent animate-[shimmer_3s_linear_infinite] group-hover:animate-none opacity-50 group-hover:opacity-100'} transition-opacity duration-500 rounded-[2rem]`} />
                                <div className="relative h-full bg-[#050505] p-8 rounded-[2rem] flex flex-col">
                                    {!isFeatured && (
                                        <div className="absolute top-0 right-8 transform -translate-y-1/2">
                                            <span className="bg-gradient-to-r from-[#ffe14d] to-[#e6c419] text-black text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-lg">
                                                Best Value
                                            </span>
                                        </div>
                                    )}
                                    <div className="mb-6">
                                        <h3 className={`text-xl font-bold ${titleColor} mb-2`}>{plan.name}</h3>
                                        <p className="text-sm text-neutral-400">{plan.description}</p>
                                    </div>
                                    <div className="mb-8">
                                        <span className="text-5xl font-black text-white tracking-tighter">${plan.price_usd}</span>
                                        <span className="text-neutral-500">/{plan.billing_cycle === 'monthly' ? 'month' : plan.billing_cycle}</span>
                                    </div>
                                    <ul className="space-y-4 mb-8 flex-1">
                                        {((plan.features || []).concat(plan.active_agents?.map((a: any) => a.name) || [])).map((f: string, i: number) => (
                                            <li key={i} className="flex items-center gap-3 text-sm text-neutral-300">
                                                <CheckCircle className={`w-5 h-5 ${isFeatured ? 'text-indigo-400' : 'text-[#ffe14d]'}`} />
                                                {f}
                                            </li>
                                        ))}
                                    </ul>
                                    <button 
                                        onClick={() => window.location.href = `/checkout/${plan.id}`}
                                        className={`w-full py-3.5 font-bold rounded-xl transition-all ${isFeatured ? 'bg-white text-black hover:bg-neutral-200' : 'bg-gradient-to-br from-[#ffe14d] to-[#e6c419] text-black font-black hover:brightness-110 shadow-[0_10px_20px_rgba(255,225,77,0.2)] hover:-translate-y-0.5 active:translate-y-0'}`}
                                    >
                                        Select {plan.name}
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
