import BackToHome from "@/components/ui/back-to-home"

const FAQ_ITEMS = [
  {
    q: "What does Helixa do?",
    a: "Helixa is an AI-powered automation tool for Instagram and Facebook. It allows you to automatically reply to DMs, comments, and story mentions using custom rules or AI generated responses (powered by Groq)."
  },
  {
    q: "How does the trial work?",
    a: "When you sign up, you automatically receive a free trial period. During this time, you have full access to all features to test the automations. Once the trial expires, automations will pause until you upgrade to a paid plan."
  },
  {
    q: "How does billing work?",
    a: "We offer two main payment methods:\n\n• Stripe: Pay securely with a credit card for instant access and automatic monthly renewals.\n• Vodafone Cash: A manual payment option specifically for users in Egypt. You submit a transaction reference number, and our team will manually review and approve your payment to activate your plan."
  },
  {
    q: "What happens if my payment isn't renewed?",
    a: "If your Stripe payment fails or your Vodafone Cash subscription expires without a manual renewal, your account will transition to an 'expired' state. Your data will be preserved, but your automations will stop firing until you renew."
  },
  {
    q: "Which platforms are supported?",
    a: "Currently, Helixa supports Instagram Professional accounts and Facebook Pages (including Messenger). We plan to add support for WhatsApp in the future."
  }
]

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-[#03010A] text-white relative">
      <BackToHome />
      <main className="max-w-3xl mx-auto px-4 py-24 space-y-12">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">Frequently Asked Questions</h1>
          <p className="text-neutral-400">Everything you need to know about Helixa and how it works.</p>
        </div>

        <div className="space-y-3">
          {FAQ_ITEMS.map((item, i) => (
            <details
              key={i}
              className="group border border-white/10 rounded-xl bg-white/[0.02] overflow-hidden [&_summary]:cursor-pointer"
            >
              <summary className="flex items-center justify-between px-6 py-4 text-lg font-medium text-white list-none [&::-webkit-details-marker]:hidden">
                {item.q}
                <span className="text-neutral-500 group-open:rotate-45 transition-transform duration-200 text-xl">+</span>
              </summary>
              <div className="px-6 pb-5 text-neutral-300 text-sm leading-relaxed whitespace-pre-line">
                {item.a}
              </div>
            </details>
          ))}
        </div>
      </main>
    </div>
  )
}
