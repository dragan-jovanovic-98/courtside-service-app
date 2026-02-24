import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — Courtside AI",
  description: "Privacy Policy for the Courtside AI platform.",
};

const EFFECTIVE_DATE = "February 24, 2026";

const sections = [
  { id: "introduction", title: "1. Introduction" },
  { id: "information-collected", title: "2. Information We Collect" },
  { id: "how-we-use", title: "3. How We Use Information" },
  { id: "data-sharing", title: "4. Data Sharing & Third Parties" },
  { id: "data-retention", title: "5. Data Retention" },
  { id: "user-rights", title: "6. Your Rights" },
  { id: "data-security", title: "7. Data Security" },
  { id: "lead-data", title: "8. Lead & Contact Data Responsibility" },
  { id: "call-recordings", title: "9. Call Recordings & Transcripts" },
  { id: "children", title: "10. Children's Privacy" },
  { id: "international", title: "11. International Data Transfers" },
  { id: "changes", title: "12. Changes to This Policy" },
  { id: "contact", title: "13. Contact" },
];

export default function PrivacyPolicyPage() {
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
            Privacy Policy
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
          {/* 1 */}
          <section id="introduction">
            <h2 className="text-xl font-semibold text-text-primary">1. Introduction</h2>
            <p>
              This Privacy Policy explains how{" "}
              <strong className="text-text-primary">Courtside AI Inc.</strong> (&ldquo;Courtside
              AI,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;), a corporation
              incorporated under the laws of Ontario, Canada, collects, uses, stores, and shares
              information in connection with the Courtside AI platform and related services
              (the &ldquo;Service&rdquo;).
            </p>
            <p>
              By using the Service, you agree to the collection and use of information as described
              in this Privacy Policy. This Policy should be read alongside our{" "}
              <Link href="/terms" className="text-emerald-light hover:underline">
                Terms of Service
              </Link>
              .
            </p>
          </section>

          {/* 2 */}
          <section id="information-collected">
            <h2 className="text-xl font-semibold text-text-primary">2. Information We Collect</h2>

            <h3 className="mt-4 text-base font-semibold text-text-primary">
              2.1 Account Information
            </h3>
            <p>
              When you create an account, we collect your name, email address, phone number,
              organization name, and business details.
            </p>

            <h3 className="mt-4 text-base font-semibold text-text-primary">
              2.2 Lead & Contact Data
            </h3>
            <p>
              You may upload or enter information about your leads and contacts, including names,
              phone numbers, email addresses, mailing addresses, and other details relevant to your
              campaigns. You are responsible for the lawfulness of the data you upload (see Section
              8).
            </p>

            <h3 className="mt-4 text-base font-semibold text-text-primary">2.3 Call Data</h3>
            <p>
              When calls are made or received through the Service, we collect and store call
              metadata, recordings, transcripts, AI-generated summaries and analysis, call outcomes,
              sentiment analysis, engagement metrics, and any financial or topic-specific details
              extracted during post-call processing.
            </p>

            <h3 className="mt-4 text-base font-semibold text-text-primary">
              2.4 Appointment & Calendar Data
            </h3>
            <p>
              When appointments are booked through the Service, we store appointment details
              including date, time, location, and associated contact information. If you connect a
              Google or Microsoft calendar, we access availability data to facilitate scheduling.
            </p>

            <h3 className="mt-4 text-base font-semibold text-text-primary">
              2.5 Usage & Analytics Data
            </h3>
            <p>
              We automatically collect information about how you interact with the Service,
              including pages viewed, features used, timestamps, browser type, device information,
              and IP address.
            </p>

            <h3 className="mt-4 text-base font-semibold text-text-primary">
              2.6 Payment Information
            </h3>
            <p>
              Payment processing is handled by Stripe. We do not store your credit card numbers or
              full payment credentials. We receive and store limited billing information from Stripe,
              such as the last four digits of your card, billing address, and transaction history.
            </p>
          </section>

          {/* 3 */}
          <section id="how-we-use">
            <h2 className="text-xl font-semibold text-text-primary">
              3. How We Use Information
            </h2>
            <p>We use the information we collect to:</p>
            <ul className="ml-5 list-disc space-y-1">
              <li>Provide, maintain, and improve the Service</li>
              <li>Process and deliver AI voice calls on your behalf</li>
              <li>Generate call analytics, summaries, and action items</li>
              <li>Schedule and manage appointments</li>
              <li>Process billing and payments</li>
              <li>Send transactional communications (confirmations, alerts, notifications)</li>
              <li>Provide customer support</li>
              <li>Improve our AI models and call quality</li>
              <li>Detect and prevent fraud, abuse, and security incidents</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          {/* 4 */}
          <section id="data-sharing">
            <h2 className="text-xl font-semibold text-text-primary">
              4. Data Sharing & Third Parties
            </h2>
            <p>
              We share information with the following categories of third-party service providers,
              solely to operate and deliver the Service:
            </p>
            <ul className="ml-5 list-disc space-y-2">
              <li>
                <strong className="text-text-primary">Retell AI</strong> — processes voice calls,
                generates transcripts and AI analysis
              </li>
              <li>
                <strong className="text-text-primary">Twilio</strong> — provides telephony
                infrastructure and SMS delivery
              </li>
              <li>
                <strong className="text-text-primary">Stripe</strong> — processes payments and
                manages subscriptions
              </li>
              <li>
                <strong className="text-text-primary">SendGrid</strong> — delivers transactional and
                notification emails
              </li>
              <li>
                <strong className="text-text-primary">Google / Microsoft</strong> — calendar
                integration for scheduling (only when you connect your calendar)
              </li>
              <li>
                <strong className="text-text-primary">N8N</strong> — self-hosted workflow
                orchestration for processing webhooks and automations
              </li>
            </ul>
            <p>
              We do not sell, rent, or trade your personal information or your lead/contact data to
              third parties. We may disclose information if required by law, legal process, or
              government request, or to protect the rights, safety, or property of Courtside AI,
              our users, or the public.
            </p>
          </section>

          {/* 5 */}
          <section id="data-retention">
            <h2 className="text-xl font-semibold text-text-primary">5. Data Retention</h2>
            <p>
              We retain your data for as long as your account is active or as needed to provide the
              Service. Specific retention periods:
            </p>
            <ul className="ml-5 list-disc space-y-1">
              <li>
                <strong className="text-text-primary">Account data</strong> — retained while your
                account is active and for up to 30 days after account closure
              </li>
              <li>
                <strong className="text-text-primary">Call recordings and transcripts</strong> —
                retained according to your subscription plan settings; you may delete recordings at
                any time
              </li>
              <li>
                <strong className="text-text-primary">Lead/contact data</strong> — retained while
                your account is active; deleted upon account closure unless required by law
              </li>
              <li>
                <strong className="text-text-primary">Billing records</strong> — retained for up to
                7 years to comply with tax and accounting requirements
              </li>
            </ul>
            <p>
              Upon account termination, we will delete or anonymize your data within 30 days, except
              where retention is required by law or for legitimate business purposes (such as
              resolving disputes or enforcing our Terms).
            </p>
          </section>

          {/* 6 */}
          <section id="user-rights">
            <h2 className="text-xl font-semibold text-text-primary">6. Your Rights</h2>

            <h3 className="mt-4 text-base font-semibold text-text-primary">6.1 General Rights</h3>
            <p>Depending on your jurisdiction, you may have the right to:</p>
            <ul className="ml-5 list-disc space-y-1">
              <li>Access the personal information we hold about you</li>
              <li>Request correction of inaccurate or incomplete information</li>
              <li>Request deletion of your personal information</li>
              <li>Object to or restrict certain processing activities</li>
              <li>Request data portability</li>
              <li>Withdraw consent where processing is based on consent</li>
            </ul>

            <h3 className="mt-4 text-base font-semibold text-text-primary">
              6.2 PIPEDA (Canada)
            </h3>
            <p>
              If you are located in Canada, the Personal Information Protection and Electronic
              Documents Act (PIPEDA) provides you with rights regarding your personal information,
              including the right to access, correct, and challenge compliance. We collect, use, and
              disclose personal information only for purposes that a reasonable person would consider
              appropriate, and we obtain meaningful consent for the collection and use of personal
              information.
            </p>

            <h3 className="mt-4 text-base font-semibold text-text-primary">
              6.3 CCPA (California)
            </h3>
            <p>
              If you are a California resident, you have additional rights under the California
              Consumer Privacy Act (CCPA), including:
            </p>
            <ul className="ml-5 list-disc space-y-1">
              <li>The right to know what personal information we collect and how it is used</li>
              <li>The right to request deletion of your personal information</li>
              <li>
                The right to opt out of the &ldquo;sale&rdquo; of personal information — we do not
                sell personal information
              </li>
              <li>The right to non-discrimination for exercising your privacy rights</li>
            </ul>

            <p className="mt-3">
              To exercise any of these rights, contact us at{" "}
              <a
                href="mailto:contact@court-side.ai"
                className="text-emerald-light hover:underline"
              >
                contact@court-side.ai
              </a>
              . We will respond within the timeframes required by applicable law.
            </p>
          </section>

          {/* 7 */}
          <section id="data-security">
            <h2 className="text-xl font-semibold text-text-primary">7. Data Security</h2>
            <p>
              We implement appropriate technical and organizational measures to protect your
              information, including:
            </p>
            <ul className="ml-5 list-disc space-y-1">
              <li>Encryption of data in transit (TLS) and at rest</li>
              <li>
                Row-Level Security (RLS) policies to enforce strict tenant isolation — each
                organization&apos;s data is accessible only to its authorized members
              </li>
              <li>Access controls and role-based permissions</li>
              <li>Regular security reviews and monitoring</li>
              <li>Secure credential management via environment variables and vault storage</li>
            </ul>
            <p>
              While we strive to protect your information, no method of electronic storage or
              transmission is 100% secure. We cannot guarantee absolute security.
            </p>
          </section>

          {/* 8 */}
          <section id="lead-data">
            <h2 className="text-xl font-semibold text-text-primary">
              8. Lead & Contact Data Responsibility
            </h2>
            <p>
              For lead and contact data uploaded by users, Courtside AI acts as a{" "}
              <strong className="text-text-primary">data processor</strong>. You, the user, are the{" "}
              <strong className="text-text-primary">data controller</strong>.
            </p>
            <p>This means:</p>
            <ul className="ml-5 list-disc space-y-1">
              <li>
                You are responsible for ensuring you have a lawful basis (e.g., consent) to collect,
                store, and use the personal information of your leads and contacts
              </li>
              <li>
                You are responsible for providing any required privacy notices to your contacts
              </li>
              <li>
                You are responsible for responding to data subject access requests from your contacts
              </li>
              <li>
                Courtside AI processes lead/contact data only on your instructions and solely to
                provide the Service
              </li>
            </ul>
          </section>

          {/* 9 */}
          <section id="call-recordings">
            <h2 className="text-xl font-semibold text-text-primary">
              9. Call Recordings & Transcripts
            </h2>
            <p>
              Call recordings and transcripts are generated by our voice AI partner, Retell AI, and
              stored within the Courtside AI platform. You are responsible for:
            </p>
            <ul className="ml-5 list-disc space-y-1">
              <li>
                Disclosing to call recipients that calls may be recorded, where required by
                applicable law (many jurisdictions require all-party or one-party consent for
                recording)
              </li>
              <li>
                Disclosing that the caller is an AI agent, where required by applicable law
              </li>
              <li>
                Ensuring that call recordings are used in compliance with all applicable privacy and
                data protection laws
              </li>
            </ul>
            <p>
              Call recordings, transcripts, and AI-generated analysis are accessible only to
              authorized members of your organization within the Service.
            </p>
          </section>

          {/* 10 */}
          <section id="children">
            <h2 className="text-xl font-semibold text-text-primary">10. Children&apos;s Privacy</h2>
            <p>
              The Service is not intended for individuals under the age of 18. We do not knowingly
              collect personal information from children. If we become aware that we have collected
              information from a child under 18, we will take steps to delete such information
              promptly.
            </p>
          </section>

          {/* 11 */}
          <section id="international">
            <h2 className="text-xl font-semibold text-text-primary">
              11. International Data Transfers
            </h2>
            <p>
              Your information may be transferred to, stored, and processed in Canada, the United
              States, or other countries where our service providers operate. By using the Service,
              you consent to the transfer of your information to countries outside your country of
              residence, which may have different data protection laws. We take steps to ensure that
              your information receives an adequate level of protection in the jurisdictions in which
              we process it.
            </p>
          </section>

          {/* 12 */}
          <section id="changes">
            <h2 className="text-xl font-semibold text-text-primary">
              12. Changes to This Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time. We will provide at least 30
              days&apos; notice of material changes via email or in-app notification. The
              &ldquo;Last updated&rdquo; date at the top of this page indicates when the Policy was
              last revised. Your continued use of the Service after the effective date of the revised
              Policy constitutes acceptance of the changes.
            </p>
          </section>

          {/* 13 */}
          <section id="contact">
            <h2 className="text-xl font-semibold text-text-primary">13. Contact</h2>
            <p>
              If you have questions about this Privacy Policy or wish to exercise your data rights,
              please contact us at:
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
            <Link href="/terms" className="text-emerald-light hover:underline">
              &larr; Terms of Service
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
