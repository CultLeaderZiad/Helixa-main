"use client"

import React from "react"
import { Loader2, Globe, Film, Check } from "lucide-react"

interface ReelPostPickerProps {
  loadingReels: boolean
  reels: any[]
  selectedReel: any
  setSelectedReel: (r: any) => void
  hasSelectedReelOption: boolean
  setHasSelectedReelOption: (b: boolean) => void
  specificMediaUrl: string
  setSpecificMediaUrl: (s: string) => void
  resolvingUrl: boolean
  handleResolveMediaUrl: () => void
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono-ui text-[9px] font-bold uppercase tracking-[0.18em] text-neutral-500 mb-2">
      {children}
    </p>
  )
}

export function ReelPostPicker({
  loadingReels,
  reels,
  selectedReel,
  setSelectedReel,
  hasSelectedReelOption,
  setHasSelectedReelOption,
  specificMediaUrl,
  setSpecificMediaUrl,
  resolvingUrl,
  handleResolveMediaUrl,
}: ReelPostPickerProps) {
  return (
    <div className="space-y-4">
      <FieldLabel>Automate which post or reel?</FieldLabel>

      {loadingReels ? (
        <div className="p-8 flex flex-col items-center justify-center gap-3 border border-white/5 rounded-2xl bg-white/[0.01]">
          <Loader2 className="w-6 h-6 animate-spin text-[#ffe14d]" />
          <span className="text-xs text-neutral-500 font-mono-ui">Fetching Instagram feed...</span>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto pr-1">
          {/* Option: Global Post Rule */}
          <button
            type="button"
            onClick={() => {
              setSelectedReel(null)
              setHasSelectedReelOption(true)
            }}
            className={`aspect-square rounded-xl border flex flex-col items-center justify-center p-4 text-center transition-all duration-200 ${
              hasSelectedReelOption && selectedReel === null
                ? "border-[#ffe14d] bg-[#ffe14d]/[0.06] text-[#ffe14d]"
                : "border-white/10 text-neutral-400 hover:border-white/20 hover:text-white bg-white/[0.01]"
            }`}
          >
            <Globe className="w-8 h-8 mb-2 opacity-80" />
            <span className="text-xs font-bold">All Posts & Reels</span>
            <span className="text-[9px] text-neutral-500 mt-1">Global Trigger</span>
          </button>

          {reels.map((reel) => {
            const isSelected = hasSelectedReelOption && selectedReel?.id === reel.id
            return (
              <button
                key={reel.id}
                type="button"
                onClick={() => {
                  setSelectedReel(reel)
                  setHasSelectedReelOption(true)
                }}
                className={`aspect-square rounded-xl border overflow-hidden relative group text-left transition-all duration-200 ${
                  isSelected
                    ? "border-[#ffe14d] ring-2 ring-[#ffe14d]/20"
                    : "border-white/10 hover:border-white/25 bg-[#0e0e0e]"
                }`}
              >
                {reel.image_url ? (
                  <img
                    src={reel.image_url}
                    alt=""
                    className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity"
                  />
                ) : (
                  <div className="w-full h-full bg-neutral-900 flex items-center justify-center">
                    <Film className="w-6 h-6 text-neutral-600" />
                  </div>
                )}

                {/* Type Overlay */}
                <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-black/60 text-[8px] font-mono-ui text-white uppercase tracking-wider">
                  {reel.media_type === "STORY" ? "Story" : reel.media_type === "VIDEO" ? "Reel" : "Post"}
                </span>

                {/* Selected Check overlay */}
                {isSelected && (
                  <div className="absolute inset-0 bg-[#ffe14d]/10 flex items-center justify-center backdrop-blur-[1px]">
                    <div className="w-8 h-8 rounded-full bg-[#ffe14d] text-black flex items-center justify-center shadow-lg">
                      <Check className="w-4 h-4 stroke-[3]" />
                    </div>
                  </div>
                )}

                {/* Caption snippet at bottom */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent p-2 pt-6">
                  <p className="text-[10px] text-white line-clamp-1 font-sans">
                    {reel.caption || "Untitled"}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Specific URL Fallback */}
      <div className="flex gap-2 items-center">
        <input
          value={specificMediaUrl}
          onChange={(e) => setSpecificMediaUrl(e.target.value)}
          placeholder="Or paste post URL if missing..."
          className="flex-1 h-9 bg-white/[0.02] border border-white/10 rounded-xl px-3 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-[#ffe14d]/50 transition-all"
        />
        <button
          type="button"
          onClick={handleResolveMediaUrl}
          disabled={!specificMediaUrl.trim() || resolvingUrl}
          className="h-9 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-all disabled:opacity-50"
        >
          {resolvingUrl ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Link"}
        </button>
      </div>
    </div>
  )
}
