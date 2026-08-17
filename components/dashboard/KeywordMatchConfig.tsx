"use client"

import React from "react"
import { Loader2, Sparkles, MessageSquare } from "lucide-react"
import { TagInput } from "@/components/ui/tag-input"

interface KeywordMatchConfigProps {
  triggerSource: "comment" | "dm" | "story"
  storyTriggerType: "mention" | "reaction" | "reply"
  triggers: string[]
  setTriggers: (t: string[]) => void
  generatingKeywords: boolean
  handleGenerateKeywords: () => void
  keywordSuggestions: any[]
  handleAcceptKeywords: (suggestion: { id?: string; text: string }) => void
  setKeywordSuggestions: (suggestions: any[]) => void
  includeReplies: boolean
  setIncludeReplies: (b: boolean) => void
  needsKeywords: boolean
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono-ui text-[9px] font-bold uppercase tracking-[0.18em] text-neutral-500 mb-2">
      {children}
    </p>
  )
}

function ToggleRow({
  icon,
  title,
  sub,
  on,
  onToggle,
}: {
  icon: React.ReactNode
  title: string
  sub: string
  on: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`w-full p-4 rounded-2xl border text-left flex items-center gap-3.5 transition-all duration-200 bg-white/[0.01] ${
        on ? "border-[#ffe14d]/40 bg-[#ffe14d]/[0.03]" : "border-white/10 hover:border-white/20"
      }`}
    >
      <span className={on ? "text-[#ffe14d]" : "text-neutral-500"}>{icon}</span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-semibold text-white">{title}</span>
        <span className="block text-xs text-neutral-500 mt-0.5 leading-relaxed">{sub}</span>
      </span>
      <span
        className={`w-10 h-5.5 rounded-full relative transition-colors shrink-0 ${
          on ? "bg-[#ffe14d]" : "bg-neutral-800"
        }`}
      >
        <span
          className={`absolute top-0.5 w-4.5 h-4.5 rounded-full bg-black shadow-md transition-all ${
            on ? "left-[20px]" : "left-0.5"
          }`}
        />
      </span>
    </button>
  )
}

export function KeywordMatchConfig({
  triggerSource,
  storyTriggerType,
  triggers,
  setTriggers,
  generatingKeywords,
  handleGenerateKeywords,
  keywordSuggestions,
  handleAcceptKeywords,
  setKeywordSuggestions,
  includeReplies,
  setIncludeReplies,
  needsKeywords,
}: KeywordMatchConfigProps) {
  return (
    <div className="space-y-4 pt-3 border-t border-white/5 animate-in fade-in slide-in-from-top-2 duration-300">
      {triggerSource === "comment" ? (
        <div className="space-y-2">
          <FieldLabel>Keywords to match</FieldLabel>
          <p className="text-[11px] text-neutral-500">
            What keyword triggers this DM?{" "}
            <span className="text-[#ffe14d] font-semibold">Keep empty to reply to every comment.</span>
          </p>
          <TagInput
            value={triggers}
            onChange={setTriggers}
            placeholder="type keyword, press Enter (e.g. guide)"
          />
          {triggers.length > 0 && (
            <div className="mt-2">
              <button
                type="button"
                onClick={handleGenerateKeywords}
                disabled={generatingKeywords}
                className="flex items-center gap-1.5 text-xs text-[#ffe14d] hover:text-[#ffe14d]/80 transition-colors bg-[#ffe14d]/10 px-3 py-1.5 rounded-full disabled:opacity-50"
              >
                {generatingKeywords ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                Improve with AI
              </button>

              {keywordSuggestions.length > 0 && (
                <div className="mt-3 space-y-2">
                  {keywordSuggestions.map((s, i) => (
                    <div
                      key={i}
                      className="flex flex-col gap-2 bg-white/5 p-3 rounded-xl border border-white/10"
                    >
                      <p className="text-xs text-neutral-300 font-mono-ui break-words">{s.text}</p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleAcceptKeywords(s)}
                          className="text-[10px] uppercase font-bold tracking-wider text-black bg-[#ffe14d] px-3 py-1.5 rounded-md hover:bg-[#ffe14d]/90"
                        >
                          Apply
                        </button>
                        <button
                          type="button"
                          onClick={() => setKeywordSuggestions([])}
                          className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 bg-white/5 px-3 py-1.5 rounded-md hover:text-white"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : needsKeywords ? (
        <div className="space-y-2 bg-neutral-900/40 p-5 rounded-2xl border border-white/5">
          <FieldLabel>
            {triggerSource === "story" && storyTriggerType === "reaction"
              ? "Only react on these emojis"
              : "Trigger keywords"}
          </FieldLabel>
          <p className="text-[11px] text-neutral-500 mb-3">
            {triggerSource === "story" && storyTriggerType === "reaction"
              ? "Leave empty to trigger on any emoji reaction."
              : "Matches exact phrases or words (case-insensitive)."}
          </p>
          <TagInput
            value={triggers}
            onChange={setTriggers}
            placeholder={
              triggerSource === "story" && storyTriggerType === "reaction"
                ? "e.g. ❤️, 🔥, 👍"
                : "type keyword, press Enter (e.g. price)"
            }
          />
          {triggers.length > 0 && (
            <div className="mt-2">
              <button
                type="button"
                onClick={handleGenerateKeywords}
                disabled={generatingKeywords}
                className="flex items-center gap-1.5 text-xs text-[#ffe14d] hover:text-[#ffe14d]/80 transition-colors bg-[#ffe14d]/10 px-3 py-1.5 rounded-full disabled:opacity-50"
              >
                {generatingKeywords ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                Improve with AI
              </button>

              {keywordSuggestions.length > 0 && (
                <div className="mt-3 space-y-2">
                  {keywordSuggestions.map((s, i) => (
                    <div
                      key={i}
                      className="flex flex-col gap-2 bg-white/5 p-3 rounded-xl border border-white/10"
                    >
                      <p className="text-xs text-neutral-300 font-mono-ui break-words">{s.text}</p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleAcceptKeywords(s)}
                          className="text-[10px] uppercase font-bold tracking-wider text-black bg-[#ffe14d] px-3 py-1.5 rounded-md hover:bg-[#ffe14d]/90"
                        >
                          Apply
                        </button>
                        <button
                          type="button"
                          onClick={() => setKeywordSuggestions([])}
                          className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 bg-white/5 px-3 py-1.5 rounded-md hover:text-white"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : null}

      {triggerSource === "comment" && triggers.length > 0 && (
        <ToggleRow
          icon={<MessageSquare className="w-5 h-5" />}
          title="Check replies to comments"
          sub="Normally only primary post comments trigger replies"
          on={includeReplies}
          onToggle={() => setIncludeReplies(!includeReplies)}
        />
      )}
    </div>
  )
}
