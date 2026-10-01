import { Header } from "@/components/layout/Header"
import { Footer } from "@/components/layout/Footer"
import { FrontBackground } from "@/components/layout/FrontBackground"
import LastUpdated from "@/components/legal/LastUpdated"
import BackToTop from "@/components/ui/BackToTop"
import Link from "next/link"

export const metadata = {
    title: "Refund & Cancellation Policy | Helixa",
    description: "How to cancel your Helixa subscription and when refunds are issued.",
}

export default function RefundPage() {
    return (
        <main id="main-content" className="min-h-screen bg-[#03010A] text-white selection:bg-[#e5a93c] selection:text-black relative">
            <FrontBackground />
            <Header activeHref="/refund" />
            <div className="max-w-3xl mx-auto px-4 py-24 sm:py-32 relative z-10">
                <h1 className="text-4xl md:text-5xl font-serif-display mb-8 tracking-tight">Refund &amp; Cancellation Policy</h1>
                <LastUpdated />

                <div className="prose prose-invert max-w-none space-y-6 text-neutral-300 mt-10">
                    <p>
                        You can cancel your Helixa subscription at any time. This page explains exactly how
                        cancellation works for each payment method and when refunds are issued. These terms are part
                        of our <Link href="/terms" className="text-[#e5a93c] hover:underline">Terms of Service</Link>.
                    </p>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">1. How to Cancel (Stripe / Card)</h2>
                        <ul className="list-disc pl-6 space-y-2 mt-2">
                            <li>Cancel from your dashboard: go to <strong className="text-white">Billing &amp; Subscription</strong> and select "Cancel subscription". A confirmation dialog will appear before the cancellation is applied.</li>
                            <li>Cancellation stops all future charges immediately.</li>
                            <li>Your plan stays active until the end of the period you already paid for. After that, your account moves to the expired state: your data and configuration are preserved, but automations pause until you renew.</li>
                            <li>We do not charge cancellation fees, ever.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">2. Vodafone Cash (Manual) — Renewal &amp; Cancellation</h2>
                        <ul className="list-disc pl-6 space-y-2 mt-2">
                            <li>Manual Vodafone Cash purchases do <strong className="text-white">not</strong> auto-renew. There is nothing to cancel — when the paid period ends without a new manual payment, automations simply pause.</li>
                            <li>If you submitted a payment that has not yet been approved and you change your mind before activation, contact support and we will refund the transfer to the sending wallet.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">3. When Refunds Are Issued</h2>
                        <ul className="list-disc pl-6 space-y-2 mt-2">
                            <li><strong className="text-white">14-day refund window (monthly plan):</strong> if you cancel within 14 days of your first charge for a monthly subscription and have not previously received a refund from us, you may request a full refund of that charge.</li>
                            <li><strong className="text-white">Duplicate or incorrect charges:</strong> if you were charged twice, or charged after canceling, we refund the erroneous charge in full — no questions asked.</li>
                            <li><strong className="text-white">Service failure:</strong> if a confirmed platform-side failure on our side prevents the Service from working for a sustained period (more than 72 consecutive hours) during a paid period, you may request a pro-rata refund for the affected period.</li>
                            <li><strong className="text-white">Lifetime plan:</strong> refundable in full within 14 days of purchase, provided your account has not been terminated for policy violations.</li>
                            <li><strong className="text-white">Not refundable:</strong> partial periods after the 14-day window for monthly plans, and accounts terminated for violation of the Acceptable Use rules (spam, abuse, platform-policy violations).</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">4. How Refunds Are Processed</h2>
                        <ul className="list-disc pl-6 space-y-2 mt-2">
                            <li><strong className="text-white">Stripe:</strong> refunds are issued back to the original card via Stripe, typically within 5–10 business days depending on your bank.</li>
                            <li><strong className="text-white">Vodafone Cash:</strong> refunds are sent back to the wallet number that made the transfer. Refunds are processed after verification, usually within 5 business days of approval.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">5. Data After Cancellation</h2>
                        <p>
                            Canceling does not delete your data. Your automations, inbox history, and settings are
                            preserved and reactivate if you subscribe again. You may request full deletion at any time
                            (see the <Link href="/privacy" className="text-[#e5a93c] hover:underline">Privacy Policy</Link>).
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">6. Questions</h2>
                        <p>
                            For cancellation help, refund requests, or payment questions, reach us via the Telegram
                            support link in the site footer or the "Get Help" button in your dashboard. Please include
                            your account email and, for manual payments, the transaction reference.
                        </p>
                    </section>
                </div>
            </div>
            <Footer />
            <BackToTop />
        </main>
    )
}
