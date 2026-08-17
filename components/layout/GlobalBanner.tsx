"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight, Sparkles, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface BannerState {
  isActive: boolean
  type?: string
  message: string
  link: string
  content?: string
}

import { useIsMobile } from "@/components/ui/use-mobile"
import dynamic from 'next/dynamic'
const Lanyard = dynamic(() => import('@/components/ui/Lanyard'), { ssr: false })

export function GlobalBanner() {
  const [banner, setBanner] = useState<BannerState | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const isMobile = useIsMobile()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Check if dismissed in this session
    if (sessionStorage.getItem("banner_dismissed") === "true") return

    fetch("/api/settings/banner")
      .then(res => res.json())
      .then(data => {
        if (data && data.isActive) {
          setBanner(data)
          // Add a small delay for animation effect
          setTimeout(() => setIsVisible(true), 100)
        }
      })
      .catch(err => console.error("Failed to load banner", err))
  }, [])

  if (!banner || !banner.isActive) return null

  const handleDismiss = () => {
    setIsVisible(false)
    sessionStorage.setItem("banner_dismissed", "true")
  }

  return (
    <>
      {banner.type === 'lanyard' && mounted && !isMobile ? (
        <div className="fixed top-0 right-4 md:right-12 w-64 h-[80vh] z-[100] pointer-events-none">
          {/* We wrap the Canvas in a container that allows pointer events so users can interact with the 3D card */}
          <div className="w-full h-full pointer-events-auto">
            <Lanyard link="/updates" />
          </div>
        </div>
      ) : (
        <div 
          className={cn(
            "relative z-50 w-full bg-[#ffe14d] text-black overflow-hidden transition-all duration-500 ease-out",
            isVisible ? "h-auto py-2.5 opacity-100" : "h-0 py-0 opacity-0"
          )}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] animate-[shimmer_2.5s_infinite]" />
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
            <div className="flex-1 flex items-center justify-center gap-2 text-sm font-semibold text-center">
              <Sparkles className="w-4 h-4 hidden sm:block text-black/70" />
              <span>{banner.message}</span>
              
              {banner.link && (
                <Link 
                  href={banner.link} 
                  className="group flex items-center gap-1 ml-2 px-2 py-0.5 rounded-full bg-black/10 hover:bg-black/20 transition-colors"
                >
                  <span className="underline decoration-black/30 underline-offset-2 font-bold">Learn more</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              )}
            </div>
            
            <button 
              onClick={handleDismiss}
              className="flex-shrink-0 p-1 rounded-full hover:bg-black/10 transition-colors text-black/60 hover:text-black"
              aria-label="Dismiss banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
