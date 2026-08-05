"use client"

import { useEffect, useState } from "react"
import { CreditCard, AlertTriangle, CheckCircle, Package } from "lucide-react"

interface Subscription {
    id: string
    plan: string
    status: string
    current_period_end: string
}

export default function BillingPage() {
    const [subscription, setSubscription] = useState<Subscription | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    useEffect(() => {
        const fetchSubscription = async () => {
            try {
                // In a real app, this would fetch from /api/user/subscription
                // For now, we simulate a Free Trial
                setSubscription({
                    id: "sub_123",
                    plan: "Free Trial",
                    status: "active",
                    current_period_end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
                })
            } catch (err) {
                console.error("Failed to fetch subscription", err)
                setError("Failed to load subscription details")
            } finally {
                setLoading(false)
            }
        }
        fetchSubscription()
    }, [])

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-700">
            <div>
                <h1 className="font-serif-display text-4xl text-white mb-2">Billing & Subscription</h1>
                <p className="text-muted-foreground text-sm">
                    Manage your subscription plan and billing methods.
                </p>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-lg flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    <span>{error}</span>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Current Plan */}
                <div className="p-6 rounded-2xl border border-white/10 bg-[#0b0b0a] hover:border-white/20 transition-colors">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center">
                                <Package className="w-5 h-5 text-indigo-500" />
                            </div>
                            <div>
                                <h3 className="text-white font-medium">Current Plan</h3>
                                <p className="text-xs text-muted-foreground">Your active subscription</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="space-y-3 mb-6">
                        {loading ? (
                            <div className="text-sm text-neutral-500">Loading...</div>
                        ) : subscription ? (
                            <div className="bg-white/5 p-4 rounded-lg border border-white/5">
                                <div className="flex justify-between items-center mb-2">
                                    <div className="text-lg text-white font-bold">{subscription.plan}</div>
                                    <div className="text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded-full capitalize">{subscription.status}</div>
                                </div>
                                <div className="text-sm text-neutral-400">
                                    {subscription.plan === "Free Trial" ? "Ends on" : "Renews on"} {new Date(subscription.current_period_end).toLocaleDateString()}
                                </div>
                            </div>
                        ) : (
                            <div className="text-sm text-neutral-500">No active subscription found.</div>
                        )}
                    </div>
                    
                    <a 
                        href="/pricing"
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors block text-center"
                    >
                        Upgrade Plan
                    </a>
                </div>

                {/* Billing History / Methods */}
                <div className="p-6 rounded-2xl border border-white/10 bg-[#0b0b0a] hover:border-white/20 transition-colors opacity-75">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-neutral-500/10 flex items-center justify-center">
                                <CreditCard className="w-5 h-5 text-neutral-400" />
                            </div>
                            <div>
                                <h3 className="text-white font-medium">Billing Methods</h3>
                                <p className="text-xs text-muted-foreground">Manage your payment methods</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="space-y-4 mb-6">
                        <div className="text-sm text-neutral-500 flex items-center gap-2 justify-center h-20 bg-white/5 rounded-lg border border-white/5 border-dashed">
                            No payment methods on file
                        </div>
                    </div>
                    <button 
                        disabled
                        className="w-full py-2 bg-white/5 text-white/50 cursor-not-allowed rounded-lg text-sm font-medium transition-colors border border-white/10"
                    >
                        Add Payment Method
                    </button>
                </div>
            </div>
        </div>
    )
}
