import { NextResponse, type NextRequest } from "next/server";
import { getFareProvider, isDemoMode } from "@/lib/fares";
import { parseSearch, searchFares } from "@/lib/fares/search";
import { enabledPartners } from "@/lib/deeplinks";

/**
 * Search results as JSON, rendered in the browser by <SearchResults/>. A plain JSON handler keeps CPU
 * per request well under the Workers Free plan's 10 ms; server-rendering the same page measured ~18 ms.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const params = parseSearch({ o: sp.get("o"), d: sp.get("d"), dep: sp.get("dep"), ret: sp.get("ret") });
  const headers = { "X-Robots-Tag": "noindex, nofollow" };

  if (!params) {
    return NextResponse.json({ error: "invalid search" }, { status: 400, headers: { ...headers, "Cache-Control": "no-store" } });
  }

  const result = await searchFares(getFareProvider(), params);
  return NextResponse.json(
    { demo: isDemoMode(), partners: enabledPartners(), ...result },
    // Prices are cached partner data anyway; a short browser cache saves data on back/forward.
    { headers: { ...headers, "Cache-Control": "public, max-age=600" } },
  );
}
