import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { isDeployable, MARKER, MAX_PAGE_BYTES, oversized, summarise } from "../scripts/check-build.mjs";

const withFares = `<p ${MARKER}"2026-10-09T10:00:00.000Z">Cached partner prices</p>`;
const noFares = "<div>No recent fares found for these dates.</div>";

/** Runs the guard against a fake build: { "flights/a-to-b": html, "index": html }. Returns the exit code. */
function run(pages: Record<string, string>): number {
  const appDir = mkdtempSync(join(tmpdir(), "app-"));
  mkdirSync(join(appDir, "flights"));
  for (const [path, html] of Object.entries(pages)) writeFileSync(join(appDir, `${path}.html`), html);
  try {
    execFileSync("node", ["scripts/check-build.mjs", appDir], { stdio: "pipe" });
    return 0;
  } catch (e) {
    return (e as { status: number }).status;
  }
}

describe("build guard: fares", () => {
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
    expect(run({ "flights/a-to-b": withFares, "flights/b-to-a": withFares, "flights/c-to-d": noFares })).toBe(0);
    expect(run({ "flights/a-to-b": noFares, "flights/b-to-a": noFares, "flights/c-to-d": withFares })).toBe(1);
    expect(run({})).toBe(1);
  });
});

describe("build guard: page weight", () => {
  it("flags pages over the budget, biggest first", () => {
    expect(oversized({ "a.html": 90_000, "b.html": MAX_PAGE_BYTES })).toEqual([]);
    expect(oversized({ "a.html": MAX_PAGE_BYTES + 1, "b.html": 200_000, "c.html": 10 })).toEqual([
      { path: "b.html", bytes: 200_000 },
      { path: "a.html", bytes: MAX_PAGE_BYTES + 1 },
    ]);
  });

  it("fails the build when any page, not just route pages, is too big", () => {
    const fares = { "flights/a-to-b": withFares, "flights/b-to-a": withFares };
    expect(run({ ...fares, index: "x".repeat(1000) })).toBe(0);
    expect(run({ ...fares, "december-holiday-flights": "x".repeat(MAX_PAGE_BYTES + 1) })).toBe(1);
  });
});
