"use client"

import { useEffect, useState } from "react"
import { Settings, User, Mail, AlertTriangle } from "lucide-react"

interface UserProfile {
    email: string
    name?: string
}

export default function SettingsPage() {
    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await fetch("/api/auth/me")
                if (res.ok) {
                    const data = await res.json()
                    if (data.user) {
                        setProfile({
                            email: data.user.email,
                            name: data.user.user_metadata?.name || ""
                        })
                    }
                }
            } catch (err) {
                console.error("Failed to fetch profile", err)
            } finally {
                setLoading(false)
            }
        }
        fetchProfile()
    }, [])

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-700">
            <div>
                <h1 className="font-serif-display text-4xl text-white mb-2">Account Settings</h1>
                <p className="text-muted-foreground text-sm">
                    Manage your account details and preferences.
                </p>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-lg flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    <span>{error}</span>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Profile Details */}
                <div className="p-6 rounded-2xl border border-white/10 bg-[#0b0b0a] hover:border-white/20 transition-colors">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                                <User className="w-5 h-5 text-blue-500" />
                            </div>
                            <div>
                                <h3 className="text-white font-medium">Profile Information</h3>
                                <p className="text-xs text-muted-foreground">Your personal details</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="space-y-4 mb-6">
                        {loading ? (
                            <div className="text-sm text-neutral-500">Loading...</div>
                        ) : profile ? (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs text-neutral-400 font-medium">Email Address</label>
                                    <div className="flex items-center gap-2 bg-white/5 p-3 rounded-lg border border-white/5 text-sm text-white">
                                        <Mail className="w-4 h-4 text-neutral-500" />
                                        {profile.email}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-sm text-neutral-500">Could not load profile.</div>
                        )}
                    </div>
                    <button 
                        disabled
                        className="w-full py-2 bg-white/5 text-white/50 cursor-not-allowed rounded-lg text-sm font-medium transition-colors border border-white/10"
                    >
                        Update Profile (Coming Soon)
                    </button>
                </div>
                
            </div>
        </div>
    )
}
