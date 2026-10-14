"use client"

import React, { useState } from "react"
import { Sun, Moon, Laptop, Palette, Check } from "lucide-react"
import { cn } from "@/lib/utils"

export function AppearanceSettingsSection() {
  const [selectedTheme, setSelectedTheme] = useState<"dark" | "system" | "light">("dark")
  const [accentColor, setAccentColor] = useState<"gold" | "zinc">("gold")

  return (
    <div className="max-w-4xl space-y-6 text-[var(--t1)]">
      <div>
        <h2 className="text-[18px] font-semibold text-[var(--t1)]">Appearance & Theme</h2>
        <p className="text-[13px] text-[var(--t3)] mt-1">
          Customize the visual interface and display preferences for your workspace.
        </p>
      </div>

      {/* Theme Selection */}
      <div className="bg-[var(--s1)] border border-[var(--line)] rounded-[16px] p-5 space-y-4">
        <div>
          <h3 className="text-[14px] font-medium text-[var(--t1)]">Theme Mode</h3>
          <p className="text-[12px] text-[var(--t3)]">
            Select your preferred color scheme. Dark mode is optimized for high-contrast restrained gold aesthetics.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { id: "dark", label: "Dark (Default)", icon: Moon, desc: "High contrast dark palette" },
            { id: "system", label: "System Sync", icon: Laptop, desc: "Follow OS preference" },
            { id: "light", label: "Light", icon: Sun, desc: "Standard light mode" },
          ].map((theme) => {
            const Icon = theme.icon
            const isSelected = selectedTheme === theme.id

            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => setSelectedTheme(theme.id as any)}
                className={cn(
                  "p-4 rounded-[12px] border text-start transition-all cursor-pointer flex flex-col justify-between gap-3",
                  isSelected
                    ? "bg-[var(--s2)] border-[var(--gold)] text-[var(--t1)]"
                    : "bg-[var(--s2)]/50 border-[var(--line)] text-[var(--t3)] hover:text-[var(--t1)] hover:border-[var(--line2)]"
                )}
              >
                <div className="flex items-center justify-between">
                  <Icon className={cn("size-5", isSelected ? "text-[var(--gold)]" : "text-[var(--t3)]")} />
                  {isSelected && <Check className="size-4 text-[var(--gold)]" />}
                </div>
                <div>
                  <div className="text-[13px] font-medium text-[var(--t1)]">{theme.label}</div>
                  <div className="text-[11px] text-[var(--t3)]">{theme.desc}</div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Accent Color */}
      <div className="bg-[var(--s1)] border border-[var(--line)] rounded-[16px] p-5 space-y-4">
        <div>
          <h3 className="text-[14px] font-medium text-[var(--t1)]">Accent Hue</h3>
          <p className="text-[12px] text-[var(--t3)]">
            Restrained gold (#D6AE5C) accent without glow or neon.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setAccentColor("gold")}
            className={cn(
              "flex items-center gap-2.5 px-3.5 py-2 rounded-[10px] border transition-colors cursor-pointer",
              accentColor === "gold"
                ? "bg-[var(--s2)] border-[var(--gold)] text-[var(--t1)]"
                : "bg-[var(--s2)]/40 border-[var(--line)] text-[var(--t3)]"
            )}
          >
            <span className="size-4 rounded-full bg-[#D6AE5C] inline-block border border-black/20" />
            <span className="text-[12.5px] font-medium">Cyreax Gold (#D6AE5C)</span>
          </button>
        </div>
      </div>
    </div>
  )
}
