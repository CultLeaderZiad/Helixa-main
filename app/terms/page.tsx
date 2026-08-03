import { AlertTriangle } from "lucide-react"
import BackToHome from "@/components/ui/back-to-home"

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#03010A] text-white py-24 px-6 relative">
      <BackToHome />
      <main className="max-w-3xl mx-auto py-24 px-6 space-y-8">
        <h1 className="text-4xl font-bold tracking-tight">Terms of Service</h1>
        <p className="text-neutral-400">Last updated: {new Date().toLocaleDateString()}</p>
        
        <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-200 p-4 rounded-xl text-sm">
          <strong>LEGAL DISCLAIMER:</strong> This is a boilerplate terms of service and must be reviewed by a legal professional before production use.
        </div>
        
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">1. Acceptance of Terms</h2>
          <p className="text-neutral-300">
            By accessing and using Helixa, you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, you may not use our service.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">2. Use of Service</h2>
          <p className="text-neutral-300">
            Helixa provides automation tools for Instagram and Facebook. You agree to use the service in compliance with Meta's Terms of Service and Community Guidelines. Any abuse of the API, spamming, or violation of platform rules may result in immediate termination of your account without refund.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">3. Subscriptions and Payments</h2>
          <p className="text-neutral-300">
            We offer both automated billing (via Stripe) and manual billing (via Vodafone Cash).
          </p>
          <ul className="list-disc pl-6 text-neutral-300 space-y-2">
            <li><strong>Stripe:</strong> Subscriptions auto-renew unless cancelled before the end of the billing cycle.</li>
            <li><strong>Vodafone Cash:</strong> Payments must be submitted manually and are subject to admin review. Access is granted only after approval. Renewals are manual.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">4. Limitation of Liability</h2>
          <p className="text-neutral-300">
            Helixa is not affiliated with Meta Platforms, Inc. We are not responsible for any restrictions, shadowbans, or account disabling imposed by Meta resulting from your use of automated responses. Use the service responsibly.
          </p>
        </section>
      </main>
    </div>
  )
}
