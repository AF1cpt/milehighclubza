import type { Metadata } from "next";
import Link from "next/link";
import { DemoBanner } from "@/components/DemoBanner";
import { FareList } from "@/components/FareList";
import { SearchForm } from "@/components/SearchForm";
import { getAirport } from "@/data/airports";
import { routeSlug, routes } from "@/data/routes";
import { getFareProvider } from "@/lib/fares";
import { formatDay } from "@/lib/format";

export const metadata: Metadata = {
  title: "Search results",
  robots: { index: false, follow: true },
};

const DATE = /^\d{4}-\d{2}-\d{2}$/;

type SP = Promise<Record<string, string | string[] | undefined>>;

function one(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function SearchPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const origin = getAirport(one(sp.o) ?? "");
  const destination = getAirport(one(sp.d) ?? "");
  const dep = one(sp.dep);
  const ret = one(sp.ret);

  const valid = origin && destination && origin.iata !== destination.iata && dep && DATE.test(dep) && (!ret || DATE.test(ret));

  if (!valid) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 space-y-6">
        <h1 className="text-2xl font-semibold">Search flights</h1>
        <p className="text-ink-soft">That search didn&apos;t look right. Try again:</p>
        <SearchForm />
      </div>
    );
  }

  const provider = getFareProvider();
  const [exact, month] = await Promise.all([
    provider.search({ origin: origin.iata, destination: destination.iata, depart: dep, ret, limit: 10 }),
    provider.search({
      origin: origin.iata,
      destination: destination.iata,
      depart: dep.slice(0, 7),
      ret: ret ? ret.slice(0, 7) : undefined,
      limit: 10,
    }),
  ]);

  const seen = new Set(exact.map((f) => `${f.departDate}|${f.returnDate}|${f.airline}`));
  const flexible = month.filter((f) => !seen.has(`${f.departDate}|${f.returnDate}|${f.airline}`)).slice(0, 8);
  const hasRoutePage = routes.some((r) => r.origin.iata === origin.iata && r.destination.iata === destination.iata);
  const source = `search:${origin.iata}-${destination.iata}`;
  const allPrices = [...exact, ...flexible].map((f) => f.price);
  const cheapestOverall = allPrices.length ? Math.min(...allPrices) : undefined;

  return (
    <>
      <DemoBanner />
      <div className="mx-auto max-w-5xl px-4 py-8 space-y-8">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">
            {origin.city} → {destination.city}
          </h1>
          <p className="text-ink-soft">
            {formatDay(dep)}
            {ret ? ` – ${formatDay(ret)}` : " · one way"}
            {hasRoutePage && (
              <>
                {" · "}
                <Link className="underline" href={`/flights/${routeSlug(origin, destination)}`}>
                  Cheapest days this season
                </Link>
              </>
            )}
          </p>
        </div>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Your dates</h2>
          <FareList fares={exact} sourcePage={source} cheapestOverall={cheapestOverall} />
        </section>

        {flexible.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Cheaper if you&apos;re flexible this month</h2>
            <FareList fares={flexible} sourcePage={`${source}:flex`} cheapestOverall={cheapestOverall} />
          </section>
        )}

        <details className="rounded-xl border border-line p-4">
          <summary className="cursor-pointer font-medium">Change search</summary>
          <div className="pt-4">
            <SearchForm defaultOrigin={origin.iata} defaultDestination={destination.iata} />
          </div>
        </details>
      </div>
    </>
  );
}
