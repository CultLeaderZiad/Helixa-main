"use client"

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-[#03010A] text-white">
      
      <main className="max-w-3xl mx-auto px-4 py-24 space-y-12">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">Frequently Asked Questions</h1>
          <p className="text-neutral-400">Everything you need to know about Helixa and how it works.</p>
        </div>

        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="item-1">
            <AccordionTrigger className="text-lg">What does Helixa do?</AccordionTrigger>
            <AccordionContent className="text-neutral-300">
              Helixa is an AI-powered automation tool for Instagram and Facebook. It allows you to automatically reply to DMs, comments, and story mentions using custom rules or AI generated responses (powered by Groq).
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-2">
            <AccordionTrigger className="text-lg">How does the trial work?</AccordionTrigger>
            <AccordionContent className="text-neutral-300">
              When you sign up, you automatically receive a free trial period. During this time, you have full access to all features to test the automations. Once the trial expires, automations will pause until you upgrade to a paid plan.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-3">
            <AccordionTrigger className="text-lg">How does billing work?</AccordionTrigger>
            <AccordionContent className="text-neutral-300">
              We offer two main payment methods:
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li><strong>Stripe:</strong> Pay securely with a credit card for instant access and automatic monthly renewals.</li>
                <li><strong>Vodafone Cash:</strong> A manual payment option specifically for users in Egypt. You submit a transaction reference number, and our team will manually review and approve your payment to activate your plan.</li>
              </ul>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-4">
            <AccordionTrigger className="text-lg">What happens if my payment isn't renewed?</AccordionTrigger>
            <AccordionContent className="text-neutral-300">
              If your Stripe payment fails or your Vodafone Cash subscription expires without a manual renewal, your account will transition to an &apos;expired&apos; state. Your data will be preserved, but your automations will stop firing until you renew.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-5">
            <AccordionTrigger className="text-lg">Which platforms are supported?</AccordionTrigger>
            <AccordionContent className="text-neutral-300">
              Currently, Helixa supports Instagram Professional accounts and Facebook Pages (including Messenger). We plan to add support for WhatsApp in the future.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </main>

    </div>
  )
}
