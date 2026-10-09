import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/fares/route";
import { upcomingMonths } from "@/lib/fares";

const month = upcomingMonths(2)[1];

async function api(query: string) {
  return GET(new NextRequest(`http://localhost:3000/api/fares?${query}`));
}

describe("/api/fares", () => {
  it("returns labelled demo results with the enabled partners", async () => {
    const res = await api(`o=JNB&d=CPT&dep=${month}-15&ret=${month}-20`);
    expect(res.status).toBe(200);
    const body = await res.json();
    // No TRAVELPAYOUTS_TOKEN in tests, so the UI must show the demo notice.
    expect(body.demo).toBe(true);
    expect(body.partners).toEqual(["aviasales"]);
    expect(body.exact.length).toBeGreaterThan(0);
    expect(body.exact[0]).toMatchObject({ origin: "JNB", destination: "CPT", returnDate: expect.any(String) });
    expect(typeof body.cheapestOverall).toBe("number");
  });

  it("is never indexed, and caches briefly in the browser only", async () => {
    const res = await api(`o=JNB&d=CPT&dep=${month}-15`);
    expect(res.headers.get("x-robots-tag")).toContain("noindex");
    expect(res.headers.get("cache-control")).toBe("public, max-age=600");
  });

  it.each([
    ["unknown airport", "o=XXX&d=CPT&dep=2026-11-14"],
    ["same airports", "o=JNB&d=JNB&dep=2026-11-14"],
    ["bad date", "o=JNB&d=CPT&dep=tomorrow"],
    ["missing params", ""],
  ])("rejects %s with 400 and no cache", async (_label, q) => {
    const res = await api(q);
    expect(res.status).toBe(400);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.json()).toEqual({ error: "invalid search" });
  });
});
