export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#03010A] text-white">
      
      <main className="max-w-3xl mx-auto px-4 py-24 space-y-8">
        <h1 className="text-4xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="text-neutral-400">Last updated: {new Date().toLocaleDateString()}</p>
        
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">1. Information We Collect</h2>
          <p className="text-neutral-300">
            Helixa operates by connecting to your Instagram and Facebook profiles. To provide our automation services, we collect and store:
          </p>
          <ul className="list-disc pl-6 text-neutral-300 space-y-2">
            <li>Profile information (Username, Profile ID)</li>
            <li><strong>Direct Message Content:</strong> We store incoming and outgoing messages to facilitate AI replies and automation history.</li>
            <li>Story interactions and comments directed at your connected accounts.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">2. How We Use Your Data</h2>
          <p className="text-neutral-300">
            We use the stored messages and interactions strictly to provide the core functionality of Helixa—triggering automations, generating AI responses via our providers, and displaying analytics in your dashboard.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">3. Third-Party Sharing</h2>
          <p className="text-neutral-300">
            Your data is processed by the following third parties:
          </p>
          <ul className="list-disc pl-6 text-neutral-300 space-y-2">
            <li><strong>Meta:</strong> For connecting to Instagram/Facebook APIs.</li>
            <li><strong>Groq/AI Providers:</strong> Message context may be sent to AI providers to generate auto-replies.</li>
            <li><strong>Supabase:</strong> For secure database hosting.</li>
            <li><strong>Stripe:</strong> For secure payment processing.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">4. Your Rights</h2>
          <p className="text-neutral-300">
            You may disconnect your Meta account at any time, which revokes our access to new messages. You can request full deletion of your historical message data and account by contacting support.
          </p>
        </section>
      </main>
    </div>
  )
}
