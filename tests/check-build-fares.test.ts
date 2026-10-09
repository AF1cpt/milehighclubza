import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { isDeployable, MARKER, summarise } from "../scripts/check-build-fares.mjs";

const withFares = `<p ${MARKER}"2026-10-09T10:00:00.000Z">Cached partner prices</p>`;
const noFares = "<div>No recent fares found for these dates.</div>";

describe("build guard", () => {
  it("counts route pages with and without fares", () => {
    expect(summarise({ "b-to-a": noFares, "a-to-b": withFares, "c-to-d": withFares })).toEqual({
      total: 3,
      withFares: 2,
      empty: ["b-to-a"],
    });
  });

  it("deploys when at least half the routes have fares, never with none or no pages", () => {
    expect(isDeployable({ total: 44, withFares: 40 })).toBe(true);
    expect(isDeployable({ total: 44, withFares: 22 })).toBe(true);
    expect(isDeployable({ total: 44, withFares: 21 })).toBe(false);
    expect(isDeployable({ total: 44, withFares: 0 })).toBe(false);
    expect(isDeployable({ total: 0, withFares: 0 })).toBe(false);
  });

  it("exits non-zero on a broken build, zero on a good one", () => {
    const run = (pages: Record<string, string>) => {
      const dir = mkdtempSync(join(tmpdir(), "flights-"));
      for (const [slug, html] of Object.entries(pages)) writeFileSync(join(dir, `${slug}.html`), html);
      try {
        execFileSync("node", ["scripts/check-build-fares.mjs", dir], { stdio: "pipe" });
        return 0;
      } catch (e) {
        return (e as { status: number }).status;
      }
    };
    expect(run({ "a-to-b": withFares, "b-to-a": withFares, "c-to-d": noFares })).toBe(0);
    expect(run({ "a-to-b": noFares, "b-to-a": noFares, "c-to-d": withFares })).toBe(1);
    expect(run({})).toBe(1);
  });
});
