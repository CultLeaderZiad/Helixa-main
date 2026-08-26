"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase-client"
import BackToHome from "@/components/ui/back-to-home"
import { PasswordInput } from "@/components/ui/password-input"

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null)
  
  const router = useRouter()

  let supabase: ReturnType<typeof getSupabaseBrowserClient>
  try {
    supabase = getSupabaseBrowserClient()
  } catch (e) {
    console.error("[update-password] Failed to initialize Supabase client:", e)
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#03010A]">
        <div className="text-center space-y-4 max-w-md p-8">
          <h1 className="text-2xl font-bold text-red-500">Application Configuration Error</h1>
          <p className="text-neutral-400">This application is not properly configured. Please contact the administrator.</p>
        </div>
      </div>
    )
  }

  useEffect(() => {
    // Supabase will automatically handle the hash fragment from the email link
    // and establish a session if the token is valid.
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setIsValidSession(!!session)
    }
    
    checkSession()

    // Listen for auth state changes specifically for the recovery event
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "PASSWORD_RECOVERY") {
          setIsValidSession(true)
        } else if (event === "SIGNED_IN") {
          setIsValidSession(true)
        }
      }
    )

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [supabase.auth])

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.")
      return
    }

    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.updateUser({
      password: password,
    })

    if (error) {
      setError(error.message)
    } else {
      setSuccess(true)
      // Automatically redirect to dashboard after a few seconds
      setTimeout(() => {
        router.push("/dashboard")
      }, 3000)
    }
    setLoading(false)
  }

  if (isValidSession === false) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#03010A] py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <BackToHome />
        <div className="w-full max-w-md space-y-8 bg-[#03010A]/60 backdrop-blur-md p-8 rounded-2xl border border-white/10 relative z-10 text-center">
          <h2 className="text-2xl font-bold text-white">Invalid or Expired Link</h2>
          <p className="text-gray-400 mt-2">The password reset link has expired or is invalid. Please request a new one.</p>
          <button 
            onClick={() => router.push("/forgot-password")}
            className="mt-6 w-full justify-center rounded-md bg-[#ffe14d] hover:bg-[#e6c738] py-2 px-3 text-sm font-semibold text-black"
          >
            Request New Link
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#03010A] py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <BackToHome />
      <div className="absolute inset-0 bg-gradient-to-br from-[#ffe14d]/[0.07] via-[#5227FF]/[0.05] to-[#03010A] pointer-events-none" />

      <div className="w-full max-w-md space-y-8 bg-[#03010A]/60 backdrop-blur-md p-8 rounded-2xl border border-white/10 relative z-10">
        <div>
          <h2 className="mt-2 text-center text-3xl font-bold tracking-tight text-white">
            Update your password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-400">
            Enter your new password below.
          </p>
        </div>
        
        {success ? (
          <div className="rounded-md bg-green-50 p-4 text-sm text-green-700 dark:bg-green-900/50 dark:text-green-200">
            Your password has been successfully updated! Redirecting to your dashboard...
          </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleUpdatePassword}>
            {error && (
              <div className="rounded-md bg-red-50 p-4 text-sm text-red-700 dark:bg-red-900/50 dark:text-red-200">
                {error}
              </div>
            )}
            
            <div className="space-y-4 rounded-md shadow-sm">
              <div>
                <label htmlFor="password" className="sr-only">
                  New Password
                </label>
                <PasswordInput
                  id="password"
                  name="password"
                  required
                  placeholder="New Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              
              <div>
                <label htmlFor="confirmPassword" className="sr-only">
                  Confirm Password
                </label>
                <PasswordInput
                  id="confirmPassword"
                  name="confirmPassword"
                  required
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading || !password || !confirmPassword || isValidSession === null}
                className="group relative flex w-full justify-center rounded-md bg-[#ffe14d] hover:bg-[#e6c738] py-2 px-3 text-sm font-semibold text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffe14d] disabled:opacity-50"
              >
                {loading ? "Updating..." : "Update Password"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
