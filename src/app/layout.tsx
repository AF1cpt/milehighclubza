import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/config/site";
import { CookieConsent } from "@/components/CookieConsent";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: `${site.name} — ${site.tagline}`, template: `%s | ${site.name}` },
  description: site.description,
  openGraph: { siteName: site.name, locale: "en_ZA", type: "website" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-ZA">
      <body className="antialiased min-h-screen flex flex-col">
        <header className="border-b border-line">
          <nav className="mx-auto max-w-5xl px-4 h-14 flex items-center justify-between gap-4">
            <Link href="/" className="font-semibold text-lg tracking-tight">
              {site.name}
            </Link>
            <div className="flex gap-4 sm:gap-5 text-sm text-ink-soft whitespace-nowrap">
              <Link href="/flights" className="hover:text-ink">Routes</Link>
              <Link href="/how-we-make-money" className="hover:text-ink">
                <span className="sm:hidden">How we earn</span>
                <span className="hidden sm:inline">How we make money</span>
              </Link>
            </div>
          </nav>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="border-t border-line mt-16">
          <div className="mx-auto max-w-5xl px-4 py-8 text-sm text-ink-soft space-y-3">
            <p>
              {site.name} compares recently found fares and sends you to partner sites to book. We may earn a
              commission when you book through our links, at no extra cost to you.{" "}
              <Link href="/how-we-make-money" className="underline">Learn more</Link>.
            </p>
            <p>
              Prices are cached from partner searches and can change. The final price is always the one shown on
              the booking site.
            </p>
            <div className="flex gap-4">
              <Link href="/privacy" className="underline">Privacy</Link>
              <Link href="/how-we-make-money" className="underline">Affiliate disclosure</Link>
              <span>© {new Date().getFullYear()} {site.name}</span>
            </div>
          </div>
        </footer>
        <CookieConsent />
      </body>
    </html>
  );
}
