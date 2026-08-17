import { redirect } from "next/navigation"
import Link from "next/link"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { getSupabaseBypassClient } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"

export default async function UpdatesPage() {
  let bannerState = { isActive: false, type: "", message: "", link: "", content: "" }
  try {
    const supabase = await getSupabaseBypassClient()
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "update_banner")
      .single()

    if (data?.value) {
      bannerState = data.value
    }
  } catch (err) {
    console.error("[UpdatesPage] Server fetch error:", err)
  }

  if (!bannerState.isActive || bannerState.type !== "lanyard") {
    redirect("/dashboard")
  }

  return (
    <div className="min-h-screen bg-[#03010A] text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/dashboard"
          className="inline-block mb-8 text-[#ffe14d] hover:text-white font-mono text-sm tracking-wider transition-colors"
        >
          &larr; Back to Dashboard
        </Link>
        
        <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-8 sm:p-12 shadow-2xl">
          <h1 className="text-3xl sm:text-4xl font-black mb-8 font-mono bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
            Helixa Changelog
          </h1>
          
          <div className="prose prose-invert prose-yellow max-w-none font-mono">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {bannerState.content || "_No update details available._"}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  )
}
