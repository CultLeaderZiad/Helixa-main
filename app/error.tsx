"use client"
import { useEffect } from "react"
import Link from "next/link"

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }, reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen bg-[#03010A] text-white flex items-center justify-center p-4">
      <div className="text-center space-y-4 max-w-md">
        <h1 className="text-4xl font-bold text-red-500">Something went wrong</h1>
        <p className="text-neutral-400">An unexpected error has occurred.</p>
        <div className="flex justify-center gap-4 mt-6">
          <button 
            onClick={() => reset()}
            className="bg-white/10 hover:bg-white/20 px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Try again
          </button>
          <Link href="/" className="bg-[#e5a93c] text-black hover:bg-[#d4952b] px-6 py-2 rounded-lg font-medium transition-colors shadow-[0_0_15px_rgba(229,169,60,0.2)]">
            Return Home
          </Link>
        </div>
      </div>
    </div>
  )
}
