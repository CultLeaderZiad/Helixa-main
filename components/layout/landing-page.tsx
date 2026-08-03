"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Ferrofluid from "@/components/effects/ferrofluid"
import TextPressure from "@/components/ui/text-pressure"
import ScrollFloat from "@/components/ui/ScrollFloat"
import ASCIIText from "@/components/ui/ASCIIText"
import {
  MessageCircle, Sparkles, ArrowUpRight, Github, Star,
  Send, AtSign, Brain, Inbox, Lock, Terminal,
  Loader2, Linkedin,
} from "lucide-react"

const TELEGRAM_URL = "https://t.me/cultleaderziad"
const GITHUB_URL = "https://github.com/CultLeaderZiad"
const LINKEDIN_URL = "https://www.linkedin.com/in/ziad-sabry-cl/"

export function LandingPage() {
  const [stars, setStars] = useState<number | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetch("https://api.github.com/repos/CultLeaderZiad/insta-p8")
      .then(r => r.json())
      .then(d => { if (typeof d.stargazers_count === "number") setStars(d.stargazers_count) })
      .catch(() => {})
  }, [])

  const handleLogin = () => {
    router.push("/login")
  }

  const handleSignup = () => {
    router.push("/signup")
  }

  const handleTestLogin = () => {
    localStorage.setItem("ig_user_id", "9999999999")
    localStorage.setItem("ig_username", "test_creator")
    router.push("/dashboard")
  }

  return (
    <div className="min-h-screen bg-transparent text-[#ededed] selection:bg-[#ffe14d] selection:text-black overflow-x-hidden antialiased">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500;700&display=swap');
        .font-serif-display { font-family: 'Instrument Serif', Georgia, serif; }
        .font-mono-ui { font-family: 'JetBrains Mono', ui-monospace, monospace; }
        @keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .marquee-track { animation: marquee 30s linear infinite; }
        @keyframes fade-up { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        .fade-up { animation: fade-up .7s cubic-bezier(.2,.7,.2,1) both; }
        .grain::before {
          content: ""; position: fixed; inset: 0; z-index: 5; pointer-events: none; opacity: .04;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)'/%3E%3C/svg%3E");
        }
      `}</style>

      <div className="grain" />

      {/* Nav */}
      <nav className="relative z-50 flex items-center justify-between px-5 md:px-10 h-16 border-b border-white/[0.08]">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="relative h-9 w-9 md:h-12 md:w-12 overflow-hidden flex-shrink-0">
            <Image
              src="/HELIXA-png.png"
              alt="Helixa"
              width={2816}
              height={1536}
              className="h-full w-auto max-w-none object-cover object-left mix-blend-screen filter grayscale invert brightness-200"
              priority
            />
          </div>
          <div style={{ position: 'relative', height: '16px', width: '50px' }} className="md:h-[20px] md:w-[65px]">
            <TextPressure
              text="HELIXA"
              flex={true}
              alpha={false}
              stroke={false}
              width={true}
              weight={true}
              italic={true}
              textColor="#ffffff"
              strokeColor="#ff0000"
              minFontSize={12}
            />
          </div>
          <span className="hidden sm:inline-block font-mono-ui text-[10px] text-neutral-500 border border-white/10 rounded-full px-2 py-0.5 ml-1 md:ml-2">open source</span>
        </div>

        <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-8 font-mono-ui text-xs text-neutral-400">
          <a href="/pricing" className="hover:text-white transition-colors">Pricing</a>
          <a href="/privacy" className="hover:text-white transition-colors">Privacy</a>
          <a href="/terms" className="hover:text-white transition-colors">Terms</a>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={GITHUB_URL} target="_blank" rel="noreferrer"
            className="flex items-center gap-1.5 font-mono-ui text-xs text-neutral-400 hover:text-white border border-white/10 hover:border-white/30 rounded-full px-3.5 py-1.5 transition-colors"
          >
            <Github className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Star</span>
            {stars !== null && <span className="text-[#ffe14d]">{stars}</span>}
          </a>
          <a
            href={LINKEDIN_URL} target="_blank" rel="noreferrer"
            className="flex items-center gap-1.5 font-mono-ui text-xs text-neutral-400 hover:text-white border border-white/10 hover:border-white/30 rounded-full px-3.5 py-1.5 transition-colors"
          >
            <Linkedin className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Connect</span>
          </a>
          <button
            onClick={handleLogin}
            className="font-mono-ui text-xs font-bold bg-white text-black rounded-full px-4 py-1.5 hover:bg-[#ffe14d] transition-colors"
          >
            Log in
          </button>
        </div>
      </nav>

        {/* Hero */}
        <section className="relative overflow-hidden bg-transparent w-full">
          {/* Ferrofluid background layer */}
          <div className="absolute inset-0 pointer-events-none md:pointer-events-auto">
            <Ferrofluid
              colors={["#ffe14d", "#ffffff", "#ffb300"]}
              speed={0.5}
              scale={1.2}
              turbulence={1}
              fluidity={0.1}
              rimWidth={0.2}
              sharpness={3}
              shimmer={1}
              glow={2}
              flowDirection="down"
              opacity={0.15}
              mouseInteraction={true}
              mouseStrength={1}
              mouseRadius={0.3}
              dpr={1.5}
            />
          </div>
          
          <div className="absolute inset-0 bg-gradient-to-t from-[#03010A] via-[#03010A]/80 to-[#03010A]/30 pointer-events-none" />

          <div className="relative px-5 md:px-10 pt-20 md:pt-32 pb-24 max-w-6xl mx-auto flex flex-col items-center text-center pointer-events-none">


            <div className="fade-up w-full h-[120px] md:h-[200px] relative mb-6 pointer-events-none" style={{ animationDelay: "40ms" }}>
              <ASCIIText
                text='HELIXA'
                enableWaves={true}
                asciiFontSize={12}
                textFontSize={150}
                planeBaseHeight={16}
              />
            </div>

            <h1 className="fade-up font-serif-display text-[15vw] md:text-[7.5rem] leading-[0.95] tracking-tight text-white relative z-20" style={{ animationDelay: "80ms" }}>
              Your DMs,
              <br />
              <span className="italic text-[#ffe14d]">on autopilot.</span>
              </h1>

              <div className="fade-up mt-10 flex flex-col items-center gap-8 md:gap-10 w-full pointer-events-auto" style={{ animationDelay: "160ms" }}>
                <p className="text-neutral-400 text-base md:text-lg max-w-md leading-relaxed bg-[#03010A]/40 p-4 rounded-xl backdrop-blur-sm border border-white/5">
                  Comment-to-DM funnels, keyword triggers, story reactions, AI replies, a live inbox,
                  and Reels scheduling. The open-source ManyChat alternative — your data stays in your own Supabase.
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={handleSignup}
                    className="group flex items-center gap-2 bg-[#ffe14d] text-black font-mono-ui text-sm font-bold px-7 py-4 rounded-full hover:scale-[1.03] active:scale-[0.98] transition-transform"
                  >
                    Start free trial
                    <ArrowUpRight className="w-4 h-4 group-hover:rotate-45 transition-transform" />
                  </button>
                  <a
                    href={TELEGRAM_URL} target="_blank" rel="noreferrer"
                    className="flex items-center gap-2 font-mono-ui text-sm text-neutral-300 border border-white/15 bg-black/60 backdrop-blur-md px-6 py-4 rounded-full hover:border-[#2AABEE]/60 hover:text-[#2AABEE] transition-colors"
                  >
                    <Send className="w-4 h-4" />
                    Telegram support
                  </a>
                </div>
              </div>
            </div>
        </section>

        {/* Marquee */}
        <div className="border-y border-white/[0.08] py-3 overflow-hidden">
          <div className="marquee-track flex whitespace-nowrap font-mono-ui text-xs uppercase tracking-[0.2em] text-neutral-600 gap-8 w-max">
            {Array.from({ length: 2 }).map((_, copy) => (
              <div key={copy} className="flex gap-8">
                {["comment → DM", "keyword triggers", "story reactions", "AI auto-reply", "live inbox", "ice breakers", "follow gate", "quick replies", "media attachments", "public + private replies"].map((t) => (
                  <span key={t} className="flex items-center gap-8">
                    {t} <span className="text-[#ffe14d]">✦</span>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Feature grid */}
        <section className="px-5 md:px-10 py-20 max-w-6xl mx-auto">
          <div className="flex items-baseline justify-between mb-10">
            <h2 className="font-serif-display text-4xl md:text-5xl">Everything the paid tools do.</h2>
            <span className="hidden md:block font-mono-ui text-xs text-neutral-600">$0/month</span>
          </div>

          <div className="grid md:grid-cols-3 gap-px bg-white/[0.08] border border-white/[0.08]">
            <Feature icon={<MessageCircle className="w-4 h-4" />} title="Comment → DM funnels"
              desc="Keyword or reply-all triggers on any post. Choose DM only, public reply only, or both — with your own rotating public replies." />
            <Feature icon={<Send className="w-4 h-4" />} title="DM keyword automation"
              desc="Auto-respond to DMs with text, media, or rich cards with buttons. Quick-reply chips guide people through your funnel." />
            <Feature icon={<AtSign className="w-4 h-4" />} title="Story triggers"
              desc="React to story mentions, emoji reactions, and story replies. Filter by emoji or keyword." />
            <Feature icon={<Brain className="w-4 h-4" />} title="AI auto-reply"
              desc="Feed it your account context — niche, products, tone — and let AI handle unmatched DMs like a human." />
            <Feature icon={<Inbox className="w-4 h-4" />} title="Live inbox"
              desc="Every conversation in one dashboard. Jump in manually anytime, fire quick responses from your saved automations." />
            <Feature icon={<Lock className="w-4 h-4" />} title="Follow gate"
              desc="Lock content behind a follow. Non-followers get a follow prompt; one tap later they unlock the goods." />
            <Feature icon={<Sparkles className="w-4 h-4" />} title="Human-like sending"
              desc="Optional typing indicators and randomized delays so replies land natural, not botty." />
            <Feature icon={<Terminal className="w-4 h-4" />} title="Self-hosted & hackable"
              desc="Next.js + Supabase. Deploy on free tiers. Read every line, fork it, own your data and your tokens." />
          </div>
        </section>

        {/* ScrollFloat App Name */}
        <section className="py-24 md:py-32 w-full flex flex-col items-center justify-center overflow-hidden">
          <ScrollFloat
            animationDuration={1}
            ease='back.inOut(2)'
            scrollStart='center bottom+=50%'
            scrollEnd='bottom bottom-=40%'
            stagger={0.03}
            containerClassName="w-full flex justify-center text-center mx-auto"
            textClassName="font-serif-display text-white tracking-widest uppercase text-center block mx-auto"
          >
            HELIXA
          </ScrollFloat>
        </section>

        {/* Community strip */}
        <section className="px-5 md:px-10 pb-24 max-w-6xl mx-auto">
          <div className="border border-white/[0.08] rounded-2xl p-8 md:p-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-8 bg-gradient-to-br from-white/[0.03] to-transparent">
            <div>
              <h3 className="font-serif-display text-3xl md:text-4xl mb-2">Built in the open.</h3>
              <p className="text-neutral-500 text-sm max-w-md">
                Stars, sponsors, and testers keep this project alive. Questions, bugs, feature requests —
                the Telegram chat is where it all happens.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <a
                href={TELEGRAM_URL} target="_blank" rel="noreferrer"
                className="flex items-center gap-2 bg-[#2AABEE] text-white font-mono-ui text-xs font-bold px-5 py-3 rounded-full hover:brightness-110 transition-all"
              >
                <Send className="w-3.5 h-3.5" /> Join Telegram
              </a>
              <a
                href={GITHUB_URL} target="_blank" rel="noreferrer"
                className="flex items-center gap-2 border border-white/15 text-neutral-300 font-mono-ui text-xs font-bold px-5 py-3 rounded-full hover:border-white/40 transition-colors"
              >
                <Star className="w-3.5 h-3.5 text-[#ffe14d]" /> Star on GitHub
              </a>
              <a
                href={LINKEDIN_URL} target="_blank" rel="noreferrer"
                className="flex items-center gap-2 border border-white/15 text-neutral-300 font-mono-ui text-xs font-bold px-5 py-3 rounded-full hover:border-white/40 transition-colors"
              >
                <Linkedin className="w-3.5 h-3.5 text-[#0A66C2]" /> LinkedIn
              </a>
            </div>
          </div>
        </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.08] px-5 md:px-10 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <span className="font-mono-ui text-[11px] text-neutral-600">
          Helixa — open-source Instagram automation. MIT licensed.
        </span>
        <div className="flex items-center gap-5 font-mono-ui text-[11px] text-neutral-500">
          <a href="/pricing" className="hover:text-white transition-colors">Pricing</a>
          <a href="/privacy" className="hover:text-white transition-colors">Privacy</a>
          <a href="/terms" className="hover:text-white transition-colors">Terms</a>
          <span className="text-white/10">|</span>
          <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="hover:text-white transition-colors">GitHub</a>
          <a href={LINKEDIN_URL} target="_blank" rel="noreferrer" className="hover:text-[#0A66C2] transition-colors">LinkedIn</a>
          <a href={TELEGRAM_URL} target="_blank" rel="noreferrer" className="hover:text-[#2AABEE] transition-colors">Telegram support</a>
        </div>
      </footer>
    </div>
  )
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="bg-[#03010A] p-7 group hover:bg-[#0d0a18] transition-colors">
      <div className="w-9 h-9 rounded-lg border border-white/10 flex items-center justify-center text-neutral-500 group-hover:text-[#ffe14d] group-hover:border-[#ffe14d]/30 transition-colors mb-5">
        {icon}
      </div>
      <h3 className="font-mono-ui text-sm font-bold text-white mb-2">{title}</h3>
      <p className="text-[13px] text-neutral-500 leading-relaxed">{desc}</p>
    </div>
  )
}
