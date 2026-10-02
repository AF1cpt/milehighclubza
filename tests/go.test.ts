import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/go/route";

const BASE = "http://localhost:3000";
let logs: string[] = [];

beforeEach(() => {
  logs = [];
  vi.spyOn(console, "info").mockImplementation((...a: unknown[]) => void logs.push(a.join(" ")));
});

async function go(query: string, headers: Record<string, string> = {}) {
  return GET(new NextRequest(`${BASE}/go?${query}`, { headers }));
}

describe("/go click-out", () => {
  it("logs the click and 302s to the partner with the same sub-ID", async () => {
    const res = await go("p=aviasales&o=jnb&d=CPT&dep=2026-11-14&ret=2026-11-18&price=1890&src=route:jnb-cpt", {
      "user-agent": "Mozilla/5.0 (iPhone) Mobile",
    });
    expect(res.status).toBe(302);
    const target = new URL(res.headers.get("location")!);
    expect(target.hostname).toBe("www.aviasales.com");
    expect(target.pathname).toBe("/search/JNB1411CPT18111");
    const subId = target.searchParams.get("sub_id")!;
    expect(subId).toMatch(/^[a-f0-9]{16}$/);

    expect(logs).toHaveLength(1);
    const logged = JSON.parse(logs[0].replace("[click] ", ""));
    expect(logged).toMatchObject({ id: subId, partner: "aviasales", origin: "JNB", price_shown: 1890, device: "mobile", source_page: "route:jnb-cpt" });
  });

  it("is never cached or indexed", async () => {
    const res = await go("p=aviasales&o=JNB&d=CPT&dep=2026-11-14");
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("x-robots-tag")).toContain("noindex");
  });

  it("gives every click a unique sub-ID", async () => {
    const q = "p=aviasales&o=JNB&d=CPT&dep=2026-11-14";
    const a = new URL((await go(q)).headers.get("location")!).searchParams.get("sub_id");
    const b = new URL((await go(q)).headers.get("location")!).searchParams.get("sub_id");
    expect(a).not.toBe(b);
  });

  it.each([
    ["unknown partner", "p=evil&o=JNB&d=CPT&dep=2026-11-14"],
    ["attacker URL param is ignored", "p=evil&o=JNB&d=CPT&dep=2026-11-14&url=https://evil.example"],
    ["unknown airport", "p=aviasales&o=XXX&d=CPT&dep=2026-11-14"],
    ["same origin and destination", "p=aviasales&o=JNB&d=JNB&dep=2026-11-14"],
    ["bad date", "p=aviasales&o=JNB&d=CPT&dep=14-11-2026"],
    ["bad return date", "p=aviasales&o=JNB&d=CPT&dep=2026-11-14&ret=soon"],
    ["missing params", ""],
    ["travelstart not configured", "p=travelstart&o=JNB&d=CPT&dep=2026-11-14"],
  ])("sends %s back home without logging", async (_label, q) => {
    const res = await go(q);
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe(`${BASE}/`);
    expect(logs).toHaveLength(0);
  });

  it("drops junk prices and truncates long fields", async () => {
    await go(`p=aviasales&o=JNB&d=CPT&dep=2026-11-14&price=-5&src=${"x".repeat(500)}`);
    const logged = JSON.parse(logs[0].replace("[click] ", ""));
    expect(logged.price_shown).toBeNull();
    expect(logged.source_page).toHaveLength(120);
  });
});
