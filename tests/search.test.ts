import { describe, expect, it, vi } from "vitest";
import { parseSearch, searchFares, searchQuery } from "@/lib/fares/search";
import { SampleProvider } from "@/lib/fares/sample";
import { upcomingMonths } from "@/lib/fares";
import type { FareProvider } from "@/lib/fares";

const month = upcomingMonths(2)[1];

describe("parseSearch", () => {
  it("accepts a valid return or one-way search and normalises airport codes", () => {
    expect(parseSearch({ o: "jnb", d: "CPT", dep: "2026-11-14", ret: "2026-11-18" })).toEqual({
      origin: "JNB",
      destination: "CPT",
      depart: "2026-11-14",
      ret: "2026-11-18",
    });
    expect(parseSearch({ o: "JNB", d: "DUR", dep: "2026-11-14", ret: null })).toEqual({
      origin: "JNB",
      destination: "DUR",
      depart: "2026-11-14",
      ret: undefined,
    });
  });

  it.each([
    ["unknown airport", { o: "XXX", d: "CPT", dep: "2026-11-14" }],
    ["same origin and destination", { o: "JNB", d: "jnb", dep: "2026-11-14" }],
    ["bad departure date", { o: "JNB", d: "CPT", dep: "14-11-2026" }],
    ["bad return date", { o: "JNB", d: "CPT", dep: "2026-11-14", ret: "soon" }],
    ["missing everything", {}],
  ])("rejects %s", (_label, raw) => {
    expect(parseSearch(raw)).toBeNull();
  });

  it("builds a stable query string", () => {
    expect(searchQuery({ origin: "JNB", destination: "CPT", depart: "2026-11-14" })).toBe("o=JNB&d=CPT&dep=2026-11-14");
    expect(searchQuery({ origin: "JNB", destination: "CPT", depart: "2026-11-14", ret: "2026-11-18" })).toBe(
      "o=JNB&d=CPT&dep=2026-11-14&ret=2026-11-18",
    );
  });
});

describe("searchFares", () => {
  it("returns exact-date fares plus flexible ones without repeating them", async () => {
    const res = await searchFares(new SampleProvider(), { origin: "JNB", destination: "CPT", depart: `${month}-15` });
    expect(res.exact.length).toBeGreaterThan(0);
    expect(res.exact.every((f) => f.departDate === `${month}-15`)).toBe(true);
    const key = (f: { departDate: string; returnDate?: string; airline: string }) => `${f.departDate}|${f.returnDate}|${f.airline}`;
    const exactKeys = new Set(res.exact.map(key));
    expect(res.flexible.some((f) => exactKeys.has(key(f)))).toBe(false);
    expect(res.flexible.length).toBeLessThanOrEqual(8);
    expect(res.cheapestOverall).toBe(Math.min(...[...res.exact, ...res.flexible].map((f) => f.price)));
  });

  it("always asks the provider live, never from a page cache", async () => {
    const search = vi.fn().mockResolvedValue([]);
    const provider: FareProvider = { id: "sample", search };
    const res = await searchFares(provider, { origin: "JNB", destination: "CPT", depart: "2026-11-14", ret: "2026-11-18" });
    expect(search).toHaveBeenCalledTimes(2);
    for (const call of search.mock.calls) expect(call[1]).toEqual({ live: true });
    expect(search.mock.calls[1][0]).toMatchObject({ depart: "2026-11", ret: "2026-11" });
    expect(res).toEqual({ exact: [], flexible: [], cheapestOverall: undefined });
  });
});
