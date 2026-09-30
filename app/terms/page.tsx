import { Header } from "@/components/layout/Header"
import { Footer } from "@/components/layout/Footer"
import { FrontBackground } from "@/components/layout/FrontBackground"

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#03010A] text-white selection:bg-[#e5a93c] selection:text-black relative">
      <FrontBackground />
      <Header activeHref="/terms" />
      <div className="max-w-3xl mx-auto px-4 py-24 sm:py-32 relative z-10">
        <h1 className="text-4xl md:text-5xl font-serif-display mb-8 tracking-tight">Terms of Service</h1>
        <div className="prose prose-invert max-w-none space-y-6 text-neutral-300">
          <p>Last updated: September 30, 2026</p>
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">1. The service</h2>
            <p>
              Helixa lets a creator or an agency connect messaging channels, reply to people who message them, and bill for the Helixa plan they choose. By creating an account you agree to these terms and to the privacy policy.
            </p>
          </section>
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">2. Your account</h2>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>You must be allowed to operate the Instagram, Facebook, WhatsApp, or TikTok account you connect.</li>
              <li>You follow each platform&apos;s rules, including consent for broadcasts and the 24-hour messaging windows.</li>
              <li>You keep your password and API keys private.</li>
              <li>We can suspend an account that is used to spam, phish, or break a platform policy.</li>
            </ul>
          </section>
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">3. Plans, trials, and payments</h2>
            <p>
              Paid plans are billed in advance, monthly or yearly, through Stripe, Paymob, Tap, or a Vodafone Cash transfer that an administrator confirms. A trial lasts 14 days and can be used once. When a trial ends, the account continues on Creator Free. An upgrade starts after the payment succeeds. A downgrade applies at the end of the current period. A failed renewal stays in a 7-day grace period and then pauses automations until the invoice is paid.
            </p>
          </section>
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">4. Agency resale</h2>
            <p>
              An agency plan can set a price for a client workspace and send that client a checkout link through the same payment providers. You are the seller of that client invoice. Helixa&apos;s own subscription is a separate charge. You are responsible for the tax, refunds, and claims on the prices you set.
            </p>
          </section>
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">5. White-label and API</h2>
            <p>
              White-label branding and the public API are available on the plans that include them. You may not present Helixa as a Meta or TikTok product, and you may not use the API to exceed the limits of your plan.
            </p>
          </section>
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">6. Liability</h2>
            <p>
              Messaging platforms can change or revoke access. Helixa is provided as available. We are not liable for lost messages, rejected payments, or indirect damages arising from your use of the service.
            </p>
          </section>
        </div>
      </div>
      <Footer />
    </main>
  )
}
