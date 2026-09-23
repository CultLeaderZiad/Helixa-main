import React from "react"
import { LucideIcon } from "lucide-react"

export interface TabItem<T extends string = string> {
  key: T
  label: string
  icon?: LucideIcon | React.ComponentType<{ className?: string }>
  count?: number | string
  badge?: string
}

interface SegmentedTabsProps<T extends string = string> {
  tabs: TabItem<T>[]
  activeTab: T
  onChange: (key: T) => void
  className?: string
  size?: "sm" | "md"
}

export function SegmentedTabs<T extends string = string>({
  tabs,
  activeTab,
  onChange,
  className = "",
  size = "md",
}: SegmentedTabsProps<T>) {
  return (
    <div
      className={`inline-flex flex-wrap items-center gap-1 p-1 rounded-2xl bg-white/[0.03] border border-white/[0.07] backdrop-blur-sm ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key
        const Icon = tab.icon

        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={`relative flex items-center gap-2 rounded-xl font-mono-ui font-semibold uppercase tracking-wider transition-all duration-200 cursor-pointer whitespace-nowrap ${
              size === "sm" ? "px-3 py-1.5 text-[10px]" : "px-4 py-2 text-xs"
            } ${
              isActive
                ? "bg-[#e5a93c]/15 text-[#e5a93c] border border-[#e5a93c]/30 shadow-[0_0_20px_rgba(229,169,60,0.08)]"
                : "text-zinc-400 hover:text-white border border-transparent hover:bg-white/[0.04]"
            }`}
          >
            {Icon && (
              <Icon
                className={`transition-colors ${size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"} ${
                  isActive ? "text-[#e5a93c]" : "text-zinc-500"
                }`}
              />
            )}
            <span>{tab.label}</span>

            {tab.count !== undefined && tab.count !== null && (
              <span
                className={`rounded-full px-1.5 py-0.2 font-mono text-[9px] font-bold ${
                  isActive
                    ? "bg-[#e5a93c]/25 text-[#e5a93c]"
                    : "bg-white/10 text-zinc-400"
                }`}
              >
                {tab.count}
              </span>
            )}

            {tab.badge && (
              <span
                className={`rounded-full px-1.5 py-0.2 font-mono text-[9px] font-bold ${
                  isActive
                    ? "bg-[#e5a93c]/25 text-[#e5a93c]"
                    : "bg-white/10 text-zinc-400"
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export default SegmentedTabs
