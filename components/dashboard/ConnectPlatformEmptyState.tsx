import Link from "next/link"
import { Share2 } from "lucide-react"

export default function ConnectPlatformEmptyState({
  title = "Connect a Platform",
  description = "You need to connect a channel before you can use this feature."
}: {
  title?: string
  description?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center p-10 text-center max-w-md mx-auto border border-[var(--line)] rounded-xl bg-[var(--s1)]">
      <div className="w-12 h-12 rounded-xl border border-[var(--line)] bg-[var(--s2)] flex items-center justify-center mb-4 text-[var(--t2)]">
        <Share2 className="w-5 h-5 text-[var(--gold)]" />
      </div>
      <h3 className="text-sm font-semibold text-[var(--t1)] mb-1.5">{title}</h3>
      <p className="text-xs text-[var(--t3)] mb-6 leading-relaxed">
        {description}
      </p>
      <Link 
        href="/dashboard/connected-platforms"
        className="h-[30px] px-3.5 rounded-[6px] bg-[var(--t1)] hover:bg-white text-[var(--bg)] text-[12.5px] font-medium inline-flex items-center justify-center transition-colors"
      >
        Go to Channels
      </Link>
    </div>
  )
}
