import React from "react"

export function StatCardSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0c0d12]/60 p-5 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="h-3 w-24 rounded bg-white/[0.06] animate-pulse" />
        <div className="h-8 w-8 rounded-xl bg-white/[0.05] animate-pulse" />
      </div>
      <div className="h-8 w-28 rounded-lg bg-white/[0.08] animate-pulse mb-3" />
      <div className="flex items-center gap-2">
        <div className="h-4 w-12 rounded bg-white/[0.05] animate-pulse" />
        <div className="h-3 w-20 rounded bg-white/[0.04] animate-pulse" />
      </div>
    </div>
  )
}

export function ContentCardSkeleton() {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#0c0d12]/60 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-white/[0.08] animate-pulse" />
          <div className="space-y-1.5">
            <div className="h-3.5 w-32 rounded bg-white/[0.08] animate-pulse" />
            <div className="h-2.5 w-20 rounded bg-white/[0.04] animate-pulse" />
          </div>
        </div>
        <div className="h-6 w-16 rounded-full bg-white/[0.05] animate-pulse" />
      </div>
      <div className="h-12 w-full rounded-xl bg-white/[0.03] animate-pulse" />
      <div className="flex items-center justify-between pt-2 border-t border-white/[0.04]">
        <div className="h-3 w-24 rounded bg-white/[0.04] animate-pulse" />
        <div className="h-6 w-20 rounded-lg bg-white/[0.05] animate-pulse" />
      </div>
    </div>
  )
}

export function ConversationListSkeleton() {
  return (
    <div className="space-y-2 p-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="p-3 rounded-xl border border-white/[0.03] bg-white/[0.02] flex items-center gap-3 animate-pulse"
        >
          <div className="h-9 w-9 rounded-full bg-white/[0.06] shrink-0" />
          <div className="flex-1 space-y-2 min-w-0">
            <div className="flex items-center justify-between">
              <div className="h-3 w-24 rounded bg-white/[0.07]" />
              <div className="h-2.5 w-10 rounded bg-white/[0.04]" />
            </div>
            <div className="h-2.5 w-36 rounded bg-white/[0.04]" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function TableRowSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <tr className="border-b border-white/[0.04] animate-pulse">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="py-4 px-4">
          <div className="h-3.5 rounded bg-white/[0.06]" style={{ width: `${60 + (i % 3) * 15}%` }} />
        </td>
      ))}
    </tr>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-transparent p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="h-3 w-28 rounded bg-white/[0.05] animate-pulse" />
          <div className="h-8 w-64 rounded-lg bg-white/[0.08] animate-pulse" />
          <div className="h-3.5 w-44 rounded bg-white/[0.04] animate-pulse" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-9 w-28 rounded-xl bg-white/[0.05] animate-pulse" />
          <div className="h-9 w-32 rounded-xl bg-white/[0.08] animate-pulse" />
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      {/* Main Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4 rounded-2xl border border-white/[0.06] bg-[#0c0d12]/50 p-6">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.05]">
            <div className="h-4 w-36 rounded bg-white/[0.06] animate-pulse" />
            <div className="h-4 w-20 rounded bg-white/[0.04] animate-pulse" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ContentCardSkeleton />
            <ContentCardSkeleton />
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-white/[0.06] bg-[#0c0d12]/50 p-6">
          <div className="h-4 w-32 rounded bg-white/[0.06] animate-pulse pb-3 border-b border-white/[0.05]" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-white/[0.03] animate-pulse border border-white/[0.04]" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardSkeleton
