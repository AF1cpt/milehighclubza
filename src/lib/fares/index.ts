import { SampleProvider } from "./sample";
import { TravelpayoutsProvider } from "./travelpayouts";
import type { Fare, FareProvider, FareQuery } from "./types";

export type { Fare, FareQuery, FareProvider };

let provider: FareProvider | undefined;

/** Uses Travelpayouts when TRAVELPAYOUTS_TOKEN is set, otherwise clearly-labelled sample data. */
export function getFareProvider(): FareProvider {
  if (!provider) {
    const token = process.env.TRAVELPAYOUTS_TOKEN;
    provider = token ? new TravelpayoutsProvider(token) : new SampleProvider();
  }
  return provider;
}

export function isDemoMode(): boolean {
  return !process.env.TRAVELPAYOUTS_TOKEN;
}

/** Cheapest fare per departure day, sorted by date. Used for price calendars. */
export function cheapestPerDay(fares: Fare[]): Fare[] {
  const best = new Map<string, Fare>();
  for (const f of fares) {
    const cur = best.get(f.departDate);
    if (!cur || f.price < cur.price) best.set(f.departDate, f);
  }
  return [...best.values()].sort((a, b) => a.departDate.localeCompare(b.departDate));
}

/** Next N months as "YYYY-MM", starting with the current month. */
export function upcomingMonths(n: number, from = new Date()): string[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + i, 1));
    return d.toISOString().slice(0, 7);
  });
}
