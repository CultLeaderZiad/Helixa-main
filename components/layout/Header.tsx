"use client"

import { PillNav } from "./PillNav"
import { useLanguage } from "@/lib/i18n/LanguageContext"

export interface HeaderProps {
  activeHref?: string
  className?: string
}

export function Header({ activeHref = "/", className = "" }: HeaderProps) {
  const { t } = useLanguage()

  const items = [
    { label: t.features || "Features", href: "/#features" },
    { label: t.howItWorks || "How It Works", href: "/#how" },
    { label: t.pricing || "Pricing", href: "/pricing" },
    { label: t.updates || "Updates", href: "/updates" },
    { label: t.faq || "FAQ", href: "/faq" },
  ]

  return (
    <header className={`sticky top-3 sm:top-4 z-50 w-full flex justify-center px-3 sm:px-4 pointer-events-none ${className}`}>
      <div className="pointer-events-auto">
        <PillNav
          logo="/helix-logo.svg"
          logoText="HLX"
          logoAlt="Helix Auto DM"
          items={items}
          activeHref={activeHref}
        />
      </div>
    </header>
  )
}

export default Header
