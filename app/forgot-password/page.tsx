"use client"

import { useState } from "react"
import Link from "next/link"
import { getSupabaseBrowserClient } from "@/lib/supabase-client"
import BackToHome from "@/components/ui/back-to-home"
import { FrontBackground } from "@/components/layout/FrontBackground"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  
  let supabase: ReturnType<typeof getSupabaseBrowserClient>
  try {
    supabase = getSupabaseBrowserClient()
  } catch (e) {
    console.error("[forgot-password] Failed to initialize Supabase client:", e)
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#03010A]">
        <div className="text-center space-y-4 max-w-md p-8">
          <h1 className="text-2xl font-bold text-red-500">Application Configuration Error</h1>
          <p className="text-neutral-400">This application is not properly configured. Please contact the administrator.</p>
        </div>
      </div>
    )
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    })

    if (error) {
      setError(error.message)
    } else {
      setSuccess(true)
    }
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#03010A] py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <BackToHome />
      <FrontBackground />
      <div className="absolute inset-0 bg-gradient-to-br from-[#ffe14d]/[0.07] via-[#5227FF]/[0.05] to-[#03010A] pointer-events-none" />

      <div className="w-full max-w-md space-y-8 bg-[#03010A]/60 backdrop-blur-md p-8 rounded-2xl border border-white/10 relative z-10">
        <div>
          <h2 className="mt-2 text-center text-3xl font-bold tracking-tight text-white">
            Reset your password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-400">
            Enter your email address and we&apos;ll send you a link to reset your password.
          </p>
        </div>
        
        {success ? (
          <div className="rounded-md bg-green-50 p-4 text-sm text-green-700 dark:bg-green-900/50 dark:text-green-200">
            Check your email for a link to reset your password. If it doesn&apos;t appear within a few minutes, check your spam folder.
          </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleResetPassword}>
            {error && (
              <div className="rounded-md bg-red-50 p-4 text-sm text-red-700 dark:bg-red-900/50 dark:text-red-200">
                {error}
              </div>
            )}
            <div className="space-y-4 rounded-md shadow-sm">
              <div>
                <label htmlFor="email-address" className="sr-only">
                  Email address
                </label>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="relative block w-full rounded-md border border-white/20 bg-white/5 py-1.5 px-3 text-white placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-[#ffe14d] sm:text-sm sm:leading-6"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading || !email}
                className="group relative flex w-full justify-center rounded-md bg-[#ffe14d] hover:bg-[#e6c738] py-2 px-3 text-sm font-semibold text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffe14d] disabled:opacity-50"
              >
                {loading ? "Sending link..." : "Send reset link"}
              </button>
            </div>
          </form>
        )}

        <div className="mt-6 flex items-center justify-center gap-2">
          <p className="text-center text-sm text-gray-500">
            Remember your password?{" "}
          </p>
          <Link href="/login" className="text-sm font-medium text-[#ffe14d] hover:text-[#e6c738]">
            Back to login
          </Link>
        </div>
      </div>
    </div>
  )
}
