import { Header } from "@/components/layout/Header"
import { Footer } from "@/components/layout/Footer"
import { FrontBackground } from "@/components/layout/FrontBackground"
import LastUpdated from "@/components/legal/LastUpdated"
import BackToTop from "@/components/ui/BackToTop"

export const metadata = {
    title: "Privacy Policy | Helixa",
    description: "How Helixa collects, uses, stores, and protects your data.",
}

export default function PrivacyPage() {
    return (
        <main id="main-content" className="min-h-screen bg-[#03010A] text-white selection:bg-[#e5a93c] selection:text-black relative">
            <FrontBackground />
            <Header activeHref="/privacy" />
            <div className="max-w-3xl mx-auto px-4 py-24 sm:py-32 relative z-10">
                <h1 className="text-4xl md:text-5xl font-serif-display mb-8 tracking-tight">Privacy Policy</h1>
                <LastUpdated />

                <div className="prose prose-invert max-w-none space-y-6 text-neutral-300 mt-10">
                    <p>
                        This Privacy Policy describes how Helixa ("we", "us", "our") handles information when you use
                        helixa.app and the Helixa automation dashboard (the "Service"). It covers all data the Service
                        currently handles: social media automation data, payment data, and AI integrations. If you have
                        questions, contact us via the Telegram support link in the site footer.
                    </p>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">1. Information We Collect</h2>
                        <ul className="list-disc pl-6 space-y-2 mt-2">
                            <li><strong className="text-white">Account information:</strong> your email address, username, and authentication credentials (managed through Supabase Auth, including optional Google sign-in).</li>
                            <li><strong className="text-white">Connected platform data:</strong> when you connect Instagram or Facebook, we store the OAuth access tokens and permissions you grant, the automation rules you create, and the message content those platforms send to our webhooks — including comments, direct messages, and story interactions (sent and received) — so they can appear in your Live Inbox and trigger your automations.</li>
                            <li><strong className="text-white">Telegram bot data:</strong> if you connect a Telegram bot, we store the bot token you provide and the messages your bot receives and sends through Helixa.</li>
                            <li><strong className="text-white">AI keys (BYOK):</strong> if you connect your own AI provider keys ("Bring Your Own Key" — e.g. Gemini, OpenAI, Anthropic, OpenRouter), those API keys are stored so Helixa can make AI calls on your behalf. They are never displayed back in full in the dashboard.</li>
                            <li><strong className="text-white">Payment information:</strong> card payments are processed by Stripe; we never store your full card details on our servers — Stripe shares only the customer identifiers, subscription status, and receipts with us. For manual Vodafone Cash payments, we store the transaction reference number, the amount, your name and phone number, and any note you submit, so we can verify and approve your payment.</li>
                            <li><strong className="text-white">Usage data:</strong> basic service telemetry (for example page performance metrics and error reports) needed to operate and improve the Service.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">2. How We Use Your Information</h2>
                        <ul className="list-disc pl-6 space-y-2 mt-2">
                            <li>Provide, maintain, and improve the automation Service.</li>
                            <li>Send and receive messages through the platforms you connected, only according to the automation rules you configure.</li>
                            <li>Call your configured AI provider (platform keys or your own BYOK keys) to generate replies when your rules request it. Message content sent to AI providers is limited to what is needed to generate the reply.</li>
                            <li>Process transactions, verify manual payments, issue receipts, and manage your subscription.</li>
                            <li>Send you service notices (payment confirmations, subscription changes, security alerts).</li>
                        </ul>
                        <p className="mt-4">
                            We do not sell your personal information, and we do not use your connected-platform message
                            content to train AI models.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">3. Cookies &amp; Similar Technologies</h2>
                        <p>
                            We use a small number of strictly necessary cookies: an authentication session cookie that
                            keeps you logged in, and a language-preference cookie. We do not use advertising or
                            cross-site tracking cookies. See our <a href="/cookies" className="text-[#e5a93c] hover:underline">Cookie &amp; Data Processing Policy</a> for
                            the full list and how the cookie banner works.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">4. Data Sharing — Who We Use</h2>
                        <p>We share data only with the specific services required to run the Service:</p>
                        <ul className="list-disc pl-6 space-y-2 mt-2">
                            <li><strong className="text-white">Supabase</strong> — database hosting, authentication, and storage. Your account data, connected-platform tokens, message content, and BYOK keys are stored in Supabase (Postgres).</li>
                            <li><strong className="text-white">Stripe</strong> — card payment processing and subscription management. Card details are entered on Stripe's own checkout page; we receive only customer identifiers, subscription status, and payment confirmation.</li>
                            <li><strong className="text-white">Meta (Facebook &amp; Instagram)</strong> — when you connect Facebook or Instagram, our dashboard loads the Facebook JavaScript SDK (connect.facebook.net) on the Connected Platforms page to run the "Connect Facebook" login dialog. This means Meta can see that you visited that page while logged into Facebook. When connected, message and comment data flows through Meta's Graph APIs as required to run your automations.</li>
                            <li><strong className="text-white">Telegram</strong> — for bots you connect, bot tokens and bot messages are processed via the Telegram Bot API.</li>
                            <li><strong className="text-white">AI providers</strong> — your automation message content is sent to the AI provider configured for your account: Groq (the platform default for auto-replies), or — when you connect your own key — Google Gemini, OpenRouter, Anthropic (Claude), or OpenAI (GPT). Only the message text needed to generate a reply is sent.</li>
                            <li><strong className="text-white">Vercel Analytics</strong> — this site uses Vercel Analytics, which collects anonymous, non-identifying usage metrics (page views, performance). Vercel does not use cookies for this and we do not send it any personal or account data.</li>
                        </ul>
                        <p className="mt-4">We do not sell your data and we do not share it with advertising networks.</p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">5. Data Retention &amp; Deletion</h2>
                        <p>
                            You can disconnect a platform at any time from Connected Platforms, which removes the stored
                            tokens for that connection. You can request full account deletion (including message history
                            and stored payment references) and we will delete your data within 30 days, except where we
                            must retain records for legitimate accounting or fraud-prevention purposes. Expired
                            subscriptions preserve your data but pause automations.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">6. Data Security</h2>
                        <p>
                            Access tokens and BYOK keys are stored server-side and are never exposed in the dashboard
                            after being saved. Traffic is encrypted in transit (HTTPS). No method of transmission over
                            the Internet is 100% secure, and we cannot guarantee absolute security.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">7. Your Rights</h2>
                        <p>
                            Depending on your jurisdiction (including the EU/EEA under GDPR, and other regions with
                            similar laws), you may have rights to access, correct, export, or delete your personal data,
                            and to object to or restrict certain processing. Contact us via the support channels in the
                            site footer to exercise these rights.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">8. Changes to This Policy</h2>
                        <p>
                            We will update this page and change the "Last updated" date above when this policy changes.
                            Continued use of the Service after a change constitutes acceptance of the updated policy.
                        </p>
                    </section>
                </div>
            </div>
            <Footer />
            <BackToTop />
        </main>
    )
}
