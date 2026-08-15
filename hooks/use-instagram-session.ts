"use client"

import { useSyncExternalStore, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase-client"

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
    isBanned: boolean
    bannedReason: string | null
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
    isBanned: false,
    bannedReason: null,
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
        const res = await fetch("/api/auth/me", { 
            credentials: "same-origin",
            cache: "no-store",
            headers: {
                "Pragma": "no-cache",
                "Cache-Control": "no-cache"
            }
        })
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
                    isBanned: data.is_banned || false,
                    bannedReason: data.banned_reason || null,
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
                // We preserve ig_username and ig_profile_pic so avatar remains visible when logged out
            } catch {
                // localStorage unavailable - non-fatal
            }
            // Preserve username and profilePic in state to keep the avatar visible
            setSnapshot({ accountId: null, userId: null, email: null, role: null })
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

    // Live Realtime listener for account & user updates
    useEffect(() => {
        if (!state.accountId) return

        const supabase = getSupabaseBrowserClient()
        
        // Listen for changes on accounts table (plan/banning)
        const accountChannel = supabase.channel(`session-account-${state.accountId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'accounts',
                    filter: `id=eq.${state.accountId}`
                },
                () => {
                    fetchMe()
                }
            )
            .subscribe()

        // Listen for changes on users table (trial/plan mappings)
        let userChannel: any = null
        if (state.userId) {
            userChannel = supabase.channel(`session-user-${state.userId}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'users',
                        filter: `id=eq.${state.userId}`
                    },
                    () => {
                        fetchMe()
                    }
                )
                .subscribe()
        }

        return () => {
            supabase.removeChannel(accountChannel)
            if (userChannel) {
                supabase.removeChannel(userChannel)
            }
        }
    }, [state.accountId, state.userId])

    const logout = async () => {
        try {
            await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" })
        } catch (e) {
            console.error("Logout API failed:", e)
        }
        try {
            localStorage.removeItem("ig_account_id")
            localStorage.removeItem("ig_user_id")
            // We preserve ig_username and ig_profile_pic as requested so the avatar remains visible
            // localStorage.removeItem("ig_username")
            // localStorage.removeItem("ig_profile_pic")
        } catch {
            // localStorage unavailable - non-fatal
        }
        setSnapshot({
            accountId: null,
            userId: null,
            email: null,
            role: null,
            // We intentionally leave username and profilePic out of this patch
            // so they retain their last known values in the UI
        })
        router.push("/login")
    }

    return {
        ...state,
        logout,
    }
}