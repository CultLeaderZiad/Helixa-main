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
    <div className={`inline-flex items-center gap-2 group cursor-pointer ${className}`}>
      {/* Flat Gold Helix Icon Emblem */}
      <div className={`relative ${iconSizes[size]} flex-shrink-0`}>
        <Image
          src="/helix-logo.svg"
          alt="Helixa Logo"
          width={32}
          height={32}
          className="relative w-full h-full object-contain"
          priority
        />
      </div>

      {/* Brand Text */}
      {showText && (
        <span
          className="font-sans font-semibold text-[15px] text-[var(--t1)] tracking-tight leading-none"
        >
          Helixa
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
