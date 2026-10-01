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
                        These Terms of Service ("Terms") govern your access to and use of Helixa ("the Service"), a
                        social-media automation platform. By creating an account or using the Service, you agree to
                        these Terms.
                    </p>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">1. The Service</h2>
                        <p>
                            Helixa automates replies to comments, direct messages, and story interactions on the social
                            platforms you connect (Instagram, Facebook/Messenger, Telegram), using keyword rules,
                            follow-gates, and optional AI-generated responses. You direct what the Service sends on your
                            behalf; you are responsible for the content of your automations and for complying with each
                            platform's terms and anti-spam policies.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">2. Accounts</h2>
                        <ul className="list-disc pl-6 space-y-2 mt-2">
                            <li>You are responsible for safeguarding your account password and for all activity under your account.</li>
                            <li>You must provide accurate account and payment contact information.</li>
                            <li>We may suspend or terminate accounts that violate these Terms, abuse the Service, or violate third-party platform policies.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">3. Subscriptions, Billing &amp; Renewal</h2>
                        <ul className="list-disc pl-6 space-y-2 mt-2">
                            <li><strong className="text-white">Free trial.</strong> New accounts receive a 7-day free trial with full access. No card is required. When the trial ends, automations pause until you upgrade; your data is preserved.</li>
                            <li><strong className="text-white">Monthly plan.</strong> Billed in advance on a recurring monthly basis via Stripe. It renews automatically each month until canceled. You can cancel at any time from your Billing page; cancellation stops future charges and your plan remains active until the end of the paid period.</li>
                            <li><strong className="text-white">Lifetime plan.</strong> A one-time payment for perpetual access to the plan features described at checkout, including updates released while the plan is offered.</li>
                            <li><strong className="text-white">Prices.</strong> Prices are shown in USD on the <Link href="/pricing" className="text-[#e5a93c] hover:underline">pricing page</Link> and at checkout before you pay. We may change prices for future billing periods with prior notice; your current period price will not change mid-cycle.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">4. Payment Methods</h2>
                        <ul className="list-disc pl-6 space-y-2 mt-2">
                            <li><strong className="text-white">Stripe (card).</strong> Payments are processed by Stripe. We never receive or store your full card number. Subscriptions renew automatically and a receipt/confirmation is issued for every successful charge.</li>
                            <li><strong className="text-white">Vodafone Cash (manual).</strong> For users in Egypt, you may transfer the exact plan amount to the number shown at checkout and submit the transaction reference. A manual payment is activated only after our team verifies it — typically within 24–48 hours. If the reference you submit cannot be matched to a received transfer (wrong amount, wrong number, duplicate, or invalid reference), we will contact you via the phone number you provided and, if it cannot be resolved, reject the submission and refund the transferred amount to the sending wallet. Manual Vodafone Cash purchases are one-time purchases; they do not auto-renew — you must resubmit a payment each cycle.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">5. Refunds &amp; Cancellation</h2>
                        <p>
                            Our refund and cancellation terms — including how to cancel, what happens to your data, and
                            when refunds are issued — are described in the{" "}
                            <Link href="/refund" className="text-[#e5a93c] hover:underline">Refund &amp; Cancellation Policy</Link>.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">6. Acceptable Use</h2>
                        <p>You agree not to use the Service to:</p>
                        <ul className="list-disc pl-6 space-y-2 mt-2">
                            <li>Send spam, unsolicited bulk messages, or deceptive content.</li>
                            <li>Violate the Meta Platform Terms, Instagram/Facebook community standards, or Telegram's terms.</li>
                            <li>Infringe intellectual-property or privacy rights of others.</li>
                            <li>Attempt to access other users' data, tokens, or keys, or probe/abuse the platform's infrastructure.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">7. Third-Party Platforms &amp; AI</h2>
                        <p>
                            The Service depends on third-party platforms (Meta, Telegram, Supabase, Stripe) and AI
                            providers. Outages, API changes, or permission reviews by those providers may interrupt
                            automations. We are not liable for such third-party interruptions, but we will support you
                            in restoring your connections.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">8. Disclaimers &amp; Limitation of Liability</h2>
                        <p>
                            The Service is provided "as is" without warranties of any kind. To the maximum extent
                            permitted by law, we are not liable for indirect, incidental, special, consequential, or
                            punitive damages, including lost profits, data, or goodwill, arising from your use of or
                            inability to use the Service. Our total liability for any claim is limited to the amount you
                            paid us in the 12 months preceding the claim.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">9. Changes to These Terms</h2>
                        <p>
                            We may update these Terms; the current version and its "Last updated" date always live on
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
