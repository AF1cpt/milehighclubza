import { describe, expect, it } from "vitest";
import { airlineName, formatCheckedAt, formatDay, formatMonth, formatZar, saDatePlus } from "@/lib/format";
import { site } from "@/config/site";

describe("site config", () => {
  it("has the brand and ZAR currency", () => {
    expect(site.name).toBe("MilehighclubZA");
    expect(site.currency).toBe("ZAR");
    expect(site.url).toMatch(/^https?:\/\//);
  });
});

describe("formatZar", () => {
  it("formats whole rand with the R symbol and no cents", () => {
    const out = formatZar(1890);
    expect(out).toMatch(/^R\s?1[\s ,]?890$/);
    expect(out).not.toContain(".");
  });
});

describe("dates", () => {
  it("formats a day without timezone drift", () => {
    expect(formatDay("2026-11-14")).toMatch(/Sat.*14.*Nov/);
  });

  it("formats a month", () => {
    expect(formatMonth("2026-12")).toMatch(/December 2026/);
  });
});

describe("saDatePlus", () => {
  it("uses the South African date, not UTC, just after midnight", () => {
    // 23:30 UTC on 9 Oct is 01:30 on 10 Oct in Johannesburg.
    const now = new Date("2026-10-09T23:30:00Z");
    expect(saDatePlus(0, now)).toBe("2026-10-10");
    expect(saDatePlus(14, now)).toBe("2026-10-24");
  });

  it("rolls over months and years", () => {
    expect(saDatePlus(3, new Date("2026-12-30T10:00:00Z"))).toBe("2027-01-02");
  });
});

describe("formatCheckedAt", () => {
  it("shows an absolute South African time, so a cached page never looks fresher than it is", () => {
    const out = formatCheckedAt("2026-10-09T12:05:00Z");
    expect(out).toMatch(/0?9 Oct/);
    expect(out).toContain("14:05");
    expect(out).toMatch(/SAST$/);
    expect(out).not.toMatch(/ago/);
  });

  it("rolls the date over at SA midnight, not UTC midnight", () => {
    expect(formatCheckedAt("2026-10-09T22:30:00Z")).toMatch(/10 Oct, 00:30 SAST/);
  });
});

describe("airlineName", () => {
  it("maps SA carriers and falls back to the code", () => {
    expect(airlineName("FA")).toBe("FlySafair");
    expect(airlineName("4Z")).toBe("Airlink");
    expect(airlineName("ZZ")).toBe("ZZ");
  });
});
