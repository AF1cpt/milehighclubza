import { NextResponse, type NextRequest } from "next/server";
import { isKnownIata } from "@/data/airports";
import { logClick, deviceFromUserAgent } from "@/lib/clicks";
import { buildPartnerUrl, type Partner } from "@/lib/deeplinks";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const PARTNERS: Partner[] = ["aviasales", "travelstart"];

/**
 * Click-out endpoint: validates params, logs the click with a unique sub-ID, then 302s to the partner.
 * The sub-ID is what you join against partner conversion reports to see which pages earn money.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const partner = sp.get("p") as Partner | null;
  const origin = (sp.get("o") ?? "").toUpperCase();
  const destination = (sp.get("d") ?? "").toUpperCase();
  const dep = sp.get("dep") ?? "";
  const ret = sp.get("ret") ?? undefined;

  const ok =
    partner && PARTNERS.includes(partner) &&
    isKnownIata(origin) && isKnownIata(destination) && origin !== destination &&
    DATE.test(dep) && (!ret || DATE.test(ret));

  if (!ok) return NextResponse.redirect(new URL("/", req.url), 302);

  const subId = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  const target = buildPartnerUrl({ partner, origin, destination, departDate: dep, returnDate: ret }, subId);
  if (!target) return NextResponse.redirect(new URL("/", req.url), 302);

  const price = Number(sp.get("price"));
  await logClick({
    id: subId,
    partner,
    origin,
    destination,
    depart_date: dep,
    return_date: ret ?? null,
    price_shown: Number.isFinite(price) && price > 0 ? Math.round(price) : null,
    source_page: sp.get("src")?.slice(0, 120) ?? null,
    device: deviceFromUserAgent(req.headers.get("user-agent")),
    referrer: req.headers.get("referer")?.slice(0, 300) ?? null,
    utm_source: sp.get("utm_source")?.slice(0, 80) ?? null,
    utm_campaign: sp.get("utm_campaign")?.slice(0, 80) ?? null,
  });

  const res = NextResponse.redirect(target, 302);
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  res.headers.set("Cache-Control", "no-store");
  return res;
}
