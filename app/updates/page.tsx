"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

interface BannerState {
  isActive: boolean
  type: string
  message: string
  link: string
  content: string
}

export default function UpdatesPage() {
  const [bannerState, setBannerState] = useState<BannerState | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function fetchBanner() {
      try {
        const res = await fetch("/api/settings/banner")
        if (!res.ok) {
          router.replace("/dashboard")
          return
        }
        const data = await res.json()
        setBannerState(data)
      } catch (err) {
        console.error("Failed to load banner settings", err)
        router.replace("/dashboard")
      } finally {
        setLoading(false)
      }
    }
    fetchBanner()
  }, [router])

  useEffect(() => {
    if (!loading && bannerState) {
      if (!bannerState.isActive || bannerState.type !== "lanyard") {
        router.replace("/dashboard")
      }
    }
  }, [loading, bannerState, router])

  if (loading || !bannerState || !bannerState.isActive || bannerState.type !== "lanyard") {
    return (
      <div className="min-h-screen bg-[#03010A] flex items-center justify-center">
        <p className="text-white font-mono animate-pulse">Loading updates...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#03010A] text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => router.back()}
          className="mb-8 text-[#ffe14d] hover:text-white font-mono text-sm tracking-wider transition-colors"
        >
          &larr; Back to Dashboard
        </button>
        
        <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-8 sm:p-12 shadow-2xl">
          <h1 className="text-3xl sm:text-4xl font-black mb-8 font-mono bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
            Helixa Changelog
          </h1>
          
          <div className="prose prose-invert prose-yellow max-w-none font-mono">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {bannerState.content || "_No update details available._"}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  )
}
