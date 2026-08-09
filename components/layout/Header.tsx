import Link from "next/link"
import Image from "next/image"

const NAV = [
  { href: "/pricing", label: "Pricing" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
]

export function Header() {
  return (
    <header className="border-b border-white/[0.08] px-5 md:px-10 py-4 flex items-center justify-between">
      <Link href="/" className="flex items-center gap-2">
        {/* Image removed */}
        <span className="font-mono-ui text-sm font-bold tracking-widest text-white">HELIXA</span>
      </Link>
      <nav className="hidden md:flex items-center gap-6 font-mono-ui text-xs text-neutral-400">
        {NAV.map((item) => (
          <Link key={item.href} href={item.href} className="hover:text-white transition-colors">
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="flex items-center gap-3">
        <Link
          href="/login"
          className="font-mono-ui text-xs text-neutral-300 hover:text-white transition-colors"
        >
          Log in
        </Link>
        <Link
          href="/pricing"
          className="font-mono-ui text-xs font-bold bg-[#ffe14d] text-black px-4 py-2 rounded-full hover:brightness-110 transition-all"
        >
          Get started
        </Link>
      </div>
    </header>
  )
}
