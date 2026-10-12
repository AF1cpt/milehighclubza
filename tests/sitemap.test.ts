import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

/** Fare API stand-in: one fare late in each requested month, except for the routes listed as empty. */
function fakeFareApi(empty: string[]) {
  return vi.fn(async (url: string) => {
    const q = new URL(url).searchParams;
    const route = `${q.get("origin")}-${q.get("destination")}`;
    const data = empty.includes(route)
      ? []
      : [{ origin: q.get("origin"), destination: q.get("destination"), price: 1500, airline: "FA", transfers: 0, departure_at: `${q.get("departure_at")}-28T06:00:00+02:00` }];
    return new Response(JSON.stringify({ success: true, currency: "zar", data }), { headers: { date: new Date().toUTCString() } });
  });
}

describe("sitemap", () => {
  it("leaves out route pages with no fares and keeps the opposite direction", async () => {
    vi.stubEnv("TRAVELPAYOUTS_TOKEN", "test");
    vi.stubGlobal("fetch", fakeFareApi(["JNB-AMS"]));
    const { default: sitemap } = await import("@/app/sitemap");
    const urls = (await sitemap()).map((e) => e.url);

    expect(urls.some((u) => u.endsWith("/flights/johannesburg-to-amsterdam"))).toBe(false);
    expect(urls.some((u) => u.endsWith("/flights/amsterdam-to-johannesburg"))).toBe(true);
    expect(urls.some((u) => u.endsWith("/flights/johannesburg-to-cape-town"))).toBe(true);
    expect(urls.some((u) => u.endsWith("/december-holiday-flights"))).toBe(true);
  });
});
