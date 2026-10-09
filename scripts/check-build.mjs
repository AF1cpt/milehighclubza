#!/usr/bin/env node
// Build guard: npm run verify:build (CI and the Deploy workflow run it after the build, before deploy).
// Usage: node scripts/check-build.mjs [appDir]   (default .next/server/app)
//
// 1. Fares: pages are rebuilt every 6 hours. If the fare API was down, rate-limited or rejected the token
//    during a build, every route page says "No recent fares". This refuses to deploy such a build, so the
//    last good version stays live (GitHub emails you about the failed run).
// 2. Page weight: the Worker parses a page's cached HTML + RSC payload on every request, so CPU grows with
//    page size. Measured locally: ~89 KB of HTML ≈ 7.5 ms, ~157 KB ≈ 11 ms, against the Workers Free plan's
//    10 ms. Pages over the budget fail the build.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";

/** Rendered by src/app/flights/[slug]/page.tsx only when the page has fares. */
export const MARKER = "data-fares-checked=";
/** Some thin routes legitimately have no recent fares; a broken build has (almost) none anywhere. */
export const MIN_SHARE_WITH_FARES = 0.5;
/** Largest pre-rendered page HTML allowed, in bytes. Leaves headroom under the 10 ms CPU limit. */
export const MAX_PAGE_BYTES = 120_000;

/** @param {Record<string, string>} pages slug → pre-rendered HTML */
export function summarise(pages) {
  const slugs = Object.keys(pages).sort();
  const empty = slugs.filter((slug) => !pages[slug].includes(MARKER));
  return { total: slugs.length, withFares: slugs.length - empty.length, empty };
}

/** @param {{ total: number, withFares: number }} s */
export function isDeployable(s) {
  return s.total > 0 && s.withFares / s.total >= MIN_SHARE_WITH_FARES;
}

/** @param {Record<string, number>} sizes page path → HTML bytes */
export function oversized(sizes) {
  return Object.entries(sizes)
    .filter(([, bytes]) => bytes > MAX_PAGE_BYTES)
    .map(([path, bytes]) => ({ path, bytes }))
    .sort((a, b) => b.bytes - a.bytes);
}

function htmlFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? htmlFiles(p) : p.endsWith(".html") ? [p] : [];
  });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const appDir = process.argv[2] ?? ".next/server/app";
  const flightsDir = join(appDir, "flights");
  let failed = false;

  const routePages = Object.fromEntries(
    htmlFiles(flightsDir).map((f) => [relative(flightsDir, f).replace(/\.html$/, ""), readFileSync(f, "utf8")]),
  );
  const s = summarise(routePages);
  console.log(`\nRoute pages with fares: ${s.withFares} of ${s.total} (${flightsDir})`);
  if (s.empty.length) console.log(`No recent fares: ${s.empty.join(", ")}`);
  if (!isDeployable(s)) {
    failed = true;
    console.error(
      s.total === 0
        ? "✘ No pre-rendered route pages found. Run the build first."
        : `✘ Fewer than ${MIN_SHARE_WITH_FARES * 100}% of route pages have fares: the fare API probably failed during the build.`,
    );
  }

  const sizes = Object.fromEntries(htmlFiles(appDir).map((f) => [relative(appDir, f), statSync(f).size]));
  const biggest = Object.entries(sizes).sort((a, b) => b[1] - a[1])[0];
  if (biggest) console.log(`Largest page: ${biggest[0]} (${Math.round(biggest[1] / 1000)} KB, budget ${MAX_PAGE_BYTES / 1000} KB)`);
  for (const { path, bytes } of oversized(sizes)) {
    failed = true;
    console.error(`✘ ${path} is ${Math.round(bytes / 1000)} KB: over budget, it would push Worker CPU past 10 ms per request.`);
  }

  if (failed) {
    console.error("Not deploying.\n");
    process.exit(1);
  }
  console.log("✔ Build has fares and every page is within budget. OK to deploy.\n");
}
