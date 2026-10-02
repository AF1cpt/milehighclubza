import { describe, expect, it } from "vitest";
import { airlineName, formatDay, formatMonth, formatZar, timeAgo } from "@/lib/format";
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

describe("timeAgo", () => {
  const now = Date.parse("2026-10-02T12:00:00Z");
  it("covers minutes, hours and days", () => {
    expect(timeAgo("2026-10-02T11:50:00Z", now)).toBe("under an hour ago");
    expect(timeAgo("2026-10-02T07:00:00Z", now)).toBe("5h ago");
    expect(timeAgo("2026-09-28T12:00:00Z", now)).toBe("4 days ago");
  });

  it("never shows negative time for future timestamps", () => {
    expect(timeAgo("2026-10-03T12:00:00Z", now)).toBe("under an hour ago");
  });
});

describe("airlineName", () => {
  it("maps SA carriers and falls back to the code", () => {
    expect(airlineName("FA")).toBe("FlySafair");
    expect(airlineName("4Z")).toBe("Airlink");
    expect(airlineName("ZZ")).toBe("ZZ");
  });
});
