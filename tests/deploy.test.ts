import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? files(p) : /\.(ts|tsx)$/.test(p) ? [p] : [];
  });
}

describe("Cloudflare static deployment", () => {
  // open-next.config.ts uses a read-only cache with no revalidation queue. A page with time-based
  // revalidation would try to queue a re-render once stale and fail, so freshness comes from the
  // scheduled rebuild instead.
  it("has no page with time-based revalidation", () => {
    const offenders = files("src/app").filter((f) => /export\s+const\s+revalidate\s*=\s*\d/.test(readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
  });

  it("uses the read-only static assets cache and no queue", () => {
    const config = readFileSync("open-next.config.ts", "utf8");
    expect(config).toContain("static-assets-incremental-cache");
    expect(config).not.toMatch(/queue:/);
  });
});
