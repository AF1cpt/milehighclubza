import type { Fare, FareFetchOptions, FareProvider, FareQuery } from "./types";

/**
 * Travelpayouts / Aviasales Data API (cached prices from Aviasales users' searches, kept up to ~7 days).
 * Docs: https://support.travelpayouts.com/hc/en-us/articles/203956163-Aviasales-Data-API
 * Rate limit for /v3/prices_for_dates: 600 requests/minute (June 2024). Page builds use the fetch cache
 * (one call per route/month per build); live searches skip it.
 *
 * VERIFY when your token arrives: that `currency=zar` is accepted, and the exact field names below.
 */
// TRAVELPAYOUTS_API_BASE is a server-only, test-only override (local stand-in for end-to-end tests).
const API_BASE = process.env.TRAVELPAYOUTS_API_BASE ?? "https://api.travelpayouts.com";
const ENDPOINT = `${API_BASE}/aviasales/v3/prices_for_dates`;

type TpItem = {
  origin: string;
  destination: string;
  price: number;
  airline: string;
  transfers: number;
  departure_at: string;
  return_at?: string;
};

type TpResponse = { success: boolean; data?: TpItem[]; currency?: string; error?: string };

export function normaliseTravelpayouts(items: TpItem[], now = new Date()): Fare[] {
  // Departure dates are local to the airport; compare against today's date in South Africa so a
  // stale cache entry for a flight that has already left is never shown as the "cheapest" fare.
  const today = now.toLocaleDateString("en-CA", { timeZone: "Africa/Johannesburg" });
  return items
    .filter((i) => typeof i.price === "number" && i.price > 0 && i.departure_at)
    .filter((i) => i.departure_at.slice(0, 10) >= today)
    .map((i) => ({
      origin: i.origin,
      destination: i.destination,
      departDate: i.departure_at.slice(0, 10),
      returnDate: i.return_at ? i.return_at.slice(0, 10) : undefined,
      price: Math.round(i.price),
      airline: i.airline,
      transfers: i.transfers ?? 0,
      // This endpoint has no per-price "found at" timestamp, and its cache keeps prices for up to
      // ~7 days. We record when we fetched it and label it as a cached price that may have changed.
      checkedAt: now.toISOString(),
      source: "travelpayouts" as const,
    }))
    .sort((a, b) => a.price - b.price);
}

export class TravelpayoutsProvider implements FareProvider {
  readonly id = "travelpayouts" as const;

  constructor(private readonly token: string) {}

  async search(q: FareQuery, options: FareFetchOptions = {}): Promise<Fare[]> {
    const params = new URLSearchParams({
      origin: q.origin,
      destination: q.destination,
      departure_at: q.depart,
      currency: "zar",
      sorting: "price",
      limit: String(q.limit ?? 30),
      one_way: q.ret ? "false" : "true",
    });
    if (q.ret) params.set("return_at", q.ret);

    const res = await fetch(`${ENDPOINT}?${params}`, {
      headers: { "X-Access-Token": this.token, "Accept-Encoding": "gzip, deflate" },
      // Pages are static and rebuilt on a schedule, so build-time fetches are cached for the whole build.
      cache: options.live ? "no-store" : "force-cache",
    });
    if (!res.ok) {
      console.error(`[travelpayouts] HTTP ${res.status} for ${q.origin}-${q.destination} ${q.depart}`);
      return [];
    }
    const json = (await res.json()) as TpResponse;
    if (!json.success || !json.data) {
      console.error(`[travelpayouts] API error: ${json.error ?? "unknown"}`);
      return [];
    }
    return normaliseTravelpayouts(json.data);
  }
}
