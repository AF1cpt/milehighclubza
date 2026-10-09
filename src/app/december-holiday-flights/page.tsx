import type { Metadata } from "next";
import Link from "next/link";
import { AddonOffers } from "@/components/AddonOffers";
import { DemoBanner } from "@/components/DemoBanner";
import { FareList } from "@/components/FareList";
import { getAirport } from "@/data/airports";
import { festivePairs, schoolSummerBreak } from "@/data/festive";
import { routeSlug } from "@/data/routes";
import { enabledPartners } from "@/lib/deeplinks";
import { getFareProvider, oldestCheck, type Fare } from "@/lib/fares";
import { cheapestInWindow, festiveHolidays, festiveSeason, type DateWindow, type FestiveSeason } from "@/lib/festive";
import { formatCheckedAt, formatDay, formatZar } from "@/lib/format";
import { site } from "@/config/site";

// Fully static: rebuilt with fresh fares every 6h by the scheduled deploy (.github/workflows/deploy.yml).
export const revalidate = false;

const PATH = "/december-holiday-flights";

export function generateMetadata(): Metadata {
  const { year } = festiveSeason();
  const title = `Cheap flights for the December holidays ${year}`;
  return {
    title,
    description: `The cheapest days to fly out before Christmas and home after New Year ${year}/${String(year + 1).slice(2)}: Johannesburg, Cape Town, Durban, Gqeberha, George and more, in rand.`,
    alternates: { canonical: PATH },
    openGraph: { title, url: PATH },
  };
}

function windowLabel(w: DateWindow): string {
  return `${formatDay(w.from)} – ${formatDay(w.to)}`;
}

async function loadPair([a, b]: [string, string], season: FestiveSeason) {
  const from = getAirport(a)!;
  const to = getAirport(b)!;
  const provider = getFareProvider();
  const fetchMonths = async (o: string, d: string, months: string[]) =>
    (await Promise.all(months.map((m) => provider.search({ origin: o, destination: d, depart: m, limit: 100 })))).flat();
  const [outFares, homeFares] = await Promise.all([
    fetchMonths(a, b, season.months.out),
    fetchMonths(b, a, season.months.home),
  ]);
  return {
    from,
    to,
    out: cheapestInWindow(outFares, season.out, 3),
    home: cheapestInWindow(homeFares, season.home, 3),
  };
}

export default async function DecemberHolidayFlights() {
  const season = festiveSeason();
  const { year } = season;
  const pairs = await Promise.all(festivePairs.map((p) => loadPair(p, season)));
  const partners = enabledPartners();
  const checkedAt = oldestCheck(pairs.flatMap((p) => [...p.out, ...p.home]));
  const holidays = festiveHolidays(year);
  const school = schoolSummerBreak[year];

  const faqs = pairs
    .flatMap(({ from, to, out, home }) => [
      out[0] && {
        q: `What's the cheapest day to fly ${from.city} to ${to.city} before Christmas ${year}?`,
        a: answer(out[0], `between ${windowLabel(season.out)}`),
      },
      home[0] && {
        q: `What's the cheapest day to fly home from ${to.city} to ${from.city} after New Year?`,
        a: answer(home[0], `between ${windowLabel(season.home)}`),
      },
    ])
    .filter(Boolean) as { q: string; a: string }[];

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: site.url },
        { "@type": "ListItem", position: 2, name: `December holiday flights ${year}`, item: `${site.url}${PATH}` },
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
            <Link href="/" className="underline">Home</Link>
          </nav>
          <h1 className="text-3xl font-semibold tracking-tight">Cheap flights for the December holidays {year}</h1>
          <p className="text-ink-soft max-w-2xl">
            The cheapest days we&apos;ve seen to fly out before Christmas ({windowLabel(season.out)}) and home after New
            Year ({windowLabel(season.home)}), one way, in rand.
          </p>
          {checkedAt && (
            <p className="text-xs text-ink-soft">
              Cached partner prices, checked {formatCheckedAt(checkedAt)}. They may have changed; the booking site shows
              the final price.
            </p>
          )}
        </header>

        <section className="rounded-xl border border-line bg-sky p-4 sm:p-5 space-y-3">
          <h2 className="text-lg font-semibold">Key dates</h2>
          <ul className="grid gap-2 sm:grid-cols-2 text-sm">
            {school && (
              <>
                <li>
                  <span className="font-medium">Schools close:</span> {formatDay(school.lastDay)} is the last day for
                  public school learners
                </li>
                <li>
                  <span className="font-medium">Schools reopen:</span> {formatDay(school.backOn)}
                </li>
              </>
            )}
            {holidays.map((h) => (
              <li key={h.date}>
                <span className="font-medium">{h.name}:</span> {formatDay(h.date)}
                {h.longWeekend && " · long weekend"}
                {h.note && <span className="block text-ink-soft">{h.note}</span>}
              </li>
            ))}
          </ul>
        </section>

        {pairs.map(({ from, to, out, home }) => (
          <section key={`${from.iata}-${to.iata}`} className="space-y-4">
            <h2 className="text-xl font-semibold">
              {from.city} ⇄ {to.city}
            </h2>
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-3">
                <h3 className="font-medium">
                  Fly out: {from.city} → {to.city}
                </h3>
                <FareList fares={out} partners={partners} sourcePage={`festive:${from.iata}-${to.iata}:out`} />
              </div>
              <div className="space-y-3">
                <h3 className="font-medium">
                  Fly home: {to.city} → {from.city}
                </h3>
                <FareList fares={home} partners={partners} sourcePage={`festive:${from.iata}-${to.iata}:home`} />
              </div>
            </div>
            <AddonOffers from={from} to={to} sourcePage={`festive:${from.iata}-${to.iata}`} level={3} />
            <p className="text-sm">
              Other dates:{" "}
              <Link href={`/flights/${routeSlug(from, to)}`} className="underline">
                {from.city} to {to.city}
              </Link>{" "}
              ·{" "}
              <Link href={`/flights/${routeSlug(to, from)}`} className="underline">
                {to.city} to {from.city}
              </Link>
            </p>
          </section>
        ))}

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
      </div>
    </>
  );
}

function answer(f: Fare, window: string): string {
  return `Of the recent fares we've seen for departures ${window}, ${formatDay(f.departDate)} is cheapest, from ${formatZar(f.price)} one way. Prices change often, so check before you book.`;
}
