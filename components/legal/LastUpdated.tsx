const DEFAULT_DATE = "September 30, 2026"

export function LastUpdated({ date }: { date?: string }) {
  return (
    <p className="text-sm font-mono-ui text-neutral-500 border-b border-white/[0.08] pb-6">
      Last updated: <span className="text-neutral-300">{date ?? DEFAULT_DATE}</span>
    </p>
  )
}

export default LastUpdated
