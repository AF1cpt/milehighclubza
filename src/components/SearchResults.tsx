"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getAirport } from "@/data/airports";
import { routeSlug, routes } from "@/data/routes";
import type { Partner } from "@/lib/deeplinks";
import { parseSearch, searchQuery, type SearchResult } from "@/lib/fares/search";
import { formatDay } from "@/lib/format";
import { DemoNotice } from "./DemoNotice";
import { FareList } from "./FareList";
import { SearchForm } from "./SearchForm";

type ApiResponse = SearchResult & { demo: boolean; partners: Partner[] };
type State = { query: string; data?: ApiResponse; failed?: boolean };

/** Search results, fetched from /api/fares. The page itself is static so it costs almost no server CPU. */
export function SearchResults() {
  const sp = useSearchParams();
  const params = parseSearch({ o: sp.get("o"), d: sp.get("d"), dep: sp.get("dep"), ret: sp.get("ret") });
  const query = params ? searchQuery(params) : null;
  const [state, setState] = useState<State | null>(null);

  useEffect(() => {
    if (!query) return;
    let cancelled = false;
    fetch(`/api/fares?${query}`)
      .then((r) => (r.ok ? (r.json() as Promise<ApiResponse>) : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data) => !cancelled && setState({ query, data }))
      .catch(() => !cancelled && setState({ query, failed: true }));
    return () => {
      cancelled = true;
    };
  }, [query]);

  if (!params || !query) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 space-y-6">
        <h1 className="text-2xl font-semibold">Search flights</h1>
        <p className="text-ink-soft">That search didn&apos;t look right. Try again:</p>
        <SearchForm />
      </div>
    );
  }

  const origin = getAirport(params.origin)!;
  const destination = getAirport(params.destination)!;
  const hasRoutePage = routes.some((r) => r.origin.iata === origin.iata && r.destination.iata === destination.iata);
  const source = `search:${origin.iata}-${destination.iata}`;
  // Ignore a response that belongs to the previous search while the new one loads.
  const current = state?.query === query ? state : null;

  return (
    <>
      {current?.data?.demo && <DemoNotice />}
      <div className="mx-auto max-w-5xl px-4 py-8 space-y-8">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">
            {origin.city} → {destination.city}
          </h1>
          <p className="text-ink-soft">
            {formatDay(params.depart)}
            {params.ret ? ` – ${formatDay(params.ret)}` : " · one way"}
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

        {!current && <SearchLoading />}

        {current?.failed && (
          <div role="alert" className="rounded-xl border border-line bg-sky p-6 text-ink-soft">
            We couldn&apos;t load prices just now. Check your connection and try again.
          </div>
        )}

        {current?.data && (
          <>
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Your dates</h2>
              <FareList
                fares={current.data.exact}
                partners={current.data.partners}
                sourcePage={source}
                cheapestOverall={current.data.cheapestOverall}
              />
            </section>

            {current.data.flexible.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-lg font-semibold">Cheaper if you&apos;re flexible this month</h2>
                <FareList
                  fares={current.data.flexible}
                  partners={current.data.partners}
                  sourcePage={`${source}:flex`}
                  cheapestOverall={current.data.cheapestOverall}
                />
              </section>
            )}
          </>
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

export function SearchLoading() {
  return (
    <p className="rounded-xl border border-line p-6 text-ink-soft" aria-live="polite">
      Finding the cheapest recent fares…
    </p>
  );
}
