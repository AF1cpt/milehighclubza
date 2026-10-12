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

/** Inclusive range of departure dates, "YYYY-MM-DD". */
export type DateWindow = { from: string; to: string };

/** Calendar months ("YYYY-MM") a window touches: what to ask the provider for. */
export function monthsIn(w: DateWindow): string[] {
  const months: string[] = [];
  let [y, m] = w.from.slice(0, 7).split("-").map(Number);
  const last = w.to.slice(0, 7);
  for (;;) {
    const month = `${y}-${String(m).padStart(2, "0")}`;
    months.push(month);
    if (month >= last) return months;
    [y, m] = m === 12 ? [y + 1, 1] : [y, m + 1];
  }
}

/** The `n` cheapest days to depart inside the window, one fare per day, cheapest first. */
export function cheapestInWindow(fares: Fare[], window: DateWindow, n: number): Fare[] {
  return cheapestPerDay(fares.filter((f) => f.departDate >= window.from && f.departDate <= window.to))
    .sort((a, b) => a.price - b.price || a.departDate.localeCompare(b.departDate))
    .slice(0, n);
}

/** Earliest `checkedAt` across fares, so a page-level "checked" label never overstates freshness. */
export function oldestCheck(fares: Fare[]): string | null {
  if (fares.length === 0) return null;
  return fares.reduce((oldest, f) => (f.checkedAt < oldest ? f.checkedAt : oldest), fares[0].checkedAt);
}

/** Next N months as "YYYY-MM", starting with the current month. */
export function upcomingMonths(n: number, from = new Date()): string[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + i, 1));
    return d.toISOString().slice(0, 7);
  });
}
