import { describe, expect, it } from "vitest";
import { addonsFor, aviasalesSearchSegment, buildPartnerUrl, ddmm, enabledAddons, enabledPartners, isAddon } from "@/lib/deeplinks";
import { deviceFromUserAgent } from "@/lib/clicks";

describe("deeplinks", () => {
  it("formats DDMM", () => {
    expect(ddmm("2026-11-04")).toBe("0411");
  });

  it("builds an Aviasales search segment", () => {
    expect(aviasalesSearchSegment({ partner: "aviasales", origin: "JNB", destination: "CPT", departDate: "2026-11-14", returnDate: "2026-11-18" })).toBe("JNB1411CPT18111");
    expect(aviasalesSearchSegment({ partner: "aviasales", origin: "JNB", destination: "CPT", departDate: "2026-11-14" })).toBe("JNB1411CPT1");
  });

  it("builds Aviasales links like Travelpayouts' Create link, plus our sub-ID", () => {
    // From the dashboard (12 Oct 2026) for https://www.aviasales.com/search/JNB1411CPT1:
    const dashboard = new URL("https://tp.media/r?campaign_id=100&marker=788924&p=4114&trs=584651&u=https%3A%2F%2Fwww.aviasales.com%2Fsearch%2FJNB1411CPT1");
    const env = { TRAVELPAYOUTS_MARKER: "788924", TRAVELPAYOUTS_PROJECT_ID: "584651" };
    const url = new URL(buildPartnerUrl({ partner: "aviasales", origin: "JNB", destination: "CPT", departDate: "2026-11-14" }, "abc123", env)!);

    expect(url.origin + url.pathname).toBe(dashboard.origin + dashboard.pathname);
    for (const key of ["campaign_id", "marker", "p", "trs"]) expect(url.searchParams.get(key)).toBe(dashboard.searchParams.get(key));
    const target = new URL(url.searchParams.get("u")!);
    expect(target.origin + target.pathname).toBe(dashboard.searchParams.get("u"));
    expect(target.searchParams.get("currency")).toBe("zar");
    expect(url.searchParams.get("sub_id")).toBe("abc123");
  });

  it("links straight to Aviasales without a marker (nothing to track)", () => {
    const url = new URL(buildPartnerUrl({ partner: "aviasales", origin: "JNB", destination: "CPT", departDate: "2026-11-14" }, "abc123", {})!);
    expect(url.hostname).toBe("www.aviasales.com");
    expect(url.pathname).toBe("/search/JNB1411CPT1");
    expect(url.searchParams.has("sub_id")).toBe(false);
  });

  it("returns null for Travelstart until the affiliate link is configured", () => {
    expect(buildPartnerUrl({ partner: "travelstart", origin: "JNB", destination: "CPT", departDate: "2026-11-14" }, "x", {})).toBeNull();
    expect(enabledPartners({})).toEqual(["aviasales"]);
  });

  it("puts Travelstart first once configured, with subId1", () => {
    const env = { TRAVELSTART_AFFILIATE_LINK: "https://travelstart.pxf.io/c/1/2/3" };
    expect(enabledPartners(env)).toEqual(["travelstart", "aviasales"]);
    const url = new URL(buildPartnerUrl({ partner: "travelstart", origin: "JNB", destination: "CPT", departDate: "2026-11-14" }, "sub9", env)!);
    expect(url.searchParams.get("subId1")).toBe("sub9");
  });
});

describe("add-on partners", () => {
  const car = { partner: "discovercars", origin: "JNB", destination: "CPT" } as const;

  it("uses the dashboard tracking link and fills in {subid}", () => {
    const env = { DISCOVERCARS_AFFILIATE_LINK: "https://tp.example/r?marker=1&sub_id={subid}" };
    const url = new URL(buildPartnerUrl(car, "abc 123", env)!);
    expect(url.hostname).toBe("tp.example");
    expect(url.searchParams.get("marker")).toBe("1");
    expect(url.searchParams.get("sub_id")).toBe("abc 123");
  });

  it("leaves a link without {subid} as it is", () => {
    expect(buildPartnerUrl(car, "x", { DISCOVERCARS_AFFILIATE_LINK: "https://tp.example/r?marker=1" })).toBe(
      "https://tp.example/r?marker=1",
    );
  });

  it("returns null when not configured, not https, or not a URL", () => {
    expect(buildPartnerUrl(car, "x", {})).toBeNull();
    expect(buildPartnerUrl(car, "x", { DISCOVERCARS_AFFILIATE_LINK: "http://tp.example/r" })).toBeNull();
    expect(buildPartnerUrl(car, "x", { DISCOVERCARS_AFFILIATE_LINK: "not a url" })).toBeNull();
  });

  it("enables only partners whose link is set", () => {
    expect(enabledAddons({})).toEqual([]);
    expect(enabledAddons({ AIRALO_AFFILIATE_LINK: "https://a.example" })).toEqual(["airalo"]);
  });

  it("offers car hire everywhere and an eSIM only abroad, eSIM first", () => {
    const both = ["discovercars", "airalo"] as const;
    expect(addonsFor({ domestic: true }, [...both])).toEqual(["discovercars"]);
    expect(addonsFor({ domestic: false }, [...both])).toEqual(["airalo", "discovercars"]);
    expect(addonsFor({ domestic: false }, [])).toEqual([]);
  });

  it("only treats real add-on names as add-ons", () => {
    expect(isAddon("airalo")).toBe(true);
    expect(isAddon("aviasales")).toBe(false);
    expect(isAddon("toString")).toBe(false);
  });
});

describe("device detection", () => {
  it("classifies user agents", () => {
    expect(deviceFromUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile")).toBe("mobile");
    expect(deviceFromUserAgent("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)")).toBe("tablet");
    expect(deviceFromUserAgent("Googlebot/2.1")).toBe("bot");
    expect(deviceFromUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")).toBe("desktop");
    expect(deviceFromUserAgent(null)).toBe("unknown");
  });
});
