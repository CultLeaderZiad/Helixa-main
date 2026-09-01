import { PillNav } from "./PillNav"

const NAV = [
  { href: "/pricing", label: "Pricing" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/login", label: "Log in" },
  { href: "/pricing", label: "Get Started", isPrimary: true },
]

export function Header() {
  return (
    <PillNav
      logo="/helix-logo.svg"
      logoAlt="Helixa Logo"
      items={NAV}
      baseColor="#0c0d0e"
      pillColor="#181a1b"
      hoverCircleColor="#ffe14d"
      hoveredPillTextColor="#000000"
      pillTextColor="#ffffff"
      sticky={true}
      stickyScrollThreshold={100}
    />
  )
}
