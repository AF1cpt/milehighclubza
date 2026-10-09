import { getAirport } from "@/data/airports";
import type { Fare, FareProvider, FareQuery } from "./types";

/**
 * Deterministic SAMPLE data so the site runs before a Travelpayouts token exists.
 * These are NOT real prices. The UI shows a demo banner whenever this provider is active.
 */

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const domesticCarriers = ["FA", "4Z", "SA"];
const intlCarriers: Record<string, string[]> = {
  LHR: ["BA", "SA", "EK", "QR"],
  CDG: ["AF", "EK", "QR"],
  AMS: ["KL", "EK", "QR"],
  DXB: ["EK"],
  DOH: ["QR"],
  NBO: ["KQ", "SA"],
  ADD: ["ET"],
};

function baseOneWay(origin: string, destination: string): number {
  const o = getAirport(origin);
  const d = getAirport(destination);
  if (o?.domestic && d?.domestic) return 900;
  const longHaul = ["LHR", "CDG", "AMS"];
  if (longHaul.includes(origin) || longHaul.includes(destination)) return 7500;
  if (["DXB", "DOH"].includes(origin) || ["DXB", "DOH"].includes(destination)) return 5200;
  return 2600;
}

function daysIn(month: string): string[] {
  const [y, m] = month.split("-").map(Number);
  const count = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return Array.from({ length: count }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`);
}

function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export class SampleProvider implements FareProvider {
  readonly id = "sample" as const;

  async search(q: FareQuery): Promise<Fare[]> {
    const dates = q.depart.length === 7 ? daysIn(q.depart) : [q.depart];
    const base = baseOneWay(q.origin, q.destination);
    const carriers =
      intlCarriers[q.destination] ?? intlCarriers[q.origin] ?? domesticCarriers;
    const now = new Date();
    const today = now.toISOString().slice(0, 10);

    const fares: Fare[] = dates
      .filter((date) => date >= today)
      .map((date) => {
        const h = hash(`${q.origin}${q.destination}${date}`);
        const dow = new Date(`${date}T00:00:00Z`).getUTCDay();
        const weekend = dow === 5 || dow === 0 ? 1.25 : 1;
        const noise = 0.75 + (h % 1000) / 1000; // 0.75–1.75
        let price = base * weekend * noise;
        let returnDate: string | undefined;
        if (q.ret) {
          returnDate = q.ret.length === 10 ? q.ret : addDays(date, 3 + (h % 5));
          price *= 1.85;
        }
        return {
          origin: q.origin,
          destination: q.destination,
          departDate: date,
          returnDate,
          price: Math.round(price / 10) * 10,
          airline: carriers[h % carriers.length],
          transfers: base > 5000 ? 1 : 0,
          checkedAt: now.toISOString(),
          source: "sample" as const,
        };
      });

    return fares.sort((a, b) => a.price - b.price).slice(0, q.limit ?? 30);
  }
}
