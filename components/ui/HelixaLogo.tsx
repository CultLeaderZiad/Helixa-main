import React from "react"
import Link from "next/link"
import Image from "next/image"

interface HelixaLogoProps {
  size?: "sm" | "md" | "lg"
  href?: string
  showText?: boolean
  className?: string
}

export function HelixaLogo({
  size = "md",
  href = "/",
  showText = true,
  className = "",
}: HelixaLogoProps) {
  const iconSizes = {
    sm: "w-7 h-7",
    md: "w-9 h-9",
    lg: "w-11 h-11",
  }

  const textSizes = {
    sm: "text-base tracking-wider",
    md: "text-xl tracking-widest",
    lg: "text-2xl tracking-widest",
  }

  const content = (
    <div className={`inline-flex items-center gap-2.5 group cursor-pointer ${className}`}>
      {/* Glowing Helix Icon Emblem */}
      <div className={`relative ${iconSizes[size]} flex-shrink-0 transition-transform duration-300 group-hover:scale-105`}>
        <div className="absolute inset-0 bg-[#e5a93c]/20 blur-md rounded-xl group-hover:bg-[#e5a93c]/35 transition-all duration-300" />
        <Image
          src="/helix-logo.svg"
          alt="Helixa Logo"
          width={44}
          height={44}
          className="relative w-full h-full object-contain drop-shadow-sm rounded-lg"
          priority
        />
      </div>

      {/* Brand Text */}
      {showText && (
        <span
          className={`font-mono-ui font-black uppercase text-transparent bg-clip-text bg-gradient-to-r from-[#f3ba4f] via-[#ffe299] to-[#e5a93c] drop-shadow-[0_2px_8px_rgba(229,169,60,0.25)] transition-all duration-300 group-hover:drop-shadow-[0_2px_14px_rgba(229,169,60,0.45)] ${textSizes[size]}`}
        >
          HELIXA
        </span>
      )}
    </div>
  )

  if (href) {
    return (
      <Link href={href} aria-label="Helixa Home" className="no-underline">
        {content}
      </Link>
    )
  }

  return content
}

export default HelixaLogo
