import { afterEach, describe, expect, it, vi } from "vitest";
import { normaliseTravelpayouts, TravelpayoutsProvider } from "@/lib/fares/travelpayouts";
import { SampleProvider } from "@/lib/fares/sample";
import { cheapestPerDay, upcomingMonths } from "@/lib/fares";

afterEach(() => vi.unstubAllGlobals());

describe("travelpayouts normaliser", () => {
  it("maps, drops bad rows and sorts by price", () => {
    const fares = normaliseTravelpayouts([
      { origin: "JNB", destination: "CPT", price: 1499.6, airline: "FA", transfers: 0, departure_at: "2026-11-14T06:00:00+02:00" },
      { origin: "JNB", destination: "CPT", price: 0, airline: "4Z", transfers: 0, departure_at: "2026-11-15T06:00:00+02:00" },
      { origin: "JNB", destination: "CPT", price: 999, airline: "SA", transfers: 0, departure_at: "2026-11-16T06:00:00+02:00", return_at: "2026-11-20T18:00:00+02:00" },
    ], new Date("2026-10-01T10:00:00Z"));
    expect(fares).toHaveLength(2);
    expect(fares[0]).toMatchObject({ price: 999, departDate: "2026-11-16", returnDate: "2026-11-20", source: "travelpayouts" });
    expect(fares[1].price).toBe(1500);
  });

  it("drops flights that have already departed (SA local date), keeps today's", () => {
    const row = (day: string, price: number) => ({ origin: "JNB", destination: "CPT", price, airline: "FA", transfers: 0, departure_at: `${day}T06:00:00+02:00` });
    // 23:30 UTC on 14 Nov is already 01:30 on 15 Nov in Johannesburg.
    const fares = normaliseTravelpayouts([row("2026-11-14", 500), row("2026-11-15", 900), row("2026-11-20", 700)], new Date("2026-11-14T23:30:00Z"));
    expect(fares.map((f) => f.departDate)).toEqual(["2026-11-20", "2026-11-15"]);
  });
});

describe("TravelpayoutsProvider", () => {
  it("sends the token in a header (never the URL) and asks for ZAR", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: [] }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    await new TravelpayoutsProvider("secret-token").search({ origin: "JNB", destination: "CPT", depart: "2026-11", ret: "2026-11" });
    const [url, init] = fetchMock.mock.calls[0];
    const u = new URL(url);
    expect(u.searchParams.get("currency")).toBe("zar");
    expect(u.searchParams.get("one_way")).toBe("false");
    expect(url).not.toContain("secret-token");
    expect(init.headers["X-Access-Token"]).toBe("secret-token");
  });

  it("returns an empty list instead of throwing on API errors", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("nope", { status: 429 })));
    await expect(new TravelpayoutsProvider("t").search({ origin: "JNB", destination: "CPT", depart: "2026-11" })).resolves.toEqual([]);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: false, error: "bad token" }))));
    await expect(new TravelpayoutsProvider("t").search({ origin: "JNB", destination: "CPT", depart: "2026-11" })).resolves.toEqual([]);
  });
});

describe("SampleProvider", () => {
  it("is deterministic, future-only and sorted", async () => {
    const p = new SampleProvider();
    const month = upcomingMonths(2)[1];
    const a = await p.search({ origin: "JNB", destination: "CPT", depart: month, limit: 100 });
    const b = await p.search({ origin: "JNB", destination: "CPT", depart: month, limit: 100 });
    const key = (fs: typeof a) => fs.map((f) => `${f.departDate}|${f.price}|${f.airline}`);
    expect(key(a)).toEqual(key(b));
    expect(a.length).toBeGreaterThan(25);
    for (let i = 1; i < a.length; i++) expect(a[i].price).toBeGreaterThanOrEqual(a[i - 1].price);
    expect(a.every((f) => f.source === "sample")).toBe(true);
  });

  it("drops past dates and respects the limit", async () => {
    const p = new SampleProvider();
    expect(await p.search({ origin: "JNB", destination: "CPT", depart: "2020-01-01" })).toEqual([]);
    expect(await p.search({ origin: "JNB", destination: "LHR", depart: upcomingMonths(2)[1], limit: 5 })).toHaveLength(5);
  });

  it("prices return trips higher than one-way", async () => {
    const p = new SampleProvider();
    const day = `${upcomingMonths(2)[1]}-15`;
    const [ow] = await p.search({ origin: "JNB", destination: "CPT", depart: day });
    const [rt] = await p.search({ origin: "JNB", destination: "CPT", depart: day, ret: `${upcomingMonths(2)[1]}-20` });
    expect(rt.price).toBeGreaterThan(ow.price);
    expect(rt.returnDate).toBeDefined();
  });
});

describe("helpers", () => {
  it("cheapestPerDay keeps one fare per day, sorted by date", () => {
    const base = { origin: "JNB", destination: "CPT", airline: "FA", transfers: 0, foundAt: "", source: "sample" as const };
    const out = cheapestPerDay([
      { ...base, departDate: "2026-11-02", price: 900 },
      { ...base, departDate: "2026-11-01", price: 800 },
      { ...base, departDate: "2026-11-02", price: 700 },
    ]);
    expect(out.map((f) => [f.departDate, f.price])).toEqual([["2026-11-01", 800], ["2026-11-02", 700]]);
  });

  it("upcomingMonths rolls over the year", () => {
    expect(upcomingMonths(3, new Date(Date.UTC(2026, 11, 15)))).toEqual(["2026-12", "2027-01", "2027-02"]);
  });
});
