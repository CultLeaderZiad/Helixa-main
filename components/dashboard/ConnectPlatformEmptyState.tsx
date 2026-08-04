import Link from "next/link"
import { Share2 } from "lucide-react"

export default function ConnectPlatformEmptyState({
  title = "Connect a Platform",
  description = "You need to connect a platform before you can use this feature."
}: {
  title?: string
  description?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center h-[50vh] border border-white/5 rounded-2xl bg-white/[0.02]">
      <div className="w-16 h-16 rounded-full bg-[#ffe14d]/10 flex items-center justify-center mb-6">
        <Share2 className="w-8 h-8 text-[#ffe14d]" />
      </div>
      <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
      <p className="text-neutral-400 mb-8 max-w-md mx-auto text-sm">
        {description}
      </p>
      <Link 
        href="/dashboard/connected-platforms"
        className="px-6 py-3 bg-[#ffe14d] hover:bg-[#e6c738] text-black font-semibold rounded-lg transition-colors"
      >
        Go to Connected Platforms
      </Link>
    </div>
  )
}
