import { Header } from "@/components/layout/Header"
import { Footer } from "@/components/layout/Footer"
import { FrontBackground } from "@/components/layout/FrontBackground"
import LastUpdated from "@/components/legal/LastUpdated"
import Link from "next/link"
import BackToTop from "@/components/ui/BackToTop"

export const metadata = {
    title: "Cookie & Data Processing Policy | Helixa",
    description: "The cookies Helixa uses and how your data is processed.",
}

const COOKIE_TABLE = [
    { name: "sb-* auth tokens", purpose: "Keeps you signed in to your dashboard (strictly necessary — the app cannot function without it).", duration: "Session / up to 30 days (refresh token)", consent: "Not required" },
    { name: "helixa-lang", purpose: "Remembers whether you prefer the English or Arabic interface.", duration: "12 months", consent: "Not required" },
    { name: "helixa-cookie-consent", purpose: "Stores your cookie-banner choice so we stop asking you.", duration: "12 months", consent: "Your choice" },
]

export default function CookiesPage() {
    return (
        <main id="main-content" className="min-h-screen bg-[#03010A] text-white selection:bg-[#e5a93c] selection:text-black relative">
            <FrontBackground />
            <Header activeHref="/cookies" />
            <div className="max-w-3xl mx-auto px-4 py-24 sm:py-32 relative z-10">
                <h1 className="text-4xl md:text-5xl font-serif-display mb-8 tracking-tight">Cookie &amp; Data Processing Policy</h1>
                <LastUpdated />

                <div className="prose prose-invert max-w-none space-y-6 text-neutral-300 mt-10">
                    <p>
                        This policy explains the cookies Helixa uses and how they relate to the data processing
                        described in our <Link href="/privacy" className="text-[#e5a93c] hover:underline">Privacy Policy</Link>.
                    </p>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">1. Our Cookie Approach</h2>
                        <p>
                            Helixa keeps cookies to the minimum required to run the Service. We do{" "}
                            <strong className="text-white">not</strong> use advertising cookies, cross-site trackers,
                            or third-party marketing pixels. The first time you visit, a small banner lets you accept
                            or reject the optional preference cookie — and either choice works: the site is fully
                            functional either way.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">2. Cookies We Set</h2>
                        <div className="overflow-x-auto mt-2">
                            <table className="w-full text-sm border border-white/10 rounded-xl overflow-hidden text-left">
                                <thead className="bg-white/[0.04] text-white">
                                    <tr>
                                        <th className="px-4 py-3 font-semibold">Cookie</th>
                                        <th className="px-4 py-3 font-semibold">Purpose</th>
                                        <th className="px-4 py-3 font-semibold">Duration</th>
                                        <th className="px-4 py-3 font-semibold">Consent</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/[0.06]">
                                    {COOKIE_TABLE.map((c) => (
                                        <tr key={c.name}>
                                            <td className="px-4 py-3 font-mono-ui text-[#e5a93c] whitespace-nowrap">{c.name}</td>
                                            <td className="px-4 py-3">{c.purpose}</td>
                                            <td className="px-4 py-3 whitespace-nowrap">{c.duration}</td>
                                            <td className="px-4 py-3 whitespace-nowrap">{c.consent}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <p className="mt-4 text-sm text-neutral-400">
                            Note: if you sign in with Google or pay with Stripe, those providers may set their own
                            cookies on their pages during those flows, governed by their respective policies.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">3. Data Processing Summary</h2>
                        <ul className="list-disc pl-6 space-y-2 mt-2">
                            <li><strong className="text-white">Legal bases (GDPR):</strong> contract performance (running your automations and billing), legitimate interest (service security, abuse prevention), and consent where required (optional preference storage).</li>
                            <li><strong className="text-white">Processors:</strong> Supabase (hosting/database/auth), Stripe (payments), Vercel (hosting/analytics), Meta and Telegram (platform APIs), and your chosen AI provider. Details in the Privacy Policy.</li>
                            <li><strong className="text-white">International transfers:</strong> our processors may process data outside your country; they provide contractual safeguards for such transfers.</li>
                            <li><strong className="text-white">Your choices:</strong> you can clear or block cookies in your browser at any time; the only impact is being signed out and language resetting. To exercise data rights, contact us via the footer channels.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">4. Changes</h2>
                        <p>
                            If we ever add cookies beyond this list, we will update this page and re-show the consent
                            banner before setting them.
                        </p>
                    </section>
                </div>
            </div>
            <Footer />
            <BackToTop />
        </main>
    )
}
