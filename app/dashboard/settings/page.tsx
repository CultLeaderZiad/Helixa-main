"use client"

import { useEffect, useState, useRef } from "react"
import { Settings, User, Mail, AlertTriangle, Calendar, Shield, Share2, LifeBuoy, Check, Upload, Loader2, Camera, Key } from "lucide-react"
import { TeamPanel } from "@/components/dashboard/TeamPanel"
import { getSupabaseBrowserClient } from "@/lib/supabase-client"
import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"
import Image from "next/image"
import { useLanguage } from "@/lib/i18n/LanguageContext"
import { PasswordInput } from "@/components/ui/password-input"

interface UserProfile {
    email: string
    name: string
    profilePic: string | null
    plan: string
    trial_ends_at: string | null
    created_at: string
}

export default function SettingsPage() {
    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [connectionsCount, setConnectionsCount] = useState(0)
    const { t } = useLanguage()
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    
    const [isEditing, setIsEditing] = useState(false)
    const [editName, setEditName] = useState("")
    const [editPhotoUrl, setEditPhotoUrl] = useState("")
    const [saving, setSaving] = useState(false)
    const [uploadingPhoto, setUploadingPhoto] = useState(false)
    const [successMsg, setSuccessMsg] = useState("")
    
    // Password state
    const [isChangingPassword, setIsChangingPassword] = useState(false)
    const [newPassword, setNewPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [passwordSaving, setPasswordSaving] = useState(false)
    
    const fileInputRef = useRef<HTMLInputElement>(null)

    const { data: meData, error: meError } = useSWR("/api/auth/me", fetcher)
    const { data: connData, error: connError } = useSWR("/api/user/connections", fetcher)

    useEffect(() => {
        if (meData) {
            if (meData.authenticated) {
                setProfile({
                    email: meData.email,
                    name: meData.username || "",
                    profilePic: meData.profilePic || null,
                    plan: meData.plan || "free",
                    trial_ends_at: meData.trial_ends_at,
                    created_at: meData.created_at || new Date().toISOString()
                })
                setEditName(prev => prev || meData.username || "")
                setEditPhotoUrl(prev => prev || meData.profilePic || "")
            } else {
                setError("Could not load profile. User not found.")
            }
        }
    }, [meData])

    useEffect(() => {
        if (connData?.connections) {
            setConnectionsCount(connData.connections.length)
        }
    }, [connData])

    useEffect(() => {
        if (meError || connError) {
            setError("Failed to load settings.")
            setLoading(false)
        } else if (meData && connData) {
            setLoading(false)
        }
    }, [meData, connData, meError, connError])

    const handleSaveProfile = async () => {
        setSaving(true)
        setError("")
        setSuccessMsg("")
        try {
            const res = await fetch("/api/user/profile", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    full_name: editName,
                    profile_picture_url: editPhotoUrl || null
                })
            })
            
            if (res.ok) {
                setProfile(prev => prev ? { ...prev, name: editName, profilePic: editPhotoUrl || null } : null)
                setSuccessMsg("Profile updated successfully!")
                setIsEditing(false)
                
                // Update local storage so session hook picks it up across reloads without delay
                if (editPhotoUrl) {
                    localStorage.setItem("ig_profile_pic", editPhotoUrl)
                } else {
                    localStorage.removeItem("ig_profile_pic")
                }
                localStorage.setItem("ig_username", editName)
                
                setTimeout(() => setSuccessMsg(""), 3000)
            } else {
                const data = await res.json()
                setError(data.error || "Failed to update profile")
            }
        } catch (err) {
            setError("Network error while saving profile.")
        } finally {
            setSaving(false)
        }
    }

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (file.size > 5 * 1024 * 1024) {
            setError("Image size must be less than 5MB")
            return
        }

        setUploadingPhoto(true)
        setError("")
        try {
            const supabase = getSupabaseBrowserClient()
            const fileExt = file.name.split('.').pop()
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
            const filePath = `${profile?.email || 'unknown'}/${fileName}`

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file)

            if (uploadError) {
                console.error("Upload error:", uploadError)
                throw new Error("Failed to upload image")
            }

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath)

            setEditPhotoUrl(publicUrl)
        } catch (err: any) {
            setError(err.message || "Failed to upload image")
        } finally {
            setUploadingPhoto(false)
            if (fileInputRef.current) {
                fileInputRef.current.value = ""
            }
        }
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-US", { 
            year: 'numeric', month: 'short', day: 'numeric' 
        })
    }

    const handleChangePassword = async () => {
        if (newPassword !== confirmPassword) {
            setError("Passwords do not match")
            return
        }
        if (newPassword.length < 6) {
            setError("Password must be at least 6 characters")
            return
        }

        setPasswordSaving(true)
        setError("")
        try {
            const supabase = getSupabaseBrowserClient()
            const { error: updateError } = await supabase.auth.updateUser({
                password: newPassword
            })
            if (updateError) throw updateError
            
            setSuccessMsg("Password updated successfully!")
            setIsChangingPassword(false)
            setNewPassword("")
            setConfirmPassword("")
            setTimeout(() => setSuccessMsg(""), 3000)
        } catch (err: any) {
            setError(err.message || "Failed to update password")
        } finally {
            setPasswordSaving(false)
        }
    }

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-700">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-serif-display text-4xl text-white mb-2">{t.settingsTitle}</h1>
                    <p className="text-muted-foreground text-sm">
                        Manage your account details and preferences.
                    </p>
                </div>
                <a 
                    href="mailto:cultleaderzoz.dev@gmail.com?subject=Support Request"
                    className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-sm font-medium transition-colors border border-white/10"
                >
                    <LifeBuoy className="w-4 h-4" />
                    Contact Support
                </a>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-lg flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    <span>{error}</span>
                </div>
            )}
            
            {successMsg && (
                <div className="bg-green-500/10 border border-green-500/20 text-green-500 p-4 rounded-lg flex items-center gap-2">
                    <Check className="w-5 h-5" />
                    <span>{successMsg}</span>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Profile Details */}
                <div className="p-6 rounded-2xl border border-white/10 bg-[#0b0b0a] transition-colors relative">
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
                        {!isEditing && profile && (
                            <button 
                                onClick={() => setIsEditing(true)}
                                className="text-sm text-blue-400 hover:text-blue-300 font-medium"
                            >
                                Edit
                            </button>
                        )}
                    </div>
                    
                    <div className="space-y-4 mb-6">
                        {loading ? (
                            <div className="text-sm text-neutral-500 flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" /> Loading...
                            </div>
                        ) : profile ? (
                            <div className="space-y-6">
                                {/* Avatar */}
                                <div className="flex items-center gap-4">
                                    <div 
                                        className={`relative w-16 h-16 rounded-full bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center ${isEditing ? 'cursor-pointer hover:border-white/30 transition-colors' : ''}`}
                                        onClick={() => isEditing && !uploadingPhoto && fileInputRef.current?.click()}
                                    >
                                        {uploadingPhoto ? (
                                            <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                                        ) : isEditing && editPhotoUrl ? (
                                            <img src={editPhotoUrl} alt="Avatar" className="w-full h-full object-cover" />
                                        ) : !isEditing && profile.profilePic ? (
                                            <img src={profile.profilePic} alt="Avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            <User className="w-8 h-8 text-neutral-500" />
                                        )}
                                        {isEditing && !uploadingPhoto && (
                                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                                <Camera className="w-5 h-5 text-white/70" />
                                            </div>
                                        )}
                                    </div>
                                    {isEditing && (
                                        <div className="flex-1 space-y-1">
                                            <p className="text-xs text-neutral-400 font-medium">Profile Photo</p>
                                            <p className="text-[10px] text-neutral-500">Click the avatar to upload a new image. Max size 5MB.</p>
                                            <input 
                                                type="file" 
                                                ref={fileInputRef}
                                                accept="image/*"
                                                className="hidden"
                                                onChange={handlePhotoUpload}
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs text-neutral-400 font-medium">Full Name</label>
                                    {isEditing ? (
                                        <input 
                                            type="text" 
                                            value={editName}
                                            onChange={e => setEditName(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
                                        />
                                    ) : (
                                        <div className="flex items-center gap-2 bg-white/5 p-3 rounded-lg border border-white/5 text-sm text-white">
                                            <User className="w-4 h-4 text-neutral-500" />
                                            {profile.name || "Not set"}
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs text-neutral-400 font-medium">Email Address</label>
                                    <div className="flex items-center gap-2 bg-white/5 p-3 rounded-lg border border-white/5 text-sm text-white opacity-70">
                                        <Mail className="w-4 h-4 text-neutral-500" />
                                        {profile.email}
                                    </div>
                                    {isEditing && <p className="text-[10px] text-neutral-500">Email cannot be changed here.</p>}
                                </div>
                            </div>
                        ) : (
                            <div className="text-sm text-neutral-500">Could not load profile.</div>
                        )}
                    </div>
                    
                    {isEditing && (
                        <div className="flex items-center gap-3">
                            <button 
                                onClick={handleSaveProfile}
                                disabled={saving}
                                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                Save Changes
                            </button>
                            <button 
                                onClick={() => {
                                    setIsEditing(false)
                                    setEditName(profile?.name || "")
                                    setEditPhotoUrl(profile?.profilePic || "")
                                }}
                                disabled={saving}
                                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-sm font-medium transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    )}
                </div>
                
                {/* Account Details & Team */}
                <div className="space-y-6">
                    {/* Account Stats / Info */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-5 rounded-xl border border-white/10 bg-[#0b0b0a] space-y-3">
                            <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center mb-2">
                                <Shield className="w-4 h-4 text-purple-500" />
                            </div>
                            <div>
                                <p className="text-xs text-neutral-400">Current Plan</p>
                                <p className="text-white font-medium capitalize">{profile?.plan || "Free"}</p>
                            </div>
                        </div>
                        
                        <div className="p-5 rounded-xl border border-white/10 bg-[#0b0b0a] space-y-3">
                            <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center mb-2">
                                <Calendar className="w-4 h-4 text-emerald-500" />
                            </div>
                            <div>
                                <p className="text-xs text-neutral-400">Joined Date</p>
                                <p className="text-white font-medium">{profile?.created_at ? formatDate(profile.created_at) : "-"}</p>
                            </div>
                        </div>
                        
                        <div className="col-span-2 p-5 rounded-xl border border-white/10 bg-[#0b0b0a] flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-pink-500/10 flex items-center justify-center">
                                    <Share2 className="w-5 h-5 text-pink-500" />
                                </div>
                                <div>
                                    <h4 className="text-white font-medium">Connected Platforms</h4>
                                    <p className="text-xs text-neutral-400">Manage your connected social accounts</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="text-2xl font-serif-display text-white">{connectionsCount}</span>
                                <a 
                                    href="/dashboard/connected-platforms"
                                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg text-xs font-medium transition-colors border border-white/10"
                                >
                                    Manage
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* Security Panel */}
                    <div className="p-5 rounded-xl border border-white/10 bg-[#0b0b0a] space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                                    <Key className="w-5 h-5 text-orange-500" />
                                </div>
                                <div>
                                    <h4 className="text-white font-medium">Security</h4>
                                    <p className="text-xs text-neutral-400">Manage your password</p>
                                </div>
                            </div>
                            {!isChangingPassword && (
                                <div className="flex items-center gap-3">
                                    <a 
                                        href="/forgot-password"
                                        className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                                    >
                                        Forgot Password?
                                    </a>
                                    <button
                                        onClick={() => setIsChangingPassword(true)}
                                        className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg text-xs font-medium transition-colors border border-white/10"
                                    >
                                        Change Password
                                    </button>
                                </div>
                            )}
                        </div>

                        {isChangingPassword && (
                            <div className="space-y-4 pt-4 border-t border-white/10 animate-in fade-in slide-in-from-top-2">
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-xs text-neutral-400 font-medium mb-1 block">New Password</label>
                                        <PasswordInput
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            placeholder="Enter new password"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-neutral-400 font-medium mb-1 block">Confirm Password</label>
                                        <PasswordInput
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="Confirm new password"
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={handleChangePassword}
                                        disabled={passwordSaving || !newPassword || !confirmPassword}
                                        className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {passwordSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                        Update Password
                                    </button>
                                    <button
                                        onClick={() => {
                                            setIsChangingPassword(false)
                                            setNewPassword("")
                                            setConfirmPassword("")
                                        }}
                                        disabled={passwordSaving}
                                        className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-sm font-medium transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Team Panel */}
                    <TeamPanel />
                </div>
            </div>
        </div>
    )
}
