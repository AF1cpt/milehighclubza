/**
 * Builds partner URLs on the server only. The /go endpoint never accepts a raw URL from the
 * browser, so it can't be abused as an open redirect.
 *
 * VERIFY each format against your partner dashboard before launch — they are marked below.
 */

export type Partner = "aviasales" | "travelstart";

export type ClickTarget = {
  partner: Partner;
  origin: string;
  destination: string;
  departDate: string; // YYYY-MM-DD
  returnDate?: string; // YYYY-MM-DD
  adults?: number;
};

/** "2026-11-14" -> "1411" (DDMM), the date format Aviasales search URLs use. */
export function ddmm(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}${m}`;
}

/** Aviasales search path segment, e.g. JNB1411CPT18111 = JNB→CPT 14 Nov, back 18 Nov, 1 adult. */
export function aviasalesSearchSegment(t: ClickTarget): string {
  const ret = t.returnDate ? ddmm(t.returnDate) : "";
  return `${t.origin}${ddmm(t.departDate)}${t.destination}${ret}${t.adults ?? 1}`;
}

export function buildPartnerUrl(
  t: ClickTarget,
  subId: string,
  env: Record<string, string | undefined> = process.env,
): string | null {
  if (t.partner === "aviasales") {
    // VERIFY: marker and sub_id parameter names in Travelpayouts → Tools → Links.
    const marker = env.TRAVELPAYOUTS_MARKER;
    const url = new URL(`https://www.aviasales.com/search/${aviasalesSearchSegment(t)}`);
    url.searchParams.set("currency", "zar");
    if (marker) url.searchParams.set("marker", marker);
    url.searchParams.set("sub_id", subId);
    return url.toString();
  }

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

export function enabledPartners(env: Record<string, string | undefined> = process.env): Partner[] {
  const list: Partner[] = ["aviasales"];
  if (env.TRAVELSTART_AFFILIATE_LINK) list.unshift("travelstart");
  return list;
}

export const partnerLabels: Record<Partner, string> = {
  aviasales: "Aviasales",
  travelstart: "Travelstart",
};
