import React from "react"
import { SettingsSubNav } from "@/components/settings/SettingsSubNav"

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex-1 flex flex-col md:flex-row min-h-[calc(100vh-52px)] bg-[var(--bg)] text-[var(--t1)]">
      <SettingsSubNav />
      <main className="flex-1 p-6 lg:p-8 max-w-5xl overflow-y-auto scrollbar-thin scrollbar-thumb-[var(--line2)]">
        {children}
      </main>
    </div>
  )
}
