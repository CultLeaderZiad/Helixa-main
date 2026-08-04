import Link from "next/link"

export function Footer() {
  return (
    <footer className="border-t border-white/[0.08] px-5 md:px-10 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
      <span className="font-mono-ui text-[11px] text-neutral-600">
        Helixa — open-source Instagram automation. MIT licensed.
      </span>
      <div className="flex items-center gap-5 font-mono-ui text-[11px] text-neutral-500">
        <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
        <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
        <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
        <span className="text-white/10">|</span>
        <Link href="/login" className="hover:text-white transition-colors">Log in</Link>
      </div>
    </footer>
  )
}
