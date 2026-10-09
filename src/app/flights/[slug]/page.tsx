import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DemoBanner } from "@/components/DemoBanner";
import { FareList } from "@/components/FareList";
import { PriceCalendar } from "@/components/PriceCalendar";
import { SearchForm } from "@/components/SearchForm";
import { getRouteBySlug, routes } from "@/data/routes";
import { cheapestPerDay, getFareProvider, oldestCheck, upcomingMonths, type Fare } from "@/lib/fares";
import { airlineName, formatCheckedAt, formatMonth, formatZar } from "@/lib/format";
import { site } from "@/config/site";

export const revalidate = 21600; // 6h — matches the cache age of the underlying data
export const dynamicParams = false;

type Params = Promise<{ slug: string }>;

export function generateStaticParams() {
  return routes.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const route = getRouteBySlug((await params).slug);
  if (!route) return {};
  const title = `Cheap flights ${route.origin.city} to ${route.destination.city}`;
  return {
    title,
    description: `Cheapest days to fly ${route.origin.city} (${route.origin.iata}) to ${route.destination.city} (${route.destination.iata}) over the next 3 months, in rand. Compare and book with trusted partners.`,
    alternates: { canonical: `/flights/${route.slug}` },
    openGraph: { title, url: `/flights/${route.slug}` },
  };
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function cheapestWeekday(fares: Fare[]): string | null {
  if (fares.length < 14) return null;
  const sums = new Map<number, { total: number; n: number }>();
  for (const f of fares) {
    const d = new Date(`${f.departDate}T00:00:00Z`).getUTCDay();
    const cur = sums.get(d) ?? { total: 0, n: 0 };
    sums.set(d, { total: cur.total + f.price, n: cur.n + 1 });
  }
  const best = [...sums.entries()].sort((a, b) => a[1].total / a[1].n - b[1].total / b[1].n)[0];
  return DAYS[best[0]];
}

export default async function RoutePage({ params }: { params: Params }) {
  const route = getRouteBySlug((await params).slug);
  if (!route) notFound();

  const provider = getFareProvider();
  const months = upcomingMonths(3);
  const byMonth = await Promise.all(
    months.map(async (m) => ({
      month: m,
      fares: cheapestPerDay(
        await provider.search({ origin: route.origin.iata, destination: route.destination.iata, depart: m, limit: 100 }),
      ),
    })),
  );

  const all = byMonth.flatMap((m) => m.fares);
  const checkedAt = oldestCheck(all);
  const cheapest = [...all].sort((a, b) => a.price - b.price).slice(0, 5);
  const monthMins = byMonth.filter((m) => m.fares.length).map((m) => ({ month: m.month, min: Math.min(...m.fares.map((f) => f.price)) }));
  const bestMonth = [...monthMins].sort((a, b) => a.min - b.min)[0];
  const weekday = cheapestWeekday(all);
  const airlines = [...new Set(all.map((f) => f.airline))].map(airlineName);
  const reverse = routes.find((r) => r.origin.iata === route.destination.iata && r.destination.iata === route.origin.iata);

  const faqs = [
    bestMonth && {
      q: `What is the cheapest month to fly ${route.origin.city} to ${route.destination.city}?`,
      a: `Of the next three months, ${formatMonth(bestMonth.month)} currently has the lowest recent fare we've seen, from ${formatZar(bestMonth.min)} one way. Prices change often, so check the calendar above.`,
    },
    weekday && {
      q: `What is the cheapest day of the week to fly this route?`,
      a: `Across recent fares for the next three months, ${weekday} departures have been cheapest on average.`,
    },
    airlines.length > 0 && {
      q: `Which airlines fly ${route.origin.city} to ${route.destination.city}?`,
      a: `Recent fares we've seen on this route were with ${airlines.join(", ")}. Some airlines may not appear if our partners don't sell their fares.`,
    },
  ].filter(Boolean) as { q: string; a: string }[];

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: site.url },
        { "@type": "ListItem", position: 2, name: "Routes", item: `${site.url}/flights` },
        { "@type": "ListItem", position: 3, name: `${route.origin.city} to ${route.destination.city}`, item: `${site.url}/flights/${route.slug}` },
      ],
    },
    faqs.length > 0 && {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
  ].filter(Boolean);

  return (
    <>
      <DemoBanner />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="mx-auto max-w-5xl px-4 py-8 space-y-10">
        <header className="space-y-2">
          <nav className="text-sm text-ink-soft">
            <Link href="/" className="underline">Home</Link> / <Link href="/flights" className="underline">Routes</Link>
          </nav>
          <h1 className="text-3xl font-semibold tracking-tight">
            Cheap flights {route.origin.city} to {route.destination.city}
          </h1>
          <p className="text-ink-soft">
            {route.origin.name} ({route.origin.iata}) → {route.destination.name} ({route.destination.iata})
            {bestMonth && (
              <>
                {" · "}one way from <span className="font-semibold text-deal">{formatZar(Math.min(...monthMins.map((m) => m.min)))}</span>
              </>
            )}
          </p>
          {checkedAt && (
            <p className="text-xs text-ink-soft">
              Cached partner prices, checked {formatCheckedAt(checkedAt)}. They may have changed; the booking site
              shows the final price.
            </p>
          )}
        </header>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Cheapest dates (one way)</h2>
          <FareList fares={cheapest} sourcePage={`route:${route.slug}`} />
        </section>

        <section className="space-y-6">
          <h2 className="text-xl font-semibold">Price calendar</h2>
          {byMonth.map(({ month, fares }) => (
            <div key={month} className="space-y-2">
              <h3 className="font-medium">{formatMonth(month)}</h3>
              <PriceCalendar fares={fares} month={month} />
            </div>
          ))}
          <p className="text-xs text-ink-soft">Tap a bar to search that day. Green marks the cheapest day of the month.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Search your dates</h2>
          <SearchForm defaultOrigin={route.origin.iata} defaultDestination={route.destination.iata} />
        </section>

        {faqs.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Good to know</h2>
            {faqs.map((f) => (
              <div key={f.q}>
                <h3 className="font-medium">{f.q}</h3>
                <p className="text-ink-soft">{f.a}</p>
              </div>
            ))}
          </section>
        )}

        {reverse && (
          <p>
            Flying the other way?{" "}
            <Link href={`/flights/${reverse.slug}`} className="underline">
              {reverse.origin.city} to {reverse.destination.city}
            </Link>
          </p>
        )}
      </div>
    </>
  );
}
