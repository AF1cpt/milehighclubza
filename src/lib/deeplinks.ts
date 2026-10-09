/**
 * Builds partner URLs on the server only. The /go endpoint never accepts a raw URL from the
 * browser, so it can't be abused as an open redirect.
 *
 * VERIFY each format against your partner dashboard before launch — they are marked below.
 */

export type FlightPartner = "aviasales" | "travelstart";
/** Things travellers need besides the flight. See `addons`. */
export type AddonPartner = "discovercars" | "airalo";
export type Partner = FlightPartner | AddonPartner;

export type FlightClick = {
  partner: FlightPartner;
  origin: string;
  destination: string;
  departDate: string; // YYYY-MM-DD
  returnDate?: string; // YYYY-MM-DD
  adults?: number;
};

/** Add-on clicks come from a route page: they keep the route but have no flight date. */
export type AddonClick = { partner: AddonPartner; origin: string; destination: string };

export type ClickTarget = FlightClick | AddonClick;

/**
 * Add-on partners. Each sends people to the tracking link you copy from that partner's dashboard into its
 * env var, so no URL format is guessed. Put `{subid}` in the link where the dashboard takes a sub-ID
 * (e.g. `...&sub_id={subid}`) and commissions can be traced back to the page; without it clicks still work.
 */
export const addons: Record<AddonPartner, { env: string; kind: "car-hire" | "esim" }> = {
  discovercars: { env: "DISCOVERCARS_AFFILIATE_LINK", kind: "car-hire" },
  airalo: { env: "AIRALO_AFFILIATE_LINK", kind: "esim" },
};

export function isAddon(p: string): p is AddonPartner {
  return Object.hasOwn(addons, p);
}

/** "2026-11-14" -> "1411" (DDMM), the date format Aviasales search URLs use. */
export function ddmm(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}${m}`;
}

/** Aviasales search path segment, e.g. JNB1411CPT18111 = JNB→CPT 14 Nov, back 18 Nov, 1 adult. */
export function aviasalesSearchSegment(t: FlightClick): string {
  const ret = t.returnDate ? ddmm(t.returnDate) : "";
  return `${t.origin}${ddmm(t.departDate)}${t.destination}${ret}${t.adults ?? 1}`;
}

export function buildPartnerUrl(
  t: ClickTarget,
  subId: string,
  env: Record<string, string | undefined> = process.env,
): string | null {
  if (isAddon(t.partner)) {
    const link = env[addons[t.partner].env];
    if (!link) return null;
    try {
      const url = new URL(link.replaceAll("{subid}", encodeURIComponent(subId)));
      return url.protocol === "https:" ? url.toString() : null;
    } catch {
      return null;
    }
  }

  if (t.partner === "aviasales") {
    // VERIFY: marker and sub_id parameter names in Travelpayouts → Tools → Links.
    const marker = env.TRAVELPAYOUTS_MARKER;
    const url = new URL(`https://www.aviasales.com/search/${aviasalesSearchSegment(t)}`);
    url.searchParams.set("currency", "zar");
    if (marker) url.searchParams.set("marker", marker);
    url.searchParams.set("sub_id", subId);
    return url.toString();
  }

  // From here on, only flight partners are left (add-ons returned above).

  if (t.partner === "travelstart") {
    // Your Impact tracking link for Travelstart, e.g. https://travelstart.pxf.io/c/xxx/yyy/zzz
    // VERIFY: Impact uses subId1 for sub-IDs; deep-linking to a specific search page needs the
    // landing-URL format from Travelstart's affiliate team, so we land on the homepage for now.
    const base = env.TRAVELSTART_AFFILIATE_LINK;
    if (!base) return null;
    const url = new URL(base);
    url.searchParams.set("subId1", subId);
    return url.toString();
  }

  return null;
}

export function enabledPartners(env: Record<string, string | undefined> = process.env): FlightPartner[] {
  const list: FlightPartner[] = ["aviasales"];
  if (env.TRAVELSTART_AFFILIATE_LINK) list.unshift("travelstart");
  return list;
}

/** Add-ons whose tracking link is set. Nothing shows for a partner until you've joined and pasted its link. */
export function enabledAddons(env: Record<string, string | undefined> = process.env): AddonPartner[] {
  return (Object.keys(addons) as AddonPartner[]).filter((p) => Boolean(env[addons[p].env]));
}

/** Car hire for every destination; an eSIM only abroad (SA travellers already have data at home). */
export function addonsFor(destination: { domestic: boolean }, enabled: AddonPartner[]): AddonPartner[] {
  const wanted = enabled.filter((p) => addons[p].kind === "car-hire" || !destination.domestic);
  // Abroad, mobile data comes first: it's needed the moment you land.
  return wanted.sort((a, b) => Number(addons[a].kind === "car-hire") - Number(addons[b].kind === "car-hire"));
}

export const partnerLabels: Record<Partner, string> = {
  aviasales: "Aviasales",
  travelstart: "Travelstart",
  discovercars: "DiscoverCars",
  airalo: "Airalo",
};
