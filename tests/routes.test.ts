import { describe, expect, it } from "vitest";
import { airports, getAirport, getAirportBySlug, isKnownIata } from "@/data/airports";
import { getRouteBySlug, routes } from "@/data/routes";

describe("airports", () => {
  it("has unique IATA codes and slugs", () => {
    expect(new Set(airports.map((a) => a.iata)).size).toBe(airports.length);
    expect(new Set(airports.map((a) => a.slug)).size).toBe(airports.length);
  });

  it("uses valid 3-letter codes and URL-safe slugs", () => {
    for (const a of airports) {
      expect(a.iata).toMatch(/^[A-Z]{3}$/);
      expect(a.slug).toMatch(/^[a-z]+(-[a-z]+)*$/);
      expect(a.slug).not.toContain("-to-");
    }
  });

  it("looks up case-insensitively", () => {
    expect(getAirport("jnb")?.city).toBe("Johannesburg");
    expect(getAirportBySlug("Cape-Town")?.iata).toBe("CPT");
    expect(isKnownIata("xxx")).toBe(false);
  });
});

describe("routes", () => {
  it("publishes every pair in both directions with unique slugs", () => {
    const slugs = routes.map((r) => r.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(routes.length % 2).toBe(0);
    expect(getRouteBySlug("johannesburg-to-cape-town")?.destination.iata).toBe("CPT");
    expect(getRouteBySlug("cape-town-to-johannesburg")?.origin.iata).toBe("CPT");
  });

  it("never routes an airport to itself", () => {
    for (const r of routes) expect(r.origin.iata).not.toBe(r.destination.iata);
  });

  it("rejects unknown or unpublished slugs", () => {
    expect(getRouteBySlug("johannesburg-to-atlantis")).toBeUndefined();
    expect(getRouteBySlug("george-to-zanzibar")).toBeUndefined();
    expect(getRouteBySlug("nonsense")).toBeUndefined();
    expect(getRouteBySlug("a-to-b-to-c")).toBeUndefined();
  });

  it("marks domestic routes correctly", () => {
    expect(getRouteBySlug("johannesburg-to-durban")?.domestic).toBe(true);
    expect(getRouteBySlug("johannesburg-to-london")?.domestic).toBe(false);
  });
});
