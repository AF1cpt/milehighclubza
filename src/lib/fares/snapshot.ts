import { cheapestPerDay } from "./index";
import type { Fare } from "./types";

/** One row of our own price history (`fare_snapshots`): a route's fares for one departure month, as seen on one day. */
export type FareSnapshot = {
  /** South African date the snapshot was taken, YYYY-MM-DD */
  snapshot_date: string;
  origin: string;
  destination: string;
  /** YYYY-MM */
  depart_month: string;
  /** Cheapest one-way fare that month, whole rand */
  min_price: number;
  /** Median of each day's cheapest fare: steadier than the minimum for "is this month cheap?" */
  median_price: number;
  days_with_fares: number;
  cheapest_date: string;
  airline: string;
};

/**
 * Summarises one route's fares for a departure month; null when there are none (no row is stored, rather than a
 * fake zero). Origin and destination come from our route, not the API, which can answer with city codes.
 */
export function summariseMonth(
  fares: Fare[],
  { origin, destination, month, snapshotDate }: { origin: string; destination: string; month: string; snapshotDate: string },
): FareSnapshot | null {
  const days = cheapestPerDay(fares.filter((f) => f.departDate.startsWith(`${month}-`)));
  if (days.length === 0) return null;
  // Earliest day wins a tie: `days` is sorted by date.
  const cheapest = days.reduce((best, f) => (f.price < best.price ? f : best));
  const prices = days.map((f) => f.price).sort((a, b) => a - b);
  const mid = Math.floor(prices.length / 2);
  return {
    snapshot_date: snapshotDate,
    origin,
    destination,
    depart_month: month,
    min_price: cheapest.price,
    median_price: prices.length % 2 ? prices[mid] : Math.round((prices[mid - 1] + prices[mid]) / 2),
    days_with_fares: days.length,
    cheapest_date: cheapest.departDate,
    airline: cheapest.airline,
  };
}
