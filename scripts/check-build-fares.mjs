#!/usr/bin/env node
// Build guard: npm run verify:build (CI and the Deploy workflow run it after the build, before deploy).
// Pages are rebuilt every 6 hours. If the fare API was down, rate-limited or rejected the token during
// a build, the provider returns no fares and every route page says "No recent fares". This refuses to
// deploy such a build, so the last good version stays live (GitHub emails you about the failed run).
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

/** Rendered by src/app/flights/[slug]/page.tsx only when the page has fares. */
export const MARKER = "data-fares-checked=";
/** Some thin routes legitimately have no recent fares; a broken build has (almost) none anywhere. */
export const MIN_SHARE_WITH_FARES = 0.5;

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

function readPages(dir) {
  if (!existsSync(dir)) return {};
  return Object.fromEntries(
    readdirSync(dir)
      .filter((f) => f.endsWith(".html"))
      .map((f) => [f.replace(/\.html$/, ""), readFileSync(join(dir, f), "utf8")]),
  );
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const dir = process.argv[2] ?? ".next/server/app/flights";
  const s = summarise(readPages(dir));
  console.log(`\nRoute pages with fares: ${s.withFares} of ${s.total} (${dir})`);
  if (s.empty.length) console.log(`No recent fares: ${s.empty.join(", ")}`);
  if (!isDeployable(s)) {
    console.error(
      s.total === 0
        ? "✘ No pre-rendered route pages found. Run the build first."
        : `✘ Fewer than ${MIN_SHARE_WITH_FARES * 100}% of route pages have fares: the fare API probably failed during the build. Not deploying.`,
    );
    process.exit(1);
  }
  console.log("✔ Build has fares. OK to deploy.\n");
}
