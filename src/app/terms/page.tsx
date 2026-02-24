import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service — Courtside AI",
  description: "Terms of Service for the Courtside AI platform.",
};

const EFFECTIVE_DATE = "February 24, 2026";

const sections = [
  { id: "acceptance", title: "1. Acceptance of Terms" },
  { id: "service-description", title: "2. Service Description" },
  { id: "account-eligibility", title: "3. Account & Eligibility" },
  { id: "user-responsibilities", title: "4. User Responsibilities & Compliance" },
  { id: "acceptable-use", title: "5. Acceptable Use" },
  { id: "billing", title: "6. Billing & Payment" },
  { id: "intellectual-property", title: "7. Intellectual Property" },
  { id: "data-privacy", title: "8. Data & Privacy" },
  { id: "third-party", title: "9. Third-Party Services" },
  { id: "disclaimer", title: "10. Disclaimer of Warranties" },
  { id: "limitation", title: "11. Limitation of Liability" },
  { id: "indemnification", title: "12. Indemnification" },
  { id: "arbitration", title: "13. Mandatory Arbitration" },
  { id: "termination", title: "14. Termination" },
  { id: "modifications", title: "15. Modifications" },
  { id: "governing-law", title: "16. Governing Law" },
  { id: "contact", title: "17. Contact" },
];

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-bg-main text-text-primary">
      <div className="mx-auto max-w-[720px] px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="text-sm text-text-muted hover:text-emerald-light transition-colors"
          >
            &larr; Back to Courtside AI
          </Link>
          <h1 className="mt-4 font-[family-name:var(--font-lora)] text-3xl font-semibold text-text-primary">
            Terms of Service
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            Effective date: {EFFECTIVE_DATE} &middot; Last updated: {EFFECTIVE_DATE}
          </p>
        </div>

        {/* Table of Contents */}
        <nav className="mb-10 rounded-lg border border-border-default bg-surface-card p-5">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-text-dim">
            Table of Contents
          </h2>
          <ol className="columns-1 gap-x-6 space-y-1 text-sm sm:columns-2">
            {sections.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="text-text-muted hover:text-emerald-light transition-colors"
                >
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {/* Content */}
        <div className="prose-dark space-y-8 text-[15px] leading-relaxed text-text-muted">
          <p>
            These Terms of Service (&ldquo;Terms&rdquo;) constitute a legally binding agreement
            between you (&ldquo;User,&rdquo; &ldquo;you,&rdquo; or &ldquo;your&rdquo;) and{" "}
            <strong className="text-text-primary">Courtside AI Inc.</strong>, a corporation
            incorporated under the laws of Ontario, Canada (&ldquo;Courtside AI,&rdquo;
            &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;), governing your access to
            and use of the Courtside AI platform, website, and related services (collectively, the
            &ldquo;Service&rdquo;).
          </p>

          {/* 1 */}
          <section id="acceptance">
            <h2 className="text-xl font-semibold text-text-primary">1. Acceptance of Terms</h2>
            <p>
              By creating an account, accessing, or using the Service, you acknowledge that you have
              read, understood, and agree to be bound by these Terms and our{" "}
              <Link href="/privacy" className="text-emerald-light hover:underline">
                Privacy Policy
              </Link>
              . If you are using the Service on behalf of a business or other legal entity, you
              represent that you have the authority to bind that entity to these Terms. If you do not
              agree to these Terms, you must not use the Service.
            </p>
          </section>

          {/* 2 */}
          <section id="service-description">
            <h2 className="text-xl font-semibold text-text-primary">2. Service Description</h2>
            <p>
              Courtside AI is an AI-powered voice agent platform designed for financial services
              professionals, including mortgage brokers, insurance agents, and similar practitioners.
              The Service enables users to:
            </p>
            <ul className="ml-5 list-disc space-y-1">
              <li>Create and manage AI voice agents for outbound and inbound calling</li>
              <li>Upload and manage lead/contact databases</li>
              <li>Launch and manage calling campaigns</li>
              <li>Book appointments via AI-driven conversations</li>
              <li>Access post-call analytics, summaries, and action items</li>
              <li>Integrate with calendars and third-party services</li>
            </ul>
            <p>
              Courtside AI is a technology platform. We do not provide legal, financial, regulatory,
              or compliance advice. The Service is a tool that operates under your direction and
              control.
            </p>
          </section>

          {/* 3 */}
          <section id="account-eligibility">
            <h2 className="text-xl font-semibold text-text-primary">3. Account & Eligibility</h2>
            <p>To use the Service, you must:</p>
            <ul className="ml-5 list-disc space-y-1">
              <li>Be at least 18 years of age</li>
              <li>Operate a valid, legally registered business or professional practice</li>
              <li>Provide accurate and complete registration information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Promptly notify us of any unauthorized use of your account</li>
            </ul>
            <p>
              You are fully responsible for all activities that occur under your account, including
              actions taken by team members you invite to your organization.
            </p>
          </section>

          {/* 4 */}
          <section id="user-responsibilities">
            <h2 className="text-xl font-semibold text-text-primary">
              4. User Responsibilities & Compliance
            </h2>
            <p className="font-semibold text-text-primary">
              This section is critical. By using Courtside AI, you acknowledge and agree to the
              following:
            </p>

            <h3 className="mt-4 text-base font-semibold text-text-primary">
              4.1 Consent & Telemarketing Compliance
            </h3>
            <p>
              You are solely responsible for obtaining all necessary prior express consent from every
              contact before any AI-initiated call, text message, or communication is made on your
              behalf. This includes, without limitation, compliance with:
            </p>
            <ul className="ml-5 list-disc space-y-1">
              <li>
                <strong className="text-text-primary">TCPA</strong> (Telephone Consumer Protection
                Act, United States) — including prior express written consent for telemarketing calls
                and prerecorded/artificial voice messages
              </li>
              <li>
                <strong className="text-text-primary">CRTC Unsolicited Telecommunications Rules</strong>{" "}
                and <strong className="text-text-primary">CASL</strong> (Canada&apos;s Anti-Spam
                Legislation, Canada)
              </li>
              <li>
                <strong className="text-text-primary">National and state/provincial Do Not Call
                (DNC) lists</strong>, including the US National DNC Registry and Canada&apos;s NDNCL
              </li>
              <li>All applicable federal, state, provincial, and local telemarketing laws</li>
            </ul>

            <h3 className="mt-4 text-base font-semibold text-text-primary">
              4.2 Data Accuracy & Lawful Basis
            </h3>
            <p>
              You represent and warrant that all data you upload to the Service (including leads,
              contacts, phone numbers, email addresses, and any other personal information) has been
              collected lawfully and that you have a valid legal basis for its use. You must not
              upload data you do not have the right to use.
            </p>

            <h3 className="mt-4 text-base font-semibold text-text-primary">
              4.3 Industry-Specific Regulations
            </h3>
            <p>
              If you operate in a regulated industry, you are solely responsible for ensuring your
              use of the Service complies with all applicable industry-specific regulations,
              including but not limited to FINRA rules, state and provincial insurance commission
              regulations, mortgage licensing requirements, and any other regulatory obligations
              applicable to your business.
            </p>

            <h3 className="mt-4 text-base font-semibold text-text-primary">
              4.4 Call Content & Disclosure
            </h3>
            <p>
              You are responsible for the content and conduct of all calls made through the Service
              on your behalf, including ensuring that call recipients are informed they are speaking
              with an AI agent where required by law. Courtside AI does not monitor or screen call
              content in real time.
            </p>

            <h3 className="mt-4 text-base font-semibold text-text-primary">
              4.5 Opt-Out & DNC Requests
            </h3>
            <p>
              You must honor all opt-out and Do Not Call requests promptly and maintain your own
              internal DNC list. Failure to honor such requests may result in immediate suspension of
              your account.
            </p>

            <h3 className="mt-4 text-base font-semibold text-text-primary">
              4.6 Platform Role Disclaimer
            </h3>
            <p>
              Courtside AI is a technology provider. We provide the tools; you direct how they are
              used.{" "}
              <strong className="text-text-primary">
                Courtside AI is not responsible for your compliance failures, regulatory violations,
                or any claims arising from your use of the Service.
              </strong>
            </p>
          </section>

          {/* 5 */}
          <section id="acceptable-use">
            <h2 className="text-xl font-semibold text-text-primary">5. Acceptable Use</h2>
            <p>You agree not to use the Service to:</p>
            <ul className="ml-5 list-disc space-y-1">
              <li>Engage in spam, unsolicited communications, or robocalling in violation of law</li>
              <li>Conduct fraudulent, deceptive, or misleading activities</li>
              <li>Harass, threaten, or abuse any person</li>
              <li>Violate any applicable law, regulation, or third-party rights</li>
              <li>Transmit malware, viruses, or harmful code</li>
              <li>Attempt to gain unauthorized access to the Service or its infrastructure</li>
              <li>Resell or redistribute the Service without authorization</li>
              <li>Impersonate any person or entity</li>
            </ul>
            <p>
              We reserve the right to suspend or terminate your account immediately if we reasonably
              believe you are in violation of this section.
            </p>
          </section>

          {/* 6 */}
          <section id="billing">
            <h2 className="text-xl font-semibold text-text-primary">6. Billing & Payment</h2>
            <ul className="ml-5 list-disc space-y-1">
              <li>
                The Service is offered on a monthly subscription basis with additional usage-based
                charges (e.g., per-call minutes, per-SMS).
              </li>
              <li>
                Subscriptions auto-renew at the end of each billing period unless cancelled before
                the renewal date.
              </li>
              <li>All payments are processed by Stripe. You agree to Stripe&apos;s terms of service.</li>
              <li>
                Fees are non-refundable unless otherwise required by applicable law.
              </li>
              <li>
                We reserve the right to change pricing with 30 days&apos; advance notice. Continued
                use after a price change constitutes acceptance.
              </li>
              <li>
                Failure to pay may result in suspension or termination of your account and access to
                the Service.
              </li>
            </ul>
          </section>

          {/* 7 */}
          <section id="intellectual-property">
            <h2 className="text-xl font-semibold text-text-primary">7. Intellectual Property</h2>
            <p>
              Courtside AI and its licensors retain all rights, title, and interest in and to the
              Service, including all software, algorithms, models, interfaces, trademarks, and
              documentation. Nothing in these Terms transfers any intellectual property rights to
              you.
            </p>
            <p>
              You retain all rights to the data and content you upload to or create through the
              Service (&ldquo;User Content&rdquo;). You grant Courtside AI a limited, non-exclusive
              license to use your User Content solely to provide and improve the Service.
            </p>
          </section>

          {/* 8 */}
          <section id="data-privacy">
            <h2 className="text-xl font-semibold text-text-primary">8. Data & Privacy</h2>
            <p>
              Your use of the Service is subject to our{" "}
              <Link href="/privacy" className="text-emerald-light hover:underline">
                Privacy Policy
              </Link>
              , which describes how we collect, use, store, and share information. By using the
              Service, you consent to our data practices as described in the Privacy Policy.
            </p>
          </section>

          {/* 9 */}
          <section id="third-party">
            <h2 className="text-xl font-semibold text-text-primary">9. Third-Party Services</h2>
            <p>
              The Service integrates with and relies upon third-party services, including but not
              limited to:
            </p>
            <ul className="ml-5 list-disc space-y-1">
              <li>
                <strong className="text-text-primary">Retell AI</strong> — AI voice call processing
                and conversation
              </li>
              <li>
                <strong className="text-text-primary">Twilio</strong> — telephony infrastructure and
                SMS delivery
              </li>
              <li>
                <strong className="text-text-primary">Stripe</strong> — payment processing
              </li>
              <li>
                <strong className="text-text-primary">SendGrid</strong> — email delivery
              </li>
              <li>
                <strong className="text-text-primary">Google / Microsoft</strong> — calendar
                integration (when connected by User)
              </li>
            </ul>
            <p>
              These third-party services are provided &ldquo;as is.&rdquo; Courtside AI is not
              responsible for the availability, accuracy, or performance of third-party services, and
              your use of such services may be subject to their own terms and policies.
            </p>
          </section>

          {/* 10 */}
          <section id="disclaimer">
            <h2 className="text-xl font-semibold text-text-primary">
              10. Disclaimer of Warranties
            </h2>
            <p className="uppercase text-xs tracking-wide font-semibold text-text-primary">
              THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; WITHOUT
              WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED.
            </p>
            <p>
              To the fullest extent permitted by law, Courtside AI disclaims all warranties,
              including but not limited to implied warranties of merchantability, fitness for a
              particular purpose, non-infringement, and any warranties arising out of course of
              dealing or usage of trade.
            </p>
            <p>
              Without limiting the foregoing, Courtside AI does not warrant or guarantee that:
            </p>
            <ul className="ml-5 list-disc space-y-1">
              <li>The Service will be uninterrupted, error-free, or secure</li>
              <li>AI voice agents will achieve any specific call outcomes, conversion rates, or appointment bookings</li>
              <li>Lead data or call analytics will be accurate or complete</li>
              <li>The Service will comply with laws specific to your jurisdiction or industry</li>
            </ul>
          </section>

          {/* 11 */}
          <section id="limitation">
            <h2 className="text-xl font-semibold text-text-primary">
              11. Limitation of Liability
            </h2>
            <p className="uppercase text-xs tracking-wide font-semibold text-text-primary">
              TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW:
            </p>
            <ul className="ml-5 list-disc space-y-1">
              <li>
                Courtside AI&apos;s total aggregate liability for any claims arising out of or related to
                these Terms or the Service shall not exceed the total fees paid by you to Courtside
                AI in the twelve (12) months immediately preceding the event giving rise to the
                claim.
              </li>
              <li>
                In no event shall Courtside AI be liable for any indirect, incidental, special,
                consequential, or punitive damages, including but not limited to loss of profits,
                revenue, data, business opportunities, or goodwill, regardless of the theory of
                liability.
              </li>
              <li>
                Courtside AI shall not be liable for any damages, fines, penalties, or losses
                arising from your failure to comply with applicable laws, regulations, or these
                Terms.
              </li>
            </ul>
          </section>

          {/* 12 */}
          <section id="indemnification">
            <h2 className="text-xl font-semibold text-text-primary">12. Indemnification</h2>
            <p>
              You agree to indemnify, defend, and hold harmless Courtside AI, its officers,
              directors, employees, agents, and affiliates from and against any and all claims,
              liabilities, damages, losses, costs, and expenses (including reasonable attorneys&apos;
              fees) arising out of or related to:
            </p>
            <ul className="ml-5 list-disc space-y-1">
              <li>Your use of the Service</li>
              <li>Your User Content or data you upload to the Service</li>
              <li>Your violation of these Terms</li>
              <li>
                Your violation of any applicable law, regulation, or third-party rights, including
                but not limited to telemarketing laws, privacy laws, and DNC regulations
              </li>
              <li>
                Any claims brought by persons contacted through the Service on your behalf
              </li>
              <li>
                Any regulatory action, investigation, or enforcement proceeding related to your use
                of the Service
              </li>
            </ul>
            <p>
              This indemnification obligation survives termination of these Terms and your use of
              the Service.
            </p>
          </section>

          {/* 13 */}
          <section id="arbitration">
            <h2 className="text-xl font-semibold text-text-primary">
              13. Mandatory Arbitration & Class Action Waiver
            </h2>
            <p>
              <strong className="text-text-primary">Binding Arbitration.</strong> Any dispute,
              controversy, or claim arising out of or relating to these Terms or the Service shall be
              resolved by binding arbitration administered in accordance with the arbitration laws of
              Ontario, Canada. The arbitration shall be conducted in Toronto, Ontario, by a single
              arbitrator. The language of arbitration shall be English.
            </p>
            <p>
              <strong className="text-text-primary">Class Action Waiver.</strong> You and Courtside
              AI agree that any dispute resolution proceedings will be conducted only on an
              individual basis and not in a class, consolidated, or representative action. You
              expressly waive any right to participate in a class action lawsuit or class-wide
              arbitration.
            </p>
            <p>
              <strong className="text-text-primary">Exceptions.</strong> Either party may seek
              injunctive or other equitable relief in a court of competent jurisdiction in Ontario,
              Canada, for matters related to intellectual property rights or unauthorized access to
              the Service.
            </p>
          </section>

          {/* 14 */}
          <section id="termination">
            <h2 className="text-xl font-semibold text-text-primary">14. Termination</h2>
            <p>
              Either party may terminate these Terms at any time. You may cancel your subscription
              and close your account through the Service settings or by contacting us.
            </p>
            <p>
              Courtside AI may suspend or terminate your access immediately, without prior notice,
              if we reasonably believe you have violated these Terms, engaged in unlawful activity,
              or pose a risk to the Service or other users.
            </p>
            <p>
              Upon termination, your right to use the Service ceases immediately. We may retain your
              data for a reasonable period as described in our{" "}
              <Link href="/privacy" className="text-emerald-light hover:underline">
                Privacy Policy
              </Link>
              . Sections that by their nature should survive termination will survive, including but
              not limited to Sections 4, 7, 10, 11, 12, 13, and 16.
            </p>
          </section>

          {/* 15 */}
          <section id="modifications">
            <h2 className="text-xl font-semibold text-text-primary">15. Modifications</h2>
            <p>
              We may update these Terms from time to time. We will provide at least 30 days&apos;
              notice of material changes via email or in-app notification. Your continued use of the
              Service after the effective date of the revised Terms constitutes acceptance of the
              changes.
            </p>
          </section>

          {/* 16 */}
          <section id="governing-law">
            <h2 className="text-xl font-semibold text-text-primary">16. Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of the
              Province of Ontario and the federal laws of Canada applicable therein, without regard
              to conflict of law principles. Subject to the arbitration clause above, the courts of
              Ontario, Canada, shall have exclusive jurisdiction over any matters not subject to
              arbitration.
            </p>
          </section>

          {/* 17 */}
          <section id="contact">
            <h2 className="text-xl font-semibold text-text-primary">17. Contact</h2>
            <p>
              If you have questions about these Terms, please contact us at:
            </p>
            <p>
              <strong className="text-text-primary">Courtside AI Inc.</strong>
              <br />
              Email:{" "}
              <a
                href="mailto:contact@court-side.ai"
                className="text-emerald-light hover:underline"
              >
                contact@court-side.ai
              </a>
            </p>
          </section>

          {/* Footer nav */}
          <div className="mt-12 flex items-center justify-between border-t border-border-default pt-6 text-sm">
            <Link href="/privacy" className="text-emerald-light hover:underline">
              Privacy Policy &rarr;
            </Link>
            <a href="#" className="text-text-dim hover:text-text-muted transition-colors">
              Back to top &uarr;
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
