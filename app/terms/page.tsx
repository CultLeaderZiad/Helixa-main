import { Header } from "@/components/layout/Header"
import { Footer } from "@/components/layout/Footer"

export default function TermsPage() {
    return (
        <main className="min-h-screen bg-black text-white selection:bg-[#ffe14d] selection:text-black">
            <Header />
            <div className="max-w-3xl mx-auto px-4 py-24 sm:py-32">
                <h1 className="text-4xl md:text-5xl font-serif-display mb-8 tracking-tight">Terms of Service</h1>
                
                <div className="prose prose-invert max-w-none space-y-6 text-neutral-300">
                    <p>Last updated: {new Date().toLocaleDateString()}</p>
                    
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">1. Acceptance of Terms</h2>
                        <p>By accessing or using our services, you agree to be bound by these Terms. If you disagree with any part of the terms, then you do not have permission to access the service.</p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">2. Account Responsibilities</h2>
                        <ul className="list-disc pl-6 space-y-2 mt-2">
                            <li>You are responsible for safeguarding your account password.</li>
                            <li>You must ensure that your use of automations complies with social media platform policies (e.g., Meta/Instagram).</li>
                            <li>We reserve the right to suspend or terminate accounts that violate our terms or third-party platform policies.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">3. Subscriptions and Payments</h2>
                        <p>Some parts of the service are billed on a subscription basis. You will be billed in advance on a recurring and periodic basis depending on the type of subscription plan you select.</p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">4. Limitation of Liability</h2>
                        <p>In no event shall we be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the service.</p>
                    </section>
                </div>
            </div>
            <Footer />
        </main>
    )
}
