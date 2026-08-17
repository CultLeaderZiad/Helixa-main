"use client"

import React from "react"
import {
  Plus, Trash2, MessageCircle, Link2, Image as ImageIcon,
  Loader2, Sparkles, X,
} from "lucide-react"
import { TagInput } from "@/components/ui/tag-input"
import type { ProButton, QuickReplyOption } from "@/lib/types"

/* ── Shared small helpers (duplicated from parent for portability) ── */

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono-ui text-[9px] font-bold uppercase tracking-[0.18em] text-neutral-500 mb-2">
      {children}
    </p>
  )
}

function TextField({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full h-11 bg-white/[0.02] border border-white/10 rounded-xl px-4 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-[#ffe14d]/50 focus:bg-white/[0.04] transition-all"
    />
  )
}

/* ── Types ── */

interface ResponsePayloadConfigProps {
  triggerSource: "comment" | "dm" | "story"
  replyMode: "both" | "dm_only" | "public_only"
  setReplyMode: (m: "both" | "dm_only" | "public_only") => void
  publicReplies: string[]
  setPublicReplies: (r: string[]) => void
  type: "text" | "card" | "media"
  setType: (t: "text" | "card" | "media") => void
  messageText: string
  setMessageText: (s: string) => void
  cardTitle: string
  setCardTitle: (s: string) => void
  cardSubtitle: string
  setCardSubtitle: (s: string) => void
  cardImage: string
  setCardImage: (s: string) => void
  cardStyle: "modern" | "classic" | "minimal"
  setCardStyle: (s: "modern" | "classic" | "minimal") => void
  buttons: ProButton[]
  addButton: () => void
  updateButton: (id: string, field: keyof ProButton, value: string) => void
  removeButton: (id: string) => void
  mediaUrl: string
  setMediaUrl: (s: string) => void
  mediaType: "image" | "video" | "audio"
  setMediaType: (t: "image" | "video" | "audio") => void
  quickReplies: QuickReplyOption[]
  addQuickReply: () => void
  updateQuickReply: (id: string, title: string) => void
  removeQuickReply: (id: string) => void
  variants: { id: string; text: string; weight: number }[]
  setVariants: (v: { id: string; text: string; weight: number }[]) => void
  /* AI copy */
  generatingCopy: boolean
  handleGenerateCopy: () => void
  copySuggestions: { id?: string; text: string }[]
  setCopySuggestions: (s: { id?: string; text: string }[]) => void
  handleAcceptCopy: (s: { id?: string; text: string }) => void
}

/* ── Component ── */

export function ResponsePayloadConfig({
  triggerSource,
  replyMode,
  setReplyMode,
  publicReplies,
  setPublicReplies,
  type,
  setType,
  messageText,
  setMessageText,
  cardTitle,
  setCardTitle,
  cardSubtitle,
  setCardSubtitle,
  cardImage,
  setCardImage,
  cardStyle,
  setCardStyle,
  buttons,
  addButton,
  updateButton,
  removeButton,
  mediaUrl,
  setMediaUrl,
  mediaType,
  setMediaType,
  quickReplies,
  addQuickReply,
  updateQuickReply,
  removeQuickReply,
  variants,
  setVariants,
  generatingCopy,
  handleGenerateCopy,
  copySuggestions,
  setCopySuggestions,
  handleAcceptCopy,
}: ResponsePayloadConfigProps) {
  return (
    <>
      {triggerSource === "comment" && (
        <div className="space-y-2">
          <FieldLabel>Flow direction</FieldLabel>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {([
              { key: "both" as const, label: "Reply + DM" },
              { key: "public_only" as const, label: "Reply only" },
              { key: "dm_only" as const, label: "DM only" },
            ]).map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setReplyMode(key)}
                className={`h-11 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all ${
                  replyMode === key
                    ? "border-[#ffe14d] bg-[#ffe14d]/10 text-[#ffe14d]"
                    : "border-white/10 text-neutral-400 hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {triggerSource === "comment" && replyMode !== "dm_only" && (
        <div className="space-y-2 bg-neutral-900/40 p-5 rounded-2xl border border-white/5">
          <FieldLabel>Public comments rotation</FieldLabel>
          <p className="text-[11px] text-neutral-500 mb-3">
            Add multiple phrases. We rotate them dynamically to look human.
          </p>
          <TagInput
            value={publicReplies}
            onChange={setPublicReplies}
            placeholder={'e.g. "Sent you a DM!", "Check your inbox!"'}
          />
        </div>
      )}

      {replyMode !== "public_only" && (
        <div className="space-y-5 pt-2">
          <div className="space-y-2">
            <FieldLabel>Direct Message Format</FieldLabel>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {([
                { key: "text" as const, icon: <MessageCircle className="w-4.5 h-4.5" />, label: "Text Only" },
                { key: "card" as const, icon: <Link2 className="w-4.5 h-4.5" />, label: "Card / Link" },
                { key: "media" as const, icon: <ImageIcon className="w-4.5 h-4.5" />, label: "Rich Media" },
              ]).map(({ key, icon, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setType(key)}
                  className={`p-3 rounded-xl border text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                    type === key
                      ? "border-[#ffe14d] bg-[#ffe14d]/10 text-[#ffe14d]"
                      : "border-white/10 text-neutral-400 hover:text-white"
                  }`}
                >
                  {icon}
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Text message ── */}
          {type === "text" && (
            <div className="space-y-2">
              <FieldLabel>DM Message Text</FieldLabel>
              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                rows={5}
                maxLength={1000}
                className="w-full bg-white/[0.02] border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-white placeholder:text-neutral-600 resize-none focus:outline-none focus:border-[#ffe14d]/50 transition-colors"
                placeholder="Type the message to send in DMs..."
              />
              <div className="flex items-center justify-between mt-1">
                <button
                  type="button"
                  onClick={handleGenerateCopy}
                  disabled={generatingCopy || !messageText}
                  className="flex items-center gap-1.5 text-[11px] text-purple-400 hover:text-purple-300 transition-colors bg-purple-500/10 px-3 py-1 rounded-full disabled:opacity-50"
                >
                  {generatingCopy ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  Generate AI Alternatives
                </button>
                <p className="font-mono-ui text-[10px] text-neutral-600 text-right">
                  {messageText.length}/1000
                </p>
              </div>

              {copySuggestions.length > 0 && (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between text-xs text-neutral-400 px-1">
                    <span>AI Suggestions</span>
                    <button type="button" onClick={() => setCopySuggestions([])} className="hover:text-white">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {copySuggestions.map((s, i) => (
                    <div
                      key={i}
                      className="flex flex-col gap-2 bg-purple-900/10 p-3 rounded-xl border border-purple-500/20 hover:border-purple-500/40 transition-colors"
                    >
                      <p className="text-xs text-neutral-200">{s.text}</p>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleAcceptCopy(s)}
                          className="text-[10px] uppercase font-bold tracking-wider text-white bg-purple-600 px-3 py-1.5 rounded-md hover:bg-purple-500"
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Card ── */}
          {type === "card" && (
            <div className="space-y-4">
              <div className="space-y-3">
                <FieldLabel>Card configuration</FieldLabel>
                <div className="flex gap-2 bg-white/[0.02] p-1 rounded-xl w-max border border-white/10 mb-2">
                  {(["modern", "classic", "minimal"] as const).map((style) => (
                    <button
                      key={style}
                      type="button"
                      onClick={() => setCardStyle(style)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${
                        cardStyle === style
                          ? "bg-[#ffe14d] text-black"
                          : "text-neutral-500 hover:text-white"
                      }`}
                    >
                      {style}
                    </button>
                  ))}
                </div>
                <TextField value={cardTitle} onChange={setCardTitle} placeholder="Card main title" />
                <TextField
                  value={cardSubtitle}
                  onChange={setCardSubtitle}
                  placeholder="Subtitle description (optional)"
                />
              </div>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <FieldLabel>Interactive buttons ({buttons.length}/3)</FieldLabel>
                  <button
                    type="button"
                    onClick={addButton}
                    disabled={buttons.length >= 3}
                    className="font-mono-ui text-[11px] text-neutral-400 hover:text-white disabled:opacity-40 flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3 h-3" /> Add button
                  </button>
                </div>
                {buttons.map((btn) => (
                  <div
                    key={btn.id}
                    className="flex flex-col sm:flex-row gap-2 items-start sm:items-center bg-white/[0.02] p-3 rounded-2xl border border-white/5"
                  >
                    <input
                      value={btn.title}
                      onChange={(e) => updateButton(btn.id, "title", e.target.value)}
                      className="h-8 text-xs w-full sm:flex-1 bg-black/20 sm:bg-transparent border border-white/10 sm:border-none rounded-md sm:rounded-none px-2 text-white placeholder:text-neutral-500 focus:outline-none"
                      placeholder="Button label"
                    />
                    <select
                      value={btn.type}
                      onChange={(e) => updateButton(btn.id, "type", e.target.value)}
                      className="h-8 text-[11px] w-full sm:w-auto bg-black border border-white/10 rounded-lg px-2 text-neutral-300 focus:outline-none"
                    >
                      <option value="web_url">Open Link</option>
                      <option value="postback">Trigger Flow</option>
                    </select>
                    <div className="flex gap-2 w-full sm:flex-1">
                      <input
                        value={btn.type === "web_url" ? btn.url : btn.payload}
                        onChange={(e) =>
                          updateButton(btn.id, btn.type === "web_url" ? "url" : "payload", e.target.value)
                        }
                        className="h-8 text-xs w-full bg-black/20 sm:bg-transparent border border-white/10 sm:border-none rounded-md sm:rounded-none px-2 text-white placeholder:text-neutral-500 focus:outline-none font-mono"
                        placeholder={btn.type === "web_url" ? "https://link" : "flow_keyword"}
                      />
                      <button
                        type="button"
                        onClick={() => removeButton(btn.id)}
                        className="text-neutral-500 hover:text-red-400 p-1.5 transition-colors shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Media ── */}
          {type === "media" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <FieldLabel>Select File Type</FieldLabel>
                <div className="grid grid-cols-2 gap-2">
                  {(["image", "video", "audio"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMediaType(m)}
                      className={`h-10 rounded-xl border text-xs font-bold uppercase transition-all ${
                        mediaType === m
                          ? "border-[#ffe14d] bg-[#ffe14d]/10 text-[#ffe14d]"
                          : "border-white/10 text-neutral-400 hover:text-white"
                      }`}
                    >
                      {m === "image" ? "Photo" : m === "video" ? "Video" : "Audio"}
                    </button>
                  ))}
                </div>
              </div>
              <TextField
                value={mediaUrl}
                onChange={setMediaUrl}
                placeholder="Link to public media file (e.g. mp4, jpg)"
              />
              <TextField
                value={messageText}
                onChange={setMessageText}
                placeholder="Optional caption message to send after..."
              />
            </div>
          )}

          {/* ── Quick Reply Chips ── */}
          {type !== "card" && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <FieldLabel>Quick Reply chips ({quickReplies.length}/4)</FieldLabel>
                <button
                  type="button"
                  onClick={addQuickReply}
                  disabled={quickReplies.length >= 4}
                  className="font-mono-ui text-[11px] text-neutral-400 hover:text-white disabled:opacity-40 flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3 h-3" /> Add chip
                </button>
              </div>
              {quickReplies.length > 0 && (
                <div className="space-y-2">
                  {quickReplies.map((q) => (
                    <div key={q.id} className="flex gap-2 items-center">
                      <input
                        value={q.title}
                        onChange={(e) => updateQuickReply(q.id, e.target.value)}
                        maxLength={20}
                        className="h-10 text-xs flex-1 bg-white/[0.02] border border-white/10 rounded-xl px-4 text-white placeholder:text-neutral-500 focus:outline-none focus:border-[#ffe14d]/50"
                        placeholder='e.g. "Send Details!"'
                      />
                      <button
                        type="button"
                        onClick={() => removeQuickReply(q.id)}
                        className="text-neutral-500 hover:text-red-400 p-1.5 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── A/B Testing Variants ── */}
          <div className="space-y-3 pt-2 border-t border-white/5 mt-6">
            <div className="flex items-center justify-between pb-2">
              <FieldLabel>A/B Test Variants (Optional)</FieldLabel>
              <button
                type="button"
                onClick={() =>
                  setVariants([...variants, { id: "new_" + Date.now(), text: "", weight: 20 }])
                }
                className="font-mono-ui text-[11px] text-[#ffe14d] hover:text-[#ffe14d]/80 flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3 h-3" /> Add Variant
              </button>
            </div>
            {variants.length > 0 && (
              <div className="space-y-3">
                <p className="text-[11px] text-neutral-500">
                  Default response receives{" "}
                  {100 - variants.reduce((sum, v) => sum + (v.weight || 0), 0)}% of traffic.
                </p>
                {variants.map((v) => (
                  <div
                    key={v.id}
                    className="flex gap-2 items-start bg-neutral-900/40 p-3 rounded-xl border border-white/5"
                  >
                    <div className="flex-1 space-y-2">
                      <textarea
                        value={v.text}
                        onChange={(e) =>
                          setVariants(
                            variants.map((varnt) =>
                              varnt.id === v.id ? { ...varnt, text: e.target.value } : varnt
                            )
                          )
                        }
                        rows={2}
                        className="w-full bg-white/[0.02] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-neutral-600 resize-none focus:outline-none focus:border-[#ffe14d]/50"
                        placeholder="Alternative message text..."
                      />
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-neutral-500 font-mono-ui">
                          Traffic Weight (%)
                        </span>
                        <input
                          type="number"
                          min={1}
                          max={99}
                          value={v.weight}
                          onChange={(e) =>
                            setVariants(
                              variants.map((varnt) =>
                                varnt.id === v.id
                                  ? { ...varnt, weight: parseInt(e.target.value) || 0 }
                                  : varnt
                              )
                            )
                          }
                          className="w-16 bg-white/[0.02] border border-white/10 rounded px-2 py-1 text-xs text-white"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setVariants(variants.filter((varnt) => varnt.id !== v.id))}
                      className="text-neutral-500 hover:text-red-400 p-1 transition-colors mt-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
