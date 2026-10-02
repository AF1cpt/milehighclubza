import type { Metadata } from "next";
import { site } from "@/config/site";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: `How ${site.name} handles personal information under POPIA.`,
};

// DRAFT for the MVP. Have this reviewed before you collect emails or phone numbers (deal alerts).
export default function Privacy() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-10 space-y-4 leading-relaxed">
      <h1 className="text-3xl font-semibold tracking-tight">Privacy policy</h1>
      <p className="text-sm text-ink-soft">Last updated: {new Date().toISOString().slice(0, 7)}</p>
      <p>
        {site.name} respects your privacy and processes personal information in line with South Africa&apos;s Protection
        of Personal Information Act (POPIA).
      </p>
      <h2 className="text-xl font-semibold pt-2">What we collect</h2>
      <ul className="list-disc pl-6 space-y-1">
        <li>The searches you run (airports and dates) so we can show results.</li>
        <li>
          When you click through to a partner: the route, dates, price shown, the page you clicked from, your device
          type (mobile, desktop or tablet), the referring page and campaign tags. We do not store your IP address
          with this record.
        </li>
        <li>Your cookie choice, stored in your own browser.</li>
      </ul>
      <p>We don&apos;t ask for your name, email, phone number or payment details. You give those to the partner you book with.</p>
      <h2 className="text-xl font-semibold pt-2">Why</h2>
      <p>To run the site, to measure which pages help people find flights, and to reconcile commissions with partners.</p>
      <h2 className="text-xl font-semibold pt-2">Cookies</h2>
      <p>
        We only use essential storage unless you choose &quot;Accept all&quot;. Partner sites set their own cookies after you
        click through, under their own privacy policies.
      </p>
      <h2 className="text-xl font-semibold pt-2">Your rights</h2>
      <p>
        You can ask what information we hold about you, ask us to correct or delete it, and object to its processing.
        Contact us at {site.contactEmail}. You can also complain to the Information Regulator of South Africa.
      </p>
    </article>
  );
}
