import { getSupabaseServerClient } from "@/lib/supabase-server"
import CardSwap, { Card } from "@/components/ui/CardSwap"
import { Sparkles, Brain, Inbox, MessageCircle } from "lucide-react"

export const dynamic = 'force-dynamic'

export default async function UpdatesPage() {
  const supabase = await getSupabaseServerClient()
  
  // Fetch the updates_page setting
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "updates_page")
    .single()

  const isEnabled = data?.value?.isEnabled ?? true // Default to true if not found

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
    <div className="p-6 md:p-10 max-w-5xl mx-auto h-[85vh] flex flex-col">
      <div className="mb-10 text-center">
        <h1 className="text-3xl md:text-5xl font-serif-display text-white mb-4">What's New in Helixa</h1>
        <p className="text-neutral-400">Swipe through the latest features and AI updates</p>
      </div>

      <div className="flex-1 w-full flex items-center justify-center -mt-10">
        <div style={{ height: '500px', width: '100%', position: 'relative' }}>
          <CardSwap
            cardDistance={20}
            verticalDistance={30}
            delay={5000}
            pauseOnHover={true}
          >
            {/* Card 1 */}
            <Card>
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-[#ffe14d]/10 border border-[#ffe14d]/20 flex items-center justify-center text-[#ffe14d] mb-6">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-serif-display text-white mb-4">Helixa v2.0 is Live!</h3>
                  <p className="text-neutral-300 leading-relaxed text-sm md:text-base">
                    The entire app has been leveled up to automate your Instagram workflows faster and more naturally. We've redesigned the dashboard, improved stability, and added powerful new ways to engage with your audience. Everything is now smoother and more powerful.
                  </p>
                </div>
                <div className="pt-6 border-t border-white/10 mt-6 flex justify-between items-center">
                  <span className="text-xs font-mono text-neutral-500">1 of 4</span>
                  <span className="text-xs font-mono text-[#ffe14d]">v2.0 Release</span>
                </div>
              </div>
            </Card>

            {/* Card 2 */}
            <Card>
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-6">
                    <Brain className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-serif-display text-white mb-4">Train Your AI Clone</h3>
                  <p className="text-neutral-300 leading-relaxed text-sm md:text-base">
                    You can now feed the AI your own context—your niche, your products, and your unique tone of voice. When an unmatched DM comes in, the AI handles it exactly like a human would. Say goodbye to robotic replies and hello to intelligent, personalized engagement at scale.
                  </p>
                </div>
                <div className="pt-6 border-t border-white/10 mt-6 flex justify-between items-center">
                  <span className="text-xs font-mono text-neutral-500">2 of 4</span>
                  <span className="text-xs font-mono text-purple-400">AI Features</span>
                </div>
              </div>
            </Card>

            {/* Card 3 */}
            <Card>
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-6">
                    <MessageCircle className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-serif-display text-white mb-4">From Comment to Conversion</h3>
                  <p className="text-neutral-300 leading-relaxed text-sm md:text-base">
                    Set up smart keyword triggers on your posts and stories. Helixa instantly DMs users with rich media and quick-reply chips, effortlessly guiding them through your sales funnel. You capture leads while you sleep.
                  </p>
                </div>
                <div className="pt-6 border-t border-white/10 mt-6 flex justify-between items-center">
                  <span className="text-xs font-mono text-neutral-500">3 of 4</span>
                  <span className="text-xs font-mono text-blue-400">Smart Funnels</span>
                </div>
              </div>
            </Card>

            {/* Card 4 */}
            <Card>
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400 mb-6">
                    <Inbox className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-serif-display text-white mb-4">The Live Inbox</h3>
                  <p className="text-neutral-300 leading-relaxed text-sm md:text-base">
                    Every conversation your AI is having is now visible in one unified dashboard. You can oversee the chats in real-time, step in manually at any moment, and fire off saved quick replies if you need to take over the wheel.
                  </p>
                </div>
                <div className="pt-6 border-t border-white/10 mt-6 flex justify-between items-center">
                  <span className="text-xs font-mono text-neutral-500">4 of 4</span>
                  <span className="text-xs font-mono text-green-400">Command Center</span>
                </div>
              </div>
            </Card>
          </CardSwap>
        </div>
      </div>
    </div>
  )
}
