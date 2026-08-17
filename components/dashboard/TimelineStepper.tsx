"use client"

import React from "react"
import { Check } from "lucide-react"

export const STEPS = [
  { key: "trigger", label: "Trigger Source", sub: "When does it fire?" },
  { key: "response", label: "Reply Payload", sub: "What do they get?" },
  { key: "settings", label: "Final Settings", sub: "Speed & restrictions" },
] as const

interface TimelineStepperProps {
  step: number
  setStep: (s: number) => void
  stepValid: boolean[]
}

export function TimelineStepper({
  step,
  setStep,
  stepValid,
}: TimelineStepperProps) {
  return (
    <div className="relative bg-neutral-900/60 border border-white/5 rounded-2xl p-4 md:px-8">
      <div className="flex items-center justify-between gap-4 relative">
        {STEPS.map((s, i) => {
          const isActive = i === step
          const isCompleted = i < step
          return (
            <div key={s.key} className="flex items-center gap-3 flex-1 last:flex-initial">
              <button
                type="button"
                onClick={() => {
                  if (i < step || stepValid[step]) setStep(i)
                }}
                className="flex items-center gap-3 group text-left focus:outline-none"
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                    isCompleted
                      ? "bg-[#ffe14d] text-black shadow-[0_0_15px_rgba(255,225,77,0.3)]"
                      : isActive
                      ? "bg-white text-black ring-4 ring-white/10"
                      : "bg-neutral-800 text-neutral-500 border border-white/5"
                  }`}
                >
                  {isCompleted ? <Check className="w-4 h-4 stroke-[3]" /> : i + 1}
                </div>
                <div className="hidden md:block">
                  <p
                    className={`text-xs font-bold tracking-tight uppercase ${
                      isActive ? "text-white" : "text-neutral-400 group-hover:text-neutral-200"
                    }`}
                  >
                    {s.label}
                  </p>
                  <p className="text-[10px] text-neutral-500 font-mono-ui">{s.sub}</p>
                </div>
              </button>
              {i < STEPS.length - 1 && (
                <div className="flex-1 h-[2px] mx-2 relative bg-neutral-800 rounded-full overflow-hidden">
                  <div
                    className={`absolute inset-y-0 left-0 transition-all duration-500 bg-[#ffe14d] ${
                      isCompleted ? "w-full" : "w-0"
                    }`}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
