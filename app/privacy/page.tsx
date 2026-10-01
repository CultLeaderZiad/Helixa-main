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
                        helixa.app and the Helixa automation dashboard (the "Service"). It covers the public pages on
                        this site and the Meta, WhatsApp, Telegram, and TikTok connections you authorize. If you have
                        questions, contact us via the Telegram support link in the site footer, or use the email on
                        your Helixa account and include the workspace name.
                    </p>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">1. Information We Collect</h2>
                        <ul className="list-disc pl-6 space-y-2 mt-2">
                            <li><strong className="text-white">Account information:</strong> your email address, username, and authentication credentials (managed through Supabase Auth, including optional Google sign-in), and the plan you choose.</li>
                            <li><strong className="text-white">Workspace data you type in:</strong> automation rules, flows, broadcasts, product catalog, and knowledge-base text.</li>
                            <li><strong className="text-white">Connected platform data:</strong> when you connect Instagram, Facebook, WhatsApp, or TikTok, we store the account or page identifiers and the access tokens those platforms issue. Tokens are encrypted at rest. We also store the automation rules you create and the message content those platforms send to our webhooks — including comments, direct messages, and story interactions — so they can appear in your inbox and trigger your automations.</li>
                            <li><strong className="text-white">Contacts:</strong> display name, handle, phone, or email when a person sends that information in a message.</li>
                            <li><strong className="text-white">Telegram bot data:</strong> if you connect a Telegram bot, we store the bot token you provide and the messages your bot receives and sends through Helixa.</li>
                            <li><strong className="text-white">AI keys (BYOK):</strong> if you connect your own AI provider keys ("Bring Your Own Key" — e.g. Gemini, OpenAI, Anthropic, OpenRouter), those API keys are stored so Helixa can make AI calls on your behalf. They are never displayed back in full in the dashboard.</li>
                            <li><strong className="text-white">Payment information:</strong> card payments are processed by Stripe, Paymob, or Tap. We never store your full card details on our servers. Those providers share customer identifiers, subscription status, and receipts with us. For manual Vodafone Cash payments, we store the transaction reference number, the amount, your name and phone number, and any note you submit, so we can verify and approve your payment.</li>
                            <li><strong className="text-white">Usage data:</strong> basic service telemetry (for example page performance metrics, webhook delivery ids, and error reports) needed to operate and improve the Service.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">2. How We Use Your Information</h2>
                        <ul className="list-disc pl-6 space-y-2 mt-2">
                            <li>Provide, maintain, and improve the automation Service.</li>
                            <li>Send the replies, comment responses, and broadcasts you configure, only according to the rules you set.</li>
                            <li>Show your inbox, contacts, and reports inside the workspace.</li>
                            <li>Call your configured AI provider (platform keys or your own BYOK keys) to generate replies when your rules request it. Message content sent to AI providers is limited to what is needed to generate the reply.</li>
                            <li>Process transactions, verify manual payments, issue receipts, and manage your subscription. If you are an agency, create the client invoices you request.</li>
                            <li>Detect failed tokens and ask you to reconnect.</li>
                            <li>Send you service notices (payment confirmations, subscription changes, security alerts).</li>
                        </ul>
                        <p className="mt-4">
                            We do not sell your personal information or contact lists, and we do not use your
                            connected-platform message content to train a public model. We do not publish posts or videos.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">3. Meta, WhatsApp, and TikTok</h2>
                        <p>
                            Instagram, Facebook, WhatsApp, and TikTok are separate controllers for the data they hold.
                            Helixa receives only what their APIs deliver after you grant the permissions listed in the
                            app review. Disconnecting a channel, or removing Helixa in Facebook settings, stops new
                            deliveries. The data-deletion instructions and confirmation page are at{" "}
                            <a href="/data-deletion" className="text-[#e5a93c] hover:underline">/data-deletion</a>.
                            Meta&apos;s signed deletion callback is{" "}
                            <span className="text-white">/api/meta/data-deletion</span>.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">4. Cookies &amp; Similar Technologies</h2>
                        <p>
                            We use a small number of strictly necessary cookies: an authentication session cookie that
                            keeps you logged in, and a language-preference cookie. We do not use advertising or
                            cross-site tracking cookies. See our <a href="/cookies" className="text-[#e5a93c] hover:underline">Cookie &amp; Data Processing Policy</a> for
                            the full list and how the cookie banner works.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">5. Data Sharing — Who We Use</h2>
                        <p>We share data only with the specific services required to run the Service:</p>
                        <ul className="list-disc pl-6 space-y-2 mt-2">
                            <li><strong className="text-white">Supabase</strong> — database hosting, authentication, and storage. Your account data, connected-platform tokens, message content, and BYOK keys are stored in Supabase (Postgres).</li>
                            <li><strong className="text-white">Stripe, Paymob, and Tap</strong> — card payment processing and subscription management. Card details are entered on the provider&apos;s checkout page; we receive only customer identifiers, subscription status, and payment confirmation.</li>
                            <li><strong className="text-white">Meta (Facebook, Instagram, and WhatsApp)</strong> — when you connect Facebook or Instagram, our dashboard loads the Facebook JavaScript SDK (connect.facebook.net) on the Connected Platforms page to run the &quot;Connect Facebook&quot; login dialog. This means Meta can see that you visited that page while logged into Facebook. When connected, message and comment data flows through Meta&apos;s APIs as required to run your automations.</li>
                            <li><strong className="text-white">TikTok</strong> — for a TikTok business account you connect, account identifiers, access tokens, and the comments and direct messages TikTok delivers are processed through the TikTok Business API.</li>
                            <li><strong className="text-white">Telegram</strong> — for bots you connect, bot tokens and bot messages are processed via the Telegram Bot API.</li>
                            <li><strong className="text-white">AI providers</strong> — your automation message content is sent to the AI provider configured for your account: Groq (the platform default for auto-replies), or — when you connect your own key — Google Gemini, OpenRouter, Anthropic (Claude), or OpenAI (GPT). Only the message text needed to generate a reply is sent.</li>
                            <li><strong className="text-white">Vercel Analytics</strong> — this site uses Vercel Analytics, which collects anonymous, non-identifying usage metrics (page views, performance). Vercel does not use cookies for this and we do not send it any personal or account data.</li>
                        </ul>
                        <p className="mt-4">
                            An agency on a white-label plan can see the client workspaces they own. We share data with
                            a government authority when the law requires it. We do not sell your data and we do not
                            share it with advertising networks.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">6. Data Retention &amp; Deletion</h2>
                        <p>
                            Connection tokens, conversations, and contacts stay until you disconnect the channel, a
                            Meta data-deletion callback arrives, or you ask us to delete the account. You can disconnect
                            a platform at any time from Connected Platforms. You can request full account deletion
                            (including message history and stored payment references) and we will delete your data
                            within 30 days, except where we must retain billing records for legitimate accounting or
                            fraud-prevention purposes. Confirmation status is public at{" "}
                            <a href="/data-deletion" className="text-[#e5a93c] hover:underline">/data-deletion</a> when
                            you have a code. Expired subscriptions preserve your data but pause automations.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">7. Data Security</h2>
                        <p>
                            Access tokens and BYOK keys are stored server-side and are never exposed in the dashboard
                            after being saved. Traffic is encrypted in transit (HTTPS). No method of transmission over
                            the Internet is 100% secure, and we cannot guarantee absolute security.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">8. Your Rights</h2>
                        <p>
                            Depending on your jurisdiction (including the EU/EEA under GDPR, and other regions with
                            similar laws), you may have rights to access, correct, export, or delete your personal data,
                            and to object to or restrict certain processing. Contact us via the support channels in the
                            site footer to exercise these rights.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">9. Changes to This Policy</h2>
                        <p>
                            We will update this page and change the &quot;Last updated&quot; date above when this policy changes.
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
