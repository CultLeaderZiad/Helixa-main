"use client"

import { useEffect, useState } from "react"
import { Settings, Facebook, MessageCircle, AlertTriangle, Instagram, PhoneCall } from "lucide-react"

interface Connection {
    id: string
    platform: string
    page_id: string
    metadata: any
    created_at: string
}

export default function SettingsPage() {
    const [connections, setConnections] = useState<Connection[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    useEffect(() => {
        // Handle URL parameters for oauth errors/success
        const params = new URLSearchParams(window.location.search)
        const err = params.get("error")
        const success = params.get("success")
        if (err) setError(err)
        if (success) setError("")

        const fetchConnections = async () => {
            try {
                const res = await fetch("/api/user/connections")
                const data = await res.json()
                if (data.connections) {
                    setConnections(data.connections)
                }
            } catch (err) {
                console.error("Failed to fetch connections", err)
            } finally {
                setLoading(false)
            }
        }
        fetchConnections()
    }, [])

    const handleConnectFacebook = () => {
        window.location.href = "/api/facebook/auth"
    }

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-700">
            <div>
                <h1 className="font-serif-display text-4xl text-white mb-2">System Settings</h1>
                <p className="text-muted-foreground text-sm">
                    Configure your connected platforms and account preferences.
                </p>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-lg flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    <span>Error connecting platform: {error}</span>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Facebook Pages */}
                <div className="p-6 rounded-2xl border border-white/10 bg-[#0b0b0a] hover:border-white/20 transition-colors">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                                <Facebook className="w-5 h-5 text-blue-500" />
                            </div>
                            <div>
                                <h3 className="text-white font-medium">Facebook Pages</h3>
                                <p className="text-xs text-muted-foreground">Automate Page comments and DMs</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="space-y-3 mb-6">
                        {loading ? (
                            <div className="text-sm text-neutral-500">Loading...</div>
                        ) : connections.filter(c => c.platform === "facebook" || c.platform === "messenger").length > 0 ? (
                            connections.filter(c => c.platform === "facebook" || c.platform === "messenger").map(c => (
                                <div key={c.id} className="flex items-center justify-between bg-white/5 p-3 rounded-lg border border-white/5">
                                    <div>
                                        <div className="text-sm text-white font-medium">{c.metadata?.name || c.page_id}</div>
                                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{c.platform}</div>
                                    </div>
                                    <div className="text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded-full">Connected</div>
                                </div>
                            ))
                        ) : (
                            <div className="text-sm text-neutral-500">No Facebook Pages connected.</div>
                        )}
                    </div>
                    <button 
                        onClick={handleConnectFacebook}
                        className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        Connect Facebook Page
                    </button>
                </div>

                {/* WhatsApp */}
                <div className="p-6 rounded-2xl border border-white/10 bg-[#0b0b0a] hover:border-white/20 transition-colors">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                                <PhoneCall className="w-5 h-5 text-green-500" />
                            </div>
                            <div>
                                <h3 className="text-white font-medium">WhatsApp</h3>
                                <p className="text-xs text-muted-foreground">Automate WhatsApp Business</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-500/90 p-3 rounded-lg flex items-start gap-2 mb-6 text-xs leading-relaxed">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <div>
                            <strong>Manual Setup Required:</strong> WhatsApp requires pre-approved template messages via Meta Business Manager for business-initiated messages outside the 24-hour service window.
                        </div>
                    </div>
                    
                    <div className="space-y-3 mb-6">
                        {loading ? (
                            <div className="text-sm text-neutral-500">Loading...</div>
                        ) : connections.filter(c => c.platform === "whatsapp").length > 0 ? (
                            connections.filter(c => c.platform === "whatsapp").map(c => (
                                <div key={c.id} className="flex items-center justify-between bg-white/5 p-3 rounded-lg border border-white/5">
                                    <div>
                                        <div className="text-sm text-white font-medium">{c.metadata?.name || c.page_id}</div>
                                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{c.platform}</div>
                                    </div>
                                    <div className="text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded-full">Connected</div>
                                </div>
                            ))
                        ) : (
                            <div className="text-sm text-neutral-500">No WhatsApp accounts connected.</div>
                        )}
                    </div>
                    <button 
                        disabled
                        className="w-full py-2 bg-white/5 text-white/50 cursor-not-allowed rounded-lg text-sm font-medium transition-colors border border-white/10"
                    >
                        Configure via Meta App Dashboard
                    </button>
                </div>
                
            </div>
        </div>
    )
}
