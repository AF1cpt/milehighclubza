import { describe, expect, it } from "vitest";
import { festiveHolidays, festiveSeason, isFestivePromoTime } from "@/lib/festive";
import { cheapestInWindow } from "@/lib/fares";
import { festivePairs, schoolSummerBreak } from "@/data/festive";
import { getRouteBySlug, routeSlug } from "@/data/routes";
import { getAirport } from "@/data/airports";
import type { Fare } from "@/lib/fares";

describe("festiveSeason", () => {
  it("targets this December until mid-January, then the next one", () => {
    expect(festiveSeason(new Date("2026-10-09T10:00:00Z")).year).toBe(2026);
    expect(festiveSeason(new Date("2026-12-31T10:00:00Z")).year).toBe(2026);
    expect(festiveSeason(new Date("2027-01-15T10:00:00Z")).year).toBe(2026);
    expect(festiveSeason(new Date("2027-01-16T10:00:00Z")).year).toBe(2027);
  });

  it("uses SA time at the mid-January switch (23:30 UTC on 15 Jan is 16 Jan in SA)", () => {
    expect(festiveSeason(new Date("2027-01-15T23:30:00Z")).year).toBe(2027);
  });

  it("flies out before Christmas and home after New Year, across the year end", () => {
    const s = festiveSeason(new Date("2026-10-09T10:00:00Z"));
    expect(s.out).toEqual({ from: "2026-12-01", to: "2026-12-24" });
    expect(s.home).toEqual({ from: "2026-12-26", to: "2027-01-15" });
    expect(s.months).toEqual({ out: ["2026-12"], home: ["2026-12", "2027-01"] });
  });
});

describe("festiveHolidays", () => {
  it("matches the 2026/27 calendar on gov.za", () => {
    const h = festiveHolidays(2026);
    expect(h.map((x) => [x.date, x.name, x.weekday])).toEqual([
      ["2026-12-16", "Day of Reconciliation", "Wednesday"],
      ["2026-12-25", "Christmas Day", "Friday"],
      ["2026-12-26", "Day of Goodwill", "Saturday"],
      ["2027-01-01", "New Year's Day", "Friday"],
    ]);
    expect(h.map((x) => x.longWeekend)).toEqual([false, true, false, true]);
    expect(h.every((x) => x.note === undefined)).toBe(true);
  });

  it("applies the Sunday rule from section 2(1) of the Public Holidays Act", () => {
    // 1 January 2023 fell on a Sunday, so Monday 2 January 2023 was a public holiday.
    const newYear = festiveHolidays(2022).find((x) => x.name === "New Year's Day")!;
    expect(newYear).toMatchObject({ date: "2023-01-01", weekday: "Sunday", longWeekend: true });
    expect(newYear.note).toContain("Monday 2023-01-02");
  });
});

describe("isFestivePromoTime", () => {
  it("runs from September to 15 January", () => {
    expect(isFestivePromoTime(new Date("2026-08-31T10:00:00Z"))).toBe(false);
    expect(isFestivePromoTime(new Date("2026-09-01T10:00:00Z"))).toBe(true);
    expect(isFestivePromoTime(new Date("2027-01-15T10:00:00Z"))).toBe(true);
    expect(isFestivePromoTime(new Date("2027-01-16T10:00:00Z"))).toBe(false);
  });
});

describe("cheapestInWindow", () => {
  const fare = (departDate: string, price: number): Fare => ({
    origin: "JNB",
    destination: "CPT",
    departDate,
    price,
    airline: "FA",
    transfers: 0,
    checkedAt: "2026-10-09T10:00:00.000Z",
    source: "sample",
  });

  it("keeps the window, one fare per day, cheapest first", () => {
    const out = cheapestInWindow(
      [
        fare("2026-11-30", 100), // before the window
        fare("2026-12-05", 900),
        fare("2026-12-05", 700), // cheaper on the same day wins
        fare("2026-12-10", 800),
        fare("2026-12-24", 650), // last day counts
        fare("2026-12-25", 50), // after the window
      ],
      { from: "2026-12-01", to: "2026-12-24" },
      3,
    );
    expect(out.map((f) => [f.departDate, f.price])).toEqual([
      ["2026-12-24", 650],
      ["2026-12-05", 700],
      ["2026-12-10", 800],
    ]);
  });
});

describe("festive data", () => {
  it("only uses published routes, in both directions", () => {
    for (const [a, b] of festivePairs) {
      const from = getAirport(a)!;
      const to = getAirport(b)!;
      expect(getRouteBySlug(routeSlug(from, to))).toBeDefined();
      expect(getRouteBySlug(routeSlug(to, from))).toBeDefined();
    }
  });

  it("has school dates that close in December and reopen in January", () => {
    for (const [year, { lastDay, backOn }] of Object.entries(schoolSummerBreak)) {
      expect(lastDay.startsWith(`${year}-12-`)).toBe(true);
      expect(backOn.startsWith(`${Number(year) + 1}-01-`)).toBe(true);
    }
  });
});
