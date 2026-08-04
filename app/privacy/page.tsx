import { Header } from "@/components/layout/Header"
import { Footer } from "@/components/layout/Footer"

export default function PrivacyPage() {
    return (
        <main className="min-h-screen bg-black text-white selection:bg-[#ffe14d] selection:text-black">
            <Header />
            <div className="max-w-3xl mx-auto px-4 py-24 sm:py-32">
                <h1 className="text-4xl md:text-5xl font-serif-display mb-8 tracking-tight">Privacy Policy</h1>
                
                <div className="prose prose-invert max-w-none space-y-6 text-neutral-300">
                    <p>Last updated: {new Date().toLocaleDateString()}</p>
                    
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">1. Information We Collect</h2>
                        <p>We collect information you provide directly to us when you create an account, connect your social media platforms, or interact with our services. This includes:</p>
                        <ul className="list-disc pl-6 space-y-2 mt-2">
                            <li>Account information (email, name)</li>
                            <li>Social media connection tokens (e.g., Instagram Graph API)</li>
                            <li>Usage data and automation configurations</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">2. How We Use Your Information</h2>
                        <p>We use the information we collect to:</p>
                        <ul className="list-disc pl-6 space-y-2 mt-2">
                            <li>Provide, maintain, and improve our automation services</li>
                            <li>Process your transactions and manage your billing</li>
                            <li>Send you technical notices and support messages</li>
                            <li>Communicate with connected social platforms on your behalf</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">3. Data Security</h2>
                        <p>We implement appropriate technical and organizational measures to protect the security of your personal information. However, please note that no method of transmission over the Internet is 100% secure.</p>
                    </section>
                </div>
            </div>
            <Footer />
        </main>
    )
}
