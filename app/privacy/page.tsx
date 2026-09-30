import { Header } from "@/components/layout/Header"
import { Footer } from "@/components/layout/Footer"
import { FrontBackground } from "@/components/layout/FrontBackground"

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#03010A] text-white selection:bg-[#e5a93c] selection:text-black relative">
      <FrontBackground />
      <Header activeHref="/privacy" />
      <div className="max-w-3xl mx-auto px-4 py-24 sm:py-32 relative z-10">
        <h1 className="text-4xl md:text-5xl font-serif-display mb-8 tracking-tight">Privacy Policy</h1>
        <div className="prose prose-invert max-w-none space-y-6 text-neutral-300">
          <p>Last updated: September 30, 2026</p>
          <p>
            Helixa is a messaging workspace for creators and agencies. This policy covers the Helixa application, the public pages on this site, and the Meta and TikTok connections you authorize.
          </p>
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">1. Information we collect</h2>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>Account information: name, email, password hash, and the plan you choose.</li>
              <li>Workspace data you type in: automation rules, flows, broadcasts, product catalog, and knowledge-base text.</li>
              <li>Channel connections: Instagram professional account id, Facebook Page id, WhatsApp phone number id, TikTok business account id, and the access tokens those platforms issue. Tokens are encrypted at rest.</li>
              <li>Messages and comments those platforms deliver to Helixa, and the contacts created from them (display name, handle, phone, or email when the person sends it).</li>
              <li>Billing records: plan, invoices, and the payment-provider reference. Card numbers stay with Stripe, Paymob, or Tap.</li>
              <li>Technical logs needed to run the service, including webhook delivery ids.</li>
            </ul>
          </section>
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">2. How we use it</h2>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>Send the replies, comment responses, and broadcasts you configure.</li>
              <li>Show your inbox, contacts, and reports inside the workspace.</li>
              <li>Answer with the AI agent only when you turn it on, using the knowledge base you saved.</li>
              <li>Bill your Helixa subscription and, if you are an agency, create the client invoices you request.</li>
              <li>Detect failed tokens and ask you to reconnect.</li>
            </ul>
            <p className="mt-2">We do not sell contact lists. We do not use your inbox to train a public model. We do not publish posts or videos.</p>
          </section>
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">3. Meta and TikTok</h2>
            <p>
              Instagram, Facebook, WhatsApp, and TikTok are separate controllers for the data they hold. Helixa receives only what their APIs deliver after you grant the permissions listed in the app review. Disconnecting a channel, or removing Helixa in Facebook settings, stops new deliveries. The data-deletion callback is described on the data deletion page.
            </p>
          </section>
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">4. Retention and deletion</h2>
            <p>
              Connection tokens, conversations, and contacts stay until you disconnect the channel, a Meta data-deletion callback arrives, or you ask us to delete the account. Billing rows are kept for the period tax rules require. Confirmation status is public at <span className="text-white">/data-deletion</span> when you have a code. The callback endpoint is <span className="text-white">/api/meta/data-deletion</span>.
            </p>
          </section>
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">5. Sharing</h2>
            <p>
              We share data with the infrastructure that runs Helixa (hosting and the database you connect), the payment provider you select, and the messaging platform you connected. An agency on a white-label plan can see the client workspaces they own. We share data with a government authority when the law requires it.
            </p>
          </section>
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">6. Contact</h2>
            <p>Use the email on your Helixa account for privacy requests. Include the workspace name so we can find the right rows.</p>
          </section>
        </div>
      </div>
      <Footer />
    </main>
  )
}
