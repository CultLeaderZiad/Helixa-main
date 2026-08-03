"use client"

import { useState, useEffect, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"

export function useInstagramSession() {
    const [username, setUsername] = useState<string | null>(null)
    const [accountId, setAccountId] = useState<string | null>(null)
    const [userId, setUserId] = useState<string | null>(null)
    const [profilePic, setProfilePic] = useState<string | null>(null)
    const [plan, setPlan] = useState<string | null>(null)
    const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    const searchParams = useSearchParams()
    const router = useRouter()

    /**
     * Fetch identity from the server-verified session.
     * The httpOnly cookie is sent automatically by the browser.
     */
    const fetchMe = useCallback(async () => {
        try {
            const res = await fetch("/api/auth/me", { credentials: "same-origin" })
            if (res.ok) {
                const data = await res.json()
                if (data.authenticated) {
                    setAccountId(data.accountId)
                    setUserId(data.userId)
                    setUsername(data.username)
                    setProfilePic(data.profilePic || null)
                    setPlan(data.plan || null)
                    setTrialEndsAt(data.trial_ends_at || null)
                    // Update localStorage cache for instant UI render on next load
                    localStorage.setItem("ig_account_id", data.accountId)
                    if (data.userId) localStorage.setItem("ig_user_id", data.userId)
                    localStorage.setItem("ig_username", data.username)
                    if (data.profilePic) localStorage.setItem("ig_profile_pic", data.profilePic)
                    return true
                }
            }
        } catch (err) {
            console.error("Failed to fetch session:", err)
        }
        return false
    }, [])

    useEffect(() => {
        const code = searchParams.get("code")

        const handleSession = async () => {
            // CASE A: New Login from Instagram — exchange code for session
            if (code) {
                try {
                    const res = await fetch("/api/instagram/callback", {
                        method: "POST",
                        body: JSON.stringify({ code }),
                    })
                    const data = await res.json()

                    if (data.success) {
                        // The httpOnly cookie was set by the server response.
                        // Store display data in localStorage for instant renders.
                        if (data.userId) localStorage.setItem("ig_user_id", data.userId)
                        localStorage.setItem("ig_username", data.username)
                        if (data.profilePic) localStorage.setItem("ig_profile_pic", data.profilePic)

                        if (data.userId) setUserId(data.userId)
                        setUsername(data.username)
                        setProfilePic(data.profilePic || null)
                        // Remove code from URL
                        router.replace("/dashboard")
                    }
                } catch (err) {
                    console.error("Login failed:", err)
                }
            }
            // CASE B: Restore session — first show cached data, then verify with server
            else {
                // Instant render from cache
                const savedAccountId = localStorage.getItem("ig_account_id")
                const savedId = localStorage.getItem("ig_user_id")
                const savedName = localStorage.getItem("ig_username")

                if (savedAccountId) setAccountId(savedAccountId)
                if (savedId) setUserId(savedId)
                if (savedName) setUsername(savedName)
                setProfilePic(localStorage.getItem("ig_profile_pic"))

                // Verify with server (the cookie is httpOnly, so we must ask the server)
                const valid = await fetchMe()
                if (!valid) {
                    // Session expired / invalid — clear stale cache
                    localStorage.removeItem("ig_account_id")
                    localStorage.removeItem("ig_user_id")
                    localStorage.removeItem("ig_username")
                    localStorage.removeItem("ig_profile_pic")
                    setAccountId(null)
                    setUserId(null)
                    setUsername(null)
                    setProfilePic(null)
                }
            }
            setIsLoading(false)
        }

        handleSession()
    }, [searchParams, router, fetchMe])

    const logout = async () => {
        // Tell the server to delete the session row and clear the cookie
        try {
            await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" })
        } catch (e) {
            console.error("Logout API failed:", e)
        }
        localStorage.removeItem("ig_account_id")
        localStorage.removeItem("ig_user_id")
        localStorage.removeItem("ig_username")
        localStorage.removeItem("ig_profile_pic")
        setUsername(null)
        setAccountId(null)
        setUserId(null)
        setProfilePic(null)
        router.push("/")
    }

    return {
        username,
        accountId,
        userId,
        profilePic,
        plan,
        trialEndsAt,
        isLoading,
        logout
    }
}
