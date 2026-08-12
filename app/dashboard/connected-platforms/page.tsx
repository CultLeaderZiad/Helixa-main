"use client"

import { useState, useEffect } from "react"
import { useLanguage } from "@/lib/i18n/LanguageContext"
import { AlertTriangle, Plus, Loader2, X } from "lucide-react"

interface Connection {
    id: string
    platform: string
    page_id: string
    metadata?: any
}

export default function ConnectedPlatformsPage() {
    const { t } = useLanguage()
    const [connections, setConnections] = useState<Connection[]>([])
    const [loading, setLoading] = useState(true)
    const [deletingId, setDeletingId] = useState<string | null>(null)

    useEffect(() => {
        fetchConnections()
    }, [])

    const fetchConnections = async () => {
        try {
            const res = await fetch("/api/user/connections")
            if (res.ok) {
                const data = await res.json()
                setConnections(data.connections || [])
            }
        } catch (error) {
            console.error("Failed to fetch connections:", error)
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id: string, platform: string) => {
        if (platform === 'instagram') {
            alert('Cannot disconnect primary Instagram account from this page.')
            return
        }
        
        if (!confirm('Are you sure you want to disconnect this account?')) return
        
        setDeletingId(id)
        try {
            const res = await fetch(`/api/user/connections?id=` + encodeURIComponent(id), {
                method: 'DELETE'
            })
            if (res.ok) {
                setConnections(connections.filter(c => c.id !== id))
            } else {
                alert('Failed to disconnect')
            }
        } catch (error) {
            console.error("Failed to disconnect:", error)
        } finally {
            setDeletingId(null)
        }
    }

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8 pb-32">
            <div>
                <h1 className="font-serif-display text-4xl text-white mb-2">{t.sidebar.connectedPlatforms}</h1>
                <p className="text-muted-foreground">Connect your social accounts to start automating.</p>
            </div>

            <div className="grid gap-6">
                {/* Instagram (Primary) */}
                <div className="p-6 rounded-2xl border border-white/10 bg-[#0b0b0a] hover:border-white/20 transition-colors">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-pink-500/10 flex items-center justify-center text-pink-500">
                                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-white font-medium">Instagram</h3>
                                <p className="text-xs text-muted-foreground">Automate Instagram Comments and DMs</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="space-y-3 mb-6">
                        {loading ? (
                            <div className="text-sm text-neutral-500">Loading...</div>
                        ) : connections.filter(c => c.platform === "instagram").length > 0 ? (
                            connections.filter(c => c.platform === "instagram").map(c => (
                                <div key={c.id} className="flex items-center justify-between bg-white/5 p-3 rounded-lg border border-white/5">
                                    <div>
                                        <div className="text-sm text-white font-medium">{c.metadata?.username || c.page_id}</div>
                                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">INSTAGRAM</div>
                                    </div>
                                    <div className="text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded-full">Connected</div>
                                </div>
                            ))
                        ) : (
                            <div className="text-sm text-neutral-500">No Instagram accounts connected.</div>
                        )}
                    </div>
                    <button 
                        disabled
                        className="w-full py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    >
                        {connections.filter(c => c.platform === "instagram").length > 0 ? "Connected" : "Connect Instagram"}
                    </button>
                </div>

                {/* Facebook */}
                <div className="p-6 rounded-2xl border border-white/10 bg-[#0b0b0a] hover:border-white/20 transition-colors">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-white font-medium">Facebook</h3>
                                <p className="text-xs text-muted-foreground">Automate Facebook Comments and Messenger</p>
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
                                    <div className="flex items-center gap-3">
                                        <div className="text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded-full">Connected</div>
                                        <button 
                                            onClick={() => handleDelete(c.id, c.platform)}
                                            disabled={deletingId === c.id}
                                            className="text-red-400 hover:text-red-300 transition-colors p-1"
                                            title="Disconnect"
                                        >
                                            {deletingId === c.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-sm text-neutral-500">No Facebook Pages connected.</div>
                        )}
                    </div>
                    <button 
                        onClick={() => window.location.href = "/api/facebook/auth"}
                        className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        Connect Facebook Page
                    </button>
                </div>

                {/* WhatsApp */}
                <div className="p-6 rounded-2xl border border-white/10 bg-[#0b0b0a] hover:border-white/20 transition-colors">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
                                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                                </svg>
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
                                    <div className="flex items-center gap-3">
                                        <div className="text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded-full">Connected</div>
                                        <button 
                                            onClick={() => handleDelete(c.id, c.platform)}
                                            disabled={deletingId === c.id}
                                            className="text-red-400 hover:text-red-300 transition-colors p-1"
                                            title="Disconnect"
                                        >
                                            {deletingId === c.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                                        </button>
                                    </div>
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
