import { getSupabaseServerClient } from "@/lib/supabase-server"
import { Sparkles, Brain, Inbox, MessageCircle } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

export const dynamic = 'force-dynamic'

export default async function UpdatesPage() {
  const supabase = await getSupabaseServerClient()
  
  const { data: updatesPageData } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "updates_page")
    .single()

  const isEnabled = updatesPageData?.value?.isEnabled ?? true

  const { data: updateBannerData } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "update_banner")
    .single()

  const bannerState = updateBannerData?.value || { content: "" }

  if (!isEnabled) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] p-4 text-center">
        <Sparkles className="w-12 h-12 text-neutral-600 mb-4" />
        <h1 className="text-2xl font-serif-display text-white mb-2">No updates right now</h1>
        <p className="text-neutral-500 max-w-md">
          Check back later for new features, bug fixes, and improvements to Helixa!
        </p>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      <div className="mb-10 text-center">
        <h1 className="text-3xl md:text-5xl font-serif-display text-white mb-4">What's New in Helixa</h1>
        <p className="text-neutral-400">Latest features and AI updates</p>
      </div>

      <div className="w-full flex items-center justify-center">
        <div className="w-full">
          {bannerState.content ? (
            <div className="w-full max-w-2xl mx-auto bg-[#111110] border border-white/10 rounded-2xl p-8 md:p-12 shadow-2xl overflow-y-auto max-h-[600px]">
              <div className="prose prose-invert prose-yellow max-w-none font-mono text-sm leading-relaxed text-neutral-300">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {bannerState.content}
                </ReactMarkdown>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {/* Card 1 */}
              <div className="w-full bg-[#111110] border border-white/10 rounded-2xl p-8 shadow-2xl flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-[#e5a93c]/10 border border-[#e5a93c]/20 flex items-center justify-center text-[#e5a93c] mb-6">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-serif-display text-white mb-4">Helixa v2.0 is Live!</h3>
                  <p className="text-neutral-300 leading-relaxed text-sm md:text-base">
                    The entire app has been leveled up to automate your Instagram workflows faster and more naturally. We've redesigned the dashboard, improved stability, and added powerful new ways to engage with your audience.
                  </p>
                </div>
                <div className="pt-6 border-t border-white/10 mt-6 flex justify-between items-center">
                  <span className="text-xs font-mono text-neutral-500">1 of 4</span>
                  <span className="text-xs font-mono text-[#e5a93c]">v2.0 Release</span>
                </div>
              </div>

              {/* Card 2 */}
              <div className="w-full bg-[#111110] border border-white/10 rounded-2xl p-8 shadow-2xl flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-6">
                    <Brain className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-serif-display text-white mb-4">Train Your AI Clone</h3>
                  <p className="text-neutral-300 leading-relaxed text-sm md:text-base">
                    Feed the AI your own context—your niche, products, and tone of voice. When an unmatched DM comes in, the AI handles it exactly like a human would.
                  </p>
                </div>
                <div className="pt-6 border-t border-white/10 mt-6 flex justify-between items-center">
                  <span className="text-xs font-mono text-neutral-500">2 of 4</span>
                  <span className="text-xs font-mono text-purple-400">AI Features</span>
                </div>
              </div>

              {/* Card 3 */}
              <div className="w-full bg-[#111110] border border-white/10 rounded-2xl p-8 shadow-2xl flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-6">
                    <MessageCircle className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-serif-display text-white mb-4">From Comment to Conversion</h3>
                  <p className="text-neutral-300 leading-relaxed text-sm md:text-base">
                    Set up smart keyword triggers on your posts and stories. Helixa instantly DMs users with rich media and quick-reply chips, guiding them through your sales funnel.
                  </p>
                </div>
                <div className="pt-6 border-t border-white/10 mt-6 flex justify-between items-center">
                  <span className="text-xs font-mono text-neutral-500">3 of 4</span>
                  <span className="text-xs font-mono text-blue-400">Smart Funnels</span>
                </div>
              </div>

              {/* Card 4 */}
              <div className="w-full bg-[#111110] border border-white/10 rounded-2xl p-8 shadow-2xl flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400 mb-6">
                    <Inbox className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-serif-display text-white mb-4">The Live Inbox</h3>
                  <p className="text-neutral-300 leading-relaxed text-sm md:text-base">
                    Every conversation your AI is having is visible in one unified dashboard. Oversee chats in real-time, step in manually, and fire off saved quick replies.
                  </p>
                </div>
                <div className="pt-6 border-t border-white/10 mt-6 flex justify-between items-center">
                  <span className="text-xs font-mono text-neutral-500">4 of 4</span>
                  <span className="text-xs font-mono text-green-400">Command Center</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
