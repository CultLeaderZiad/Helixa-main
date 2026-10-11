import React from "react"

export function StatCardSkeleton() {
  return (
    <div className="rounded-[12px] border border-[var(--line)] bg-[var(--s1)] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="h-3 w-20 rounded bg-[var(--s3)] animate-pulse" />
        <div className="h-3 w-8 rounded bg-[var(--s3)] animate-pulse" />
      </div>
      <div className="h-7 w-24 rounded bg-[var(--s3)] animate-pulse" />
      <div className="h-[22px] w-20 ms-auto rounded bg-[var(--s3)] animate-pulse" />
    </div>
  )
}

export function ContentCardSkeleton() {
  return (
    <div className="rounded-[12px] border border-[var(--line)] bg-[var(--s1)] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="h-4 w-32 rounded bg-[var(--s3)] animate-pulse" />
        <div className="h-4 w-12 rounded bg-[var(--s3)] animate-pulse" />
      </div>
      <div className="h-10 w-full rounded bg-[var(--s2)] animate-pulse" />
      <div className="h-8 w-24 rounded bg-[var(--s3)] animate-pulse" />
    </div>
  )
}

export function ConversationListSkeleton() {
  return (
    <div className="space-y-1.5 p-2">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="p-3 rounded-[8px] border border-[var(--line)] bg-[var(--s1)] flex items-center gap-3 animate-pulse"
        >
          <div className="size-8 rounded-full bg-[var(--s3)] shrink-0" />
          <div className="flex-1 space-y-1.5 min-w-0">
            <div className="flex items-center justify-between">
              <div className="h-3 w-24 rounded bg-[var(--s3)]" />
              <div className="h-2.5 w-8 rounded bg-[var(--s3)]" />
            </div>
            <div className="h-2.5 w-36 rounded bg-[var(--s2)]" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function OverviewSkeleton() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-6 w-48 rounded bg-[var(--s3)] animate-pulse" />
        <div className="h-4 w-72 rounded bg-[var(--s3)] animate-pulse" />
      </div>

      {/* 4 KPI cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      {/* Weekly coach skeleton */}
      <div className="rounded-[12px] border border-[var(--line)] bg-[var(--s1)] p-4 space-y-3">
        <div className="h-4 w-32 rounded bg-[var(--s3)] animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="h-24 rounded-[8px] bg-[var(--s2)] animate-pulse" />
          <div className="h-24 rounded-[8px] bg-[var(--s2)] animate-pulse" />
          <div className="h-24 rounded-[8px] bg-[var(--s2)] animate-pulse" />
        </div>
      </div>

      {/* 2-col content skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7 rounded-[12px] border border-[var(--line)] bg-[var(--s1)] p-4 h-80 animate-pulse" />
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-[12px] border border-[var(--line)] bg-[var(--s1)] p-4 h-36 animate-pulse" />
          <div className="rounded-[12px] border border-[var(--line)] bg-[var(--s1)] p-4 h-40 animate-pulse" />
        </div>
      </div>
    </div>
  )
}

export function DashboardSkeleton() {
  return <OverviewSkeleton />
}
