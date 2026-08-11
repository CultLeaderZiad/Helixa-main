"use client"

import { useSyncExternalStore, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"

export interface SessionState {
    username: string | null
    accountId: string | null
    userId: string | null
    profilePic: string | null
    plan: string | null
    trialEndsAt: string | null
    trialExempt: boolean
    email: string | null
    role: string | null
    hasValidPayment: boolean
    isTrialExpired: boolean
    isPastDeadline: boolean
    isLoading: boolean
}

/**
 * Module-level singleton session store.
 *
 * Previously every page and the dashboard layout each called useInstagramSession(),
 * which started isLoading=true and fired its own /api/auth/me request on every
 * navigation. That caused duplicate network calls and a blocking full-screen
 * spinner on every route change inside /dashboard.
 *
 * Now the session is fetched exactly once and shared across the layout and all
 * pages, so navigating between dashboard routes no longer re-fetches or
 * re-shows the loading gate.
 */
const initialState: SessionState = {
    username: null,
    accountId: null,
    userId: null,
    profilePic: null,
    plan: null,
    trialEndsAt: null,
    trialExempt: false,
    email: null,
    role: null,
    hasValidPayment: false,
    isTrialExpired: false,
    isPastDeadline: false,
    isLoading: true,
}

let snapshot: SessionState = { ...initialState }
const listeners = new Set<() => void>()
let started = false

function setSnapshot(patch: Partial<SessionState>) {
    snapshot = { ...snapshot, ...patch }
    listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
    listeners.add(listener)
    return () => {
        listeners.delete(listener)
    }
}

function getSnapshot() {
    return snapshot
}

// Required so server-rendered content has a stable snapshot to render.
// During SSR the session is never known, so we always render the initial
// (isLoading: true) state and let hydration + effects resolve the real one.
function getServerSnapshot() {
    return initialState
}

async function fetchMe(): Promise<boolean> {
    try {
        const res = await fetch("/api/auth/me", { credentials: "same-origin" })
        if (res.ok) {
            const data = await res.json()
            if (data.authenticated) {
                setSnapshot({
                    accountId: data.accountId,
                    userId: data.userId,
                    username: data.username,
                    profilePic: data.profilePic || null,
                    plan: data.plan || null,
                    trialEndsAt: data.trial_ends_at || null,
                    trialExempt: data.trial_exempt || false,
                    email: data.email || null,
                    role: data.role || null,
                    hasValidPayment: data.has_valid_payment || false,
                    isTrialExpired: data.is_trial_expired || false,
                    isPastDeadline: data.is_past_deadline || false,
                })
                try {
                    localStorage.setItem("ig_account_id", data.accountId)
                    if (data.userId) localStorage.setItem("ig_user_id", data.userId)
                    localStorage.setItem("ig_username", data.username)
                    if (data.profilePic) localStorage.setItem("ig_profile_pic", data.profilePic)
                } catch {
                    // localStorage unavailable - non-fatal
                }
                return true
            }
        }
    } catch (err) {
        console.error("Failed to fetch session:", err)
    }
    return false
}

/**
 * Initialize the singleton exactly once per page session, regardless of how
 * many components (layout + pages) mount it simultaneously.
 */
function initSession(code: string | null, router: ReturnType<typeof useRouter>) {
    if (started) return
    started = true

    // CASE A: New Login from Instagram — exchange code for session
    if (code) {
        ;(async () => {
            try {
                const res = await fetch("/api/instagram/callback", {
                    method: "POST",
                    body: JSON.stringify({ code }),
                })
                const data = await res.json()

                if (data.success) {
                    try {
                        if (data.userId) localStorage.setItem("ig_user_id", data.userId)
                        localStorage.setItem("ig_username", data.username)
                        if (data.profilePic) localStorage.setItem("ig_profile_pic", data.profilePic)
                    } catch {
                        // localStorage unavailable - non-fatal
                    }
                }
            } catch (err) {
                console.error("Login failed:", err)
            } finally {
                // ALWAYS fetch the full session so accountId is populated before finishing load
                await fetchMe()
                setSnapshot({ isLoading: false })
                router.replace("/dashboard")
            }
        })()
        return
    }

    // CASE B: Restore session — first show cached data, then verify with server
    try {
        const savedAccountId = localStorage.getItem("ig_account_id")
        const savedId = localStorage.getItem("ig_user_id")
        const savedName = localStorage.getItem("ig_username")
        setSnapshot({
            accountId: savedAccountId,
            userId: savedId,
            username: savedName,
            profilePic: localStorage.getItem("ig_profile_pic"),
        })
    } catch {
        // localStorage unavailable - non-fatal
    }

    fetchMe().then((valid) => {
        if (!valid) {
            try {
                localStorage.removeItem("ig_account_id")
                localStorage.removeItem("ig_user_id")
                localStorage.removeItem("ig_username")
                localStorage.removeItem("ig_profile_pic")
            } catch {
                // localStorage unavailable - non-fatal
            }
            setSnapshot({ accountId: null, userId: null, username: null, profilePic: null })
        }
        setSnapshot({ isLoading: false })
    })
}

export function useInstagramSession() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

    useEffect(() => {
        initSession(searchParams.get("code"), router)
    }, [searchParams, router])

    const logout = async () => {
        try {
            await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" })
        } catch (e) {
            console.error("Logout API failed:", e)
        }
        try {
            localStorage.removeItem("ig_account_id")
            localStorage.removeItem("ig_user_id")
            localStorage.removeItem("ig_username")
            localStorage.removeItem("ig_profile_pic")
        } catch {
            // localStorage unavailable - non-fatal
        }
        setSnapshot({
            username: null,
            accountId: null,
            userId: null,
            profilePic: null,
            email: null,
            role: null,
        })
        router.push("/login")
    }

    return {
        ...state,
        logout,
    }
}