import { Header } from "@/components/layout/Header"
import { Footer } from "@/components/layout/Footer"
import { FrontBackground } from "@/components/layout/FrontBackground"
import LastUpdated from "@/components/legal/LastUpdated"
import BackToTop from "@/components/ui/BackToTop"

export const metadata = {
  title: "Accessibility Statement | Helixa",
  description: "Helixa's commitment to web accessibility and conformity to WCAG 2.2 AA standards.",
}

export default function AccessibilityPage() {
  return (
    <main id="main-content" className="min-h-screen bg-[#09090B] text-white selection:bg-[var(--gold,#D6AE5C)] selection:text-black relative">
      <FrontBackground />
      <Header activeHref="/accessibility" />
      <div className="max-w-3xl mx-auto px-4 py-24 sm:py-32 relative z-10">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-8 tracking-tight text-white">
          Accessibility Statement
        </h1>
        <LastUpdated />

        <div className="prose prose-invert max-w-none space-y-6 text-neutral-300 mt-10 text-sm leading-relaxed">
          <p>
            Helixa is committed to digital accessibility for all operators, including people with disabilities. We continually improve the user experience for everyone and apply the relevant accessibility standards across both our public website and SaaS workspace.
          </p>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">1. Conformance Status</h2>
            <p>
              The Web Content Accessibility Guidelines (WCAG) defines requirements for designers and developers to improve accessibility for people with disabilities. It defines three levels of conformance: Level A, Level AA, and Level AAA.
            </p>
            <p className="mt-2">
              Helixa targets <strong className="text-white">WCAG 2.2 Level AA</strong> conformance. The application enforces semantic HTML landmarks, minimum color contrast ratios (≥4.5:1 for body copy and ≥3:1 for graphical UI components), full keyboard navigability with visible focus indicators, screen reader labeling, and reduced-motion preferences.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">2. Known Limitations & Ongoing Work</h2>
            <p>
              While we strive to ensure comprehensive accessibility across the entire surface of Helixa, we are actively addressing a few known areas:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>
                <strong className="text-white">Visual Flow Builder:</strong> Drag-and-drop workflow canvas nodes currently provide limited linear keyboard navigation. We are developing an accessible list-based alternative mode.
              </li>
              <li>
                <strong className="text-white">Complex Data Visualizations:</strong> Certain comparative charts rendered in RTL (Right-to-Left) Arabic mode are accompanied by raw numeric tables, but screen reader narration of time-series graphs is undergoing optimization.
              </li>
              <li>
                <strong className="text-white">Third-Party Platform Media:</strong> User-generated thumbnail previews imported directly from Meta/Instagram rely on captions provided by the original creator for alt text.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">3. Feedback & Contact Information</h2>
            <p>
              We welcome your feedback on the accessibility of Helixa. If you encounter accessibility barriers, or need accommodation while using our tools, please contact our team:
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>
                <strong className="text-white">Email:</strong>{" "}
                <a href="mailto:support@helixa.app" className="text-[var(--gold,#D6AE5C)] hover:underline">
                  support@helixa.app
                </a>
              </li>
              <li>
                <strong className="text-white">Response Time:</strong> We aim to acknowledge accessibility inquiries within 2 business days.
              </li>
            </ul>
          </section>
        </div>

        <BackToTop />
      </div>

      <Footer />
    </main>
  )
}
