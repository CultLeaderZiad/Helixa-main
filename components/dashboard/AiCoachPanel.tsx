"use client"

import { useState } from "react"
import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"
import {
  Sparkles, Loader2, RefreshCw, Target, Flame, TrendingUp, AlertTriangle, CheckCircle2,
} from "lucide-react"

/**
 * AiCoachPanel — surfaces the three agents that previously existed ONLY as
 * database rows (weekly_coach_digest, hook_strength_checker, niche_consistency).
 * Each card calls a real API route backed by the LLM provider layer, so the
 * Agents tab toggles now map to visible, working features.
 */
export function AiCoachPanel() {
  const { data: digestData, isLoading: digestLoading, mutate: mutateDigest } = useSWR(
    "/api/ai/weekly-digest",
    fetcher
  )
  const { data: nicheData, isLoading: nicheLoading, mutate: mutateNiche } = useSWR(
    "/api/ai/niche-consistency",
    fetcher
  )

  const [hookCaption, setHookCaption] = useState("")
  const [hookResult, setHookResult] = useState<any>(null)
  const [hookLoading, setHookLoading] = useState(false)
  const [hookError, setHookError] = useState<string | null>(null)

  const analyseHook = async () => {
    setHookLoading(true)
    setHookError(null)
    try {
      const res = await fetch("/api/ai/hook-strength", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caption: hookCaption }),
      })
      const data = await res.json()
      if (!res.ok) {
        setHookError(data.error || "Failed to analyse hook.")
        setHookResult(null)
      } else {
        setHookResult(data)
      }
    } catch {
      setHookError("Network error while analysing the hook.")
    } finally {
      setHookLoading(false)
    }
  }

  const verdictColor = (v: string | null) =>
    v === "strong" ? "text-emerald-400" : v === "weak" ? "text-rose-400" : "text-amber-400"

  return (
    <div className="space-y-6">
      {/* ── Weekly Coach Digest ── */}
      <section className="bg-[#0c0a13]/80 border border-white/[0.08] rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-mono-ui font-bold text-sm uppercase tracking-wider text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#ffe14d]" /> Weekly Coach Digest
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Generated automatically every week from your account&apos;s real activity.
            </p>
          </div>
          <button
            onClick={() => mutateDigest()}
            disabled={digestLoading}
            className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20 transition-all disabled:opacity-50 font-mono-ui"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${digestLoading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>

        {digestLoading ? (
          <div className="flex items-center gap-2 text-xs text-neutral-500 font-mono-ui py-4">
            <Loader2 className="w-4 h-4 animate-spin text-[#ffe14d]" /> Loading digest…
          </div>
        ) : digestData?.hasData ? (
          <div className="space-y-3">
            <div className="text-sm text-neutral-200 leading-relaxed whitespace-pre-wrap">{digestData.digest}</div>
            {digestData.metrics && (
              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 text-center font-mono-ui">
                  <span className="text-[9px] uppercase tracking-wider text-neutral-500 block">Events</span>
                  <span className="text-lg font-bold text-white">{digestData.metrics.events ?? 0}</span>
                </div>
                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 text-center font-mono-ui">
                  <span className="text-[9px] uppercase tracking-wider text-neutral-500 block">Messages</span>
                  <span className="text-lg font-bold text-[#ffe14d]">{digestData.metrics.messages ?? 0}</span>
                </div>
                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 text-center font-mono-ui">
                  <span className="text-[9px] uppercase tracking-wider text-neutral-500 block">Conversations</span>
                  <span className="text-lg font-bold text-blue-400">{digestData.metrics.conversations ?? 0}</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="py-4 px-4 rounded-xl bg-white/[0.02] border border-dashed border-white/10 text-center">
            <p className="text-xs text-neutral-500">
              {digestData?.reason === "agent_disabled"
                ? "The Weekly Coach agent is switched off. Enable it in the AI Agents tab."
                : "No activity to summarise yet. Once messages or automations run, your digest appears here."}
            </p>
          </div>
        )}
      </section>

      {/* ── Hook Strength Checker ── */}
      <section className="bg-[#0c0a13]/80 border border-white/[0.08] rounded-2xl p-6 space-y-4">
        <div>
          <h3 className="font-mono-ui font-bold text-sm uppercase tracking-wider text-white flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-400" /> Hook Strength Checker
          </h3>
          <p className="text-xs text-neutral-400 mt-0.5">
            Paste a caption (or leave empty to score your latest post) and get a hook score with rewrites.
          </p>
        </div>

        <textarea
          value={hookCaption}
          onChange={(e) => setHookCaption(e.target.value)}
          rows={3}
          placeholder="Paste your Reel caption or opening line…"
          className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-[#ffe14d]/50 transition-all resize-none"
        />

        <div className="flex items-center gap-3">
          <button
            onClick={analyseHook}
            disabled={hookLoading}
            className="flex items-center gap-2 px-4 py-2 bg-[#ffe14d] text-black rounded-xl text-xs font-bold font-mono-ui uppercase tracking-wider hover:brightness-110 transition-all disabled:opacity-50"
          >
            {hookLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {hookLoading ? "Analysing…" : "Score my hook"}
          </button>
          {hookResult?.source === "latest_post" && (
            <span className="text-[10px] text-neutral-500 font-mono-ui">Scored your latest cached post</span>
          )}
        </div>

        {hookError && (
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <p className="text-xs text-rose-300">{hookError}</p>
          </div>
        )}

        {hookResult?.hasData && hookResult.score !== null && (
          <div className="space-y-4 pt-2 border-t border-white/[0.06]">
            <div className="flex items-center gap-4">
              <div className="text-4xl font-bold text-white font-mono-ui">{hookResult.score}</div>
              <div>
                <span className={`text-xs font-bold uppercase tracking-wider font-mono-ui ${verdictColor(hookResult.verdict)}`}>
                  {hookResult.verdict}
                </span>
                <p className="text-[10px] text-neutral-500 font-mono-ui">Hook score out of 100</p>
              </div>
            </div>

            {hookResult.rewrites?.length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] uppercase tracking-wider text-neutral-500 font-mono-ui font-semibold">
                  Stronger first lines
                </span>
                {hookResult.rewrites.map((r: string, i: number) => (
                  <div key={i} className="bg-white/[0.02] border border-white/5 rounded-xl px-3 py-2 text-xs text-neutral-200">
                    {r}
                  </div>
                ))}
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-4">
              {hookResult.strengths?.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-mono-ui font-semibold">Strengths</span>
                  {hookResult.strengths.map((s: string, i: number) => (
                    <p key={i} className="text-xs text-neutral-300 flex items-start gap-1.5">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" /> {s}
                    </p>
                  ))}
                </div>
              )}
              {hookResult.problems?.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase tracking-wider text-rose-400 font-mono-ui font-semibold">Problems</span>
                  {hookResult.problems.map((p: string, i: number) => (
                    <p key={i} className="text-xs text-neutral-300 flex items-start gap-1.5">
                      <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0 mt-0.5" /> {p}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* ── Niche Consistency ── */}
      <section className="bg-[#0c0a13]/80 border border-white/[0.08] rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-mono-ui font-bold text-sm uppercase tracking-wider text-white flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-400" /> Niche Consistency
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Detects topic drift across your recent posts.
            </p>
          </div>
          <button
            onClick={() => mutateNiche()}
            disabled={nicheLoading}
            className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20 transition-all disabled:opacity-50 font-mono-ui"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${nicheLoading ? "animate-spin" : ""}`} /> Re-check
          </button>
        </div>

        {nicheLoading ? (
          <div className="flex items-center gap-2 text-xs text-neutral-500 font-mono-ui py-4">
            <Loader2 className="w-4 h-4 animate-spin text-[#ffe14d]" /> Analysing posts…
          </div>
        ) : nicheData?.hasData ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-6">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-neutral-500 font-mono-ui block">Detected niche</span>
                <span className="text-sm font-semibold text-white">{nicheData.niche || "—"}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider text-neutral-500 font-mono-ui block">Consistency</span>
                <span className="text-sm font-bold text-[#ffe14d] font-mono-ui">
                  {nicheData.consistency_score ?? "—"}{nicheData.consistency_score !== null ? "/100" : ""}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider text-neutral-500 font-mono-ui block">Drift</span>
                <span className={`text-sm font-bold ${nicheData.drift_detected ? "text-amber-400" : "text-emerald-400"}`}>
                  {nicheData.drift_detected ? "Detected" : "None"}
                </span>
              </div>
            </div>

            {nicheData.off_topic_posts?.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase tracking-wider text-amber-400 font-mono-ui font-semibold">Off-topic posts</span>
                {nicheData.off_topic_posts.map((p: string, i: number) => (
                  <p key={i} className="text-xs text-neutral-300 bg-white/[0.02] border border-white/5 rounded-lg px-3 py-1.5">{p}</p>
                ))}
              </div>
            )}

            {nicheData.recommendation && (
              <div className="bg-[#ffe14d]/[0.06] border border-[#ffe14d]/20 rounded-xl px-3 py-2.5">
                <p className="text-xs text-neutral-200">{nicheData.recommendation}</p>
              </div>
            )}
            <p className="text-[10px] text-neutral-600 font-mono-ui">{nicheData.postsAnalyzed} posts analysed</p>
          </div>
        ) : (
          <div className="py-4 px-4 rounded-xl bg-white/[0.02] border border-dashed border-white/10 text-center">
            <p className="text-xs text-neutral-500">
              {nicheData?.message || "Not enough published posts yet — publish at least 3 posts with captions."}
            </p>
          </div>
        )}
      </section>
    </div>
  )
}

export default AiCoachPanel
