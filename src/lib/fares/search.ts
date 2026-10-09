import { getAirport } from "@/data/airports";
import type { Fare, FareProvider } from "./types";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export type SearchParams = {
  origin: string;
  destination: string;
  /** YYYY-MM-DD */
  depart: string;
  /** YYYY-MM-DD, absent for one-way */
  ret?: string;
};

export type SearchResult = {
  /** Fares for the exact dates asked for. */
  exact: Fare[];
  /** Other fares in the same month, cheaper-if-flexible, without repeating `exact`. */
  flexible: Fare[];
  /** Lowest price across both lists; the "Cheapest" badge goes on fares that match it. */
  cheapestOverall?: number;
};

type RawSearch = { o?: string | null; d?: string | null; dep?: string | null; ret?: string | null };

/** Turns raw URL values into a search, or null if they don't describe a real one. */
export function parseSearch(raw: RawSearch): SearchParams | null {
  const origin = getAirport(raw.o ?? "");
  const destination = getAirport(raw.d ?? "");
  const depart = raw.dep ?? "";
  const ret = raw.ret || undefined;
  if (!origin || !destination || origin.iata === destination.iata) return null;
  if (!DATE.test(depart) || (ret !== undefined && !DATE.test(ret))) return null;
  return { origin: origin.iata, destination: destination.iata, depart, ret };
}

/** URL query for a search, in a stable order (used for the API call and as a cache key). */
export function searchQuery(p: SearchParams): string {
  const q = new URLSearchParams({ o: p.origin, d: p.destination, dep: p.depart });
  if (p.ret) q.set("ret", p.ret);
  return q.toString();
}

/** Exact-date fares plus a "cheaper if you're flexible this month" list. Always asks the provider live. */
export async function searchFares(provider: FareProvider, p: SearchParams): Promise<SearchResult> {
  const [exact, month] = await Promise.all([
    provider.search({ origin: p.origin, destination: p.destination, depart: p.depart, ret: p.ret, limit: 10 }, { live: true }),
    provider.search(
      {
        origin: p.origin,
        destination: p.destination,
        depart: p.depart.slice(0, 7),
        ret: p.ret ? p.ret.slice(0, 7) : undefined,
        limit: 10,
      },
      { live: true },
    ),
  ]);

  const seen = new Set(exact.map((f) => `${f.departDate}|${f.returnDate}|${f.airline}`));
  const flexible = month.filter((f) => !seen.has(`${f.departDate}|${f.returnDate}|${f.airline}`)).slice(0, 8);
  const prices = [...exact, ...flexible].map((f) => f.price);
  return { exact, flexible, cheapestOverall: prices.length ? Math.min(...prices) : undefined };
}
