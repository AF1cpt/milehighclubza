import { getAirport, getAirportBySlug, type Airport } from "./airports";

/**
 * Curated routes that get their own SEO page. Each pair is published in both directions.
 * Add a pair here to publish a new page — no other code changes needed.
 */
const routePairs: [string, string][] = [
  ["JNB", "CPT"],
  ["JNB", "DUR"],
  ["CPT", "DUR"],
  ["JNB", "PLZ"],
  ["CPT", "PLZ"],
  ["JNB", "ELS"],
  ["JNB", "GRJ"],
  ["CPT", "BFN"],
  ["JNB", "LHR"],
  ["CPT", "LHR"],
  ["JNB", "DXB"],
  ["CPT", "DXB"],
  ["JNB", "DOH"],
  ["JNB", "AMS"],
  ["JNB", "CDG"],
  ["JNB", "NBO"],
  ["JNB", "MRU"],
  ["JNB", "ZNZ"],
  ["CPT", "WDH"],
  ["JNB", "WDH"],
  ["JNB", "HRE"],
  ["JNB", "ADD"],
];

export type Route = {
  origin: Airport;
  destination: Airport;
  slug: string;
  domestic: boolean;
};

export function routeSlug(origin: Airport, destination: Airport): string {
  return `${origin.slug}-to-${destination.slug}`;
}

export const routes: Route[] = routePairs.flatMap(([a, b]) => {
  const o = getAirport(a);
  const d = getAirport(b);
  if (!o || !d) throw new Error(`Unknown airport in routePairs: ${a}-${b}`);
  const domestic = o.domestic && d.domestic;
  return [
    { origin: o, destination: d, slug: routeSlug(o, d), domestic },
    { origin: d, destination: o, slug: routeSlug(d, o), domestic },
  ];
});

/** Parses "johannesburg-to-cape-town" into a route, or undefined if it isn't a published route. */
export function getRouteBySlug(slug: string): Route | undefined {
  const parts = slug.toLowerCase().split("-to-");
  if (parts.length !== 2) return undefined;
  const o = getAirportBySlug(parts[0]);
  const d = getAirportBySlug(parts[1]);
  if (!o || !d) return undefined;
  return routes.find((r) => r.origin.iata === o.iata && r.destination.iata === d.iata);
}
