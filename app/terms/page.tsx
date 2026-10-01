import { Header } from "@/components/layout/Header"
import { Footer } from "@/components/layout/Footer"
import { FrontBackground } from "@/components/layout/FrontBackground"
import LastUpdated from "@/components/legal/LastUpdated"
import BackToTop from "@/components/ui/BackToTop"
import Link from "next/link"

export const metadata = {
    title: "Terms of Service | Helixa",
    description: "The terms governing your use of the Helixa automation platform.",
}

export default function TermsPage() {
    return (
        <main id="main-content" className="min-h-screen bg-[#03010A] text-white selection:bg-[#e5a93c] selection:text-black relative">
            <FrontBackground />
            <Header activeHref="/terms" />
            <div className="max-w-3xl mx-auto px-4 py-24 sm:py-32 relative z-10">
                <h1 className="text-4xl md:text-5xl font-serif-display mb-8 tracking-tight">Terms of Service</h1>
                <LastUpdated />

                <div className="prose prose-invert max-w-none space-y-6 text-neutral-300 mt-10">
                    <p>
                        These Terms of Service (&quot;Terms&quot;) govern your access to and use of Helixa (&quot;the Service&quot;), a
                        messaging automation platform. By creating an account or using the Service, you agree to
                        these Terms and to the privacy policy.
                    </p>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">1. The Service</h2>
                        <p>
                            Helixa lets a creator or an agency connect messaging channels and reply to people who
                            message them. It automates replies to comments, direct messages, and story interactions on
                            the platforms you connect (Instagram, Facebook/Messenger, WhatsApp, Telegram, and TikTok),
                            using keyword rules, follow-gates, and optional AI-generated responses. You direct what the
                            Service sends on your behalf. You are responsible for the content of your automations and
                            for complying with each platform&apos;s terms, consent rules, messaging windows, and anti-spam
                            policies.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">2. Accounts</h2>
                        <ul className="list-disc pl-6 space-y-2 mt-2">
                            <li>You must be allowed to operate the Instagram, Facebook, WhatsApp, Telegram, or TikTok account you connect.</li>
                            <li>You are responsible for safeguarding your account password, API keys, and for all activity under your account.</li>
                            <li>You must provide accurate account and payment contact information.</li>
                            <li>We may suspend or terminate accounts that violate these Terms, are used to spam or phish, or violate a connected platform&apos;s policies.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">3. Subscriptions, Billing &amp; Renewal</h2>
                        <ul className="list-disc pl-6 space-y-2 mt-2">
                            <li><strong className="text-white">Trial.</strong> A paid plan trial lasts 14 days and can be used once. No card is required to start it. When the trial ends, the account continues on Creator Free.</li>
                            <li><strong className="text-white">Paid plans.</strong> Paid plans are billed in advance, monthly or yearly, through Stripe, Paymob, Tap, or a Vodafone Cash transfer that an administrator confirms. An upgrade starts after the payment succeeds. A downgrade applies at the end of the current period. You can cancel a Stripe subscription from your Billing page; cancellation stops future charges and the plan remains active until the end of the paid period.</li>
                            <li><strong className="text-white">Failed renewal.</strong> A failed renewal stays in a 7-day grace period and then pauses automations until the invoice is paid.</li>
                            <li><strong className="text-white">Lifetime plan.</strong> Where a one-time lifetime plan is offered, it is a one-time payment for the plan features described at checkout.</li>
                            <li><strong className="text-white">Prices.</strong> Prices are shown before you pay. We may change prices for future billing periods with prior notice; your current period price will not change mid-cycle.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">4. Payment Methods</h2>
                        <ul className="list-disc pl-6 space-y-2 mt-2">
                            <li><strong className="text-white">Stripe, Paymob, and Tap.</strong> Card payments are processed by the provider you select at checkout. We never receive or store your full card number. A receipt is issued for every successful Stripe charge.</li>
                            <li><strong className="text-white">Vodafone Cash (manual).</strong> For users in Egypt, you may transfer the exact plan amount to the number shown at checkout and submit the transaction reference. A manual payment is activated only after our team verifies it — typically within 24–48 hours. If the reference you submit cannot be matched to a received transfer (wrong amount, wrong number, duplicate, or invalid reference), we will contact you via the phone number you provided and, if it cannot be resolved, reject the submission and refund the transferred amount to the sending wallet. Manual Vodafone Cash purchases are one-time purchases; they do not auto-renew — you must resubmit a payment each cycle.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">5. Agency resale</h2>
                        <p>
                            An agency plan can set a price for a client workspace and send that client a checkout link
                            through the same payment providers. You are the seller of that client invoice. Helixa&apos;s own
                            subscription is a separate charge. You are responsible for the tax, refunds, and claims on
                            the prices you set.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">6. Refunds &amp; Cancellation</h2>
                        <p>
                            Our refund and cancellation terms — including how to cancel, what happens to your data, and
                            when refunds are issued — are described in the{" "}
                            <Link href="/refund" className="text-[#e5a93c] hover:underline">Refund &amp; Cancellation Policy</Link>.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">7. Acceptable Use</h2>
                        <p>You agree not to use the Service to:</p>
                        <ul className="list-disc pl-6 space-y-2 mt-2">
                            <li>Send spam, unsolicited bulk messages, or deceptive content.</li>
                            <li>Violate the Meta Platform Terms, Instagram, Facebook, WhatsApp, or TikTok rules, or Telegram&apos;s terms.</li>
                            <li>Present Helixa as a Meta or TikTok product.</li>
                            <li>Infringe intellectual-property or privacy rights of others.</li>
                            <li>Attempt to access other users&apos; data, tokens, or keys, or probe or abuse the platform&apos;s infrastructure.</li>
                            <li>Use the API to exceed the limits of your plan.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">8. White-label and API</h2>
                        <p>
                            White-label branding and the public API are available on the plans that include them.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">9. Third-Party Platforms &amp; AI</h2>
                        <p>
                            The Service depends on third-party platforms (Meta, TikTok, Telegram, Supabase, and the
                            payment provider you choose) and AI providers. Messaging platforms can change or revoke
                            access. Outages, API changes, or permission reviews by those providers may interrupt
                            automations. We are not liable for such third-party interruptions, but we will support you
                            in restoring your connections.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">10. Disclaimers &amp; Limitation of Liability</h2>
                        <p>
                            The Service is provided &quot;as is&quot; and as available, without warranties of any kind. To the
                            maximum extent permitted by law, we are not liable for lost messages, rejected payments, or
                            indirect, incidental, special, consequential, or punitive damages, including lost profits,
                            data, or goodwill, arising from your use of or inability to use the Service. Our total
                            liability for any claim is limited to the amount you paid us in the 12 months preceding the
                            claim.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">11. Changes to These Terms</h2>
                        <p>
                            We may update these Terms; the current version and its &quot;Last updated&quot; date always live on
                            this page. Material changes that affect paid subscriptions will be communicated by email or
                            in-app notice before they take effect.
                        </p>
                    </section>
                </div>
            </div>
            <Footer />
            <BackToTop />
        </main>
    )
}
