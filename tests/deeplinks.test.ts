import { describe, expect, it } from "vitest";
import { aviasalesSearchSegment, buildPartnerUrl, ddmm, enabledPartners } from "@/lib/deeplinks";
import { deviceFromUserAgent } from "@/lib/clicks";

describe("deeplinks", () => {
  it("formats DDMM", () => {
    expect(ddmm("2026-11-04")).toBe("0411");
  });

  it("builds an Aviasales search segment", () => {
    expect(aviasalesSearchSegment({ partner: "aviasales", origin: "JNB", destination: "CPT", departDate: "2026-11-14", returnDate: "2026-11-18" })).toBe("JNB1411CPT18111");
    expect(aviasalesSearchSegment({ partner: "aviasales", origin: "JNB", destination: "CPT", departDate: "2026-11-14" })).toBe("JNB1411CPT1");
  });

  it("adds marker and sub-ID to Aviasales links", () => {
    const url = new URL(buildPartnerUrl({ partner: "aviasales", origin: "JNB", destination: "CPT", departDate: "2026-11-14" }, "abc123", { TRAVELPAYOUTS_MARKER: "999" })!);
    expect(url.protocol).toBe("https:");
    expect(url.hostname).toBe("www.aviasales.com");
    expect(url.searchParams.get("marker")).toBe("999");
    expect(url.searchParams.get("sub_id")).toBe("abc123");
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

describe("device detection", () => {
  it("classifies user agents", () => {
    expect(deviceFromUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile")).toBe("mobile");
    expect(deviceFromUserAgent("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)")).toBe("tablet");
    expect(deviceFromUserAgent("Googlebot/2.1")).toBe("bot");
    expect(deviceFromUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")).toBe("desktop");
    expect(deviceFromUserAgent(null)).toBe("unknown");
  });
});
