# CLAUDE.md — MilehighclubZA

Flight meta-search for South African travellers. We show recently-found cheapest fares and earn
affiliate commission when users click out to a partner and book. We do NOT sell tickets and we do NOT scrape.

## Non-negotiables
- **No scraping** of airline/OTA/meta-search sites, ever (ToS + SA Cybercrimes Act risk). Data comes only from
  partner APIs (Travelpayouts now; Skyscanner/KAYAK/Aviasales live search once traffic qualifies).
- **Never present cached prices as live.** Every price shows when we checked it, as an absolute SA time
  ("Checked 09 Oct, 14:05 SAST · cached price, may have changed"). Never a relative "2h ago": pages are
  pre-rendered, so a relative time would freeze and make old prices look fresh. The partner API has no
  per-price found-at time, so `Fare.checkedAt` is our fetch time.
- **Demo data must always be labelled.** `SampleProvider` is only used when `TRAVELPAYOUTS_TOKEN` is unset, and
  `<DemoBanner/>` must render on any page that shows fares (search shows `<DemoNotice/>` from the API's `demo` flag).
- **/go never accepts a URL from the client.** Partner URLs are built server-side in `src/lib/deeplinks.ts`
  (prevents open redirects and affiliate-link tampering).
- **POPIA:** no analytics/marketing scripts unless `readConsent() === "all"`. Email/WhatsApp alerts need
  double opt-in with stored consent text + timestamp (see roadmap).
- Partner rules: no bidding on partner brand keywords, no auto-redirects, no "error fare" posts via Skyscanner.
- Keep the brand name only in `src/config/site.ts`. The Worker name in `wrangler.jsonc` (`fares-za`) is
  deliberately brand-neutral; renaming it creates a new Worker.
- **Stay inside the Workers Free plan's 10 ms CPU per request.** Pages are static (`revalidate = false`) and
  rebuilt every 6h by `.github/workflows/deploy.yml`; never add `revalidate = <seconds>` (the read-only cache in
  `open-next.config.ts` can't serve it; `tests/deploy.test.ts` enforces this). Anything per-request goes through a
  light JSON route handler (like `/api/fares`), not a server-rendered dynamic page (measured 18–28 ms).

## Stack
Next.js 15 (App Router, TS, Tailwind v4) on Cloudflare Workers Free via `@opennextjs/cloudflare` (pinned:
1.20.10 pulls a `glob` with a high advisory) · Supabase Postgres (click + conversion logs) · Vitest 5 ·
GitHub Actions CI + scheduled Deploy. Node 22 (`.nvmrc`). `.devcontainer/` sets up GitHub Codespaces (Node 22 + Claude Code,
`npm ci` on create, ports 3000 and 8787 for `cf:preview`). It's the default dev environment when local npm is blocked (e.g. corporate VPN).

## Commands
- `npm run dev` — local dev (demo mode without env vars)
- `npm test` — Vitest (one file per module in `tests/`) · `npm run typecheck` · `npm run lint`
- `npm run check` — lint + typecheck + tests + build; must pass before any commit (CI runs the same, with
  `npm run cf:build` in place of `build`)
- `npm run cf:preview` — build and run in the real Workers runtime at http://localhost:8787; use it to test
  anything Cloudflare-specific
- `npm run verify:build` — after a build, fails if < 50% of route pages have fares (CI and Deploy run it; relies
  on the `data-fares-checked` attribute on route pages, so keep it)
- `npm run smoke:deploy -- <url>` — post-deploy checks (the Deploy workflow runs it)
- `postcss` is pinned via `overrides` in package.json to a patched version — keep it until Next ships the fix

## Map
- `src/config/site.ts` — brand, URL, locale
- `src/data/airports.ts` — supported airports (add here first)
- `src/data/routes.ts` — `routePairs` = published SEO route pages (both directions auto-generated)
- `src/lib/fares/` — `FareProvider` interface; `travelpayouts.ts` (real), `sample.ts` (demo); `index.ts` picks one
- `src/lib/deeplinks.ts` — partner URL builders + sub-ID; formats marked VERIFY must be checked against dashboards
- `src/lib/clicks.ts` — click logging to Supabase (`clicks` table), never throws
- `src/app/go/route.ts` — validate → log click (sub-ID) → 302 to partner
- `src/app/api/fares/route.ts` + `src/components/SearchResults.tsx` — search: static page, results fetched as JSON
- `src/lib/fares/search.ts` — search validation and exact + flexible results (shared by API and client)
- `src/app/flights/[slug]` — static route pages (rebuilt every 6h), price calendars, FAQ JSON-LD from real data only
- `src/app/december-holiday-flights` + `src/lib/festive.ts` + `src/data/festive.ts` — festive season page. Add each
  year's school dates to `schoolSummerBreak` from the gazetted DBE calendar (missing years just hide them)
- `open-next.config.ts` · `wrangler.jsonc` · `.github/workflows/deploy.yml` — Cloudflare build, Worker, deploys
- `supabase/migrations/` — schema; `revenue_by_page` view joins clicks↔conversions on sub-ID

## Open items to verify (do not guess)
`npm run verify:travelpayouts` answers items 1 and 3 with live data. Run it whenever the token changes.
1. Travelpayouts: `currency=zar` support, `sub_id` param name on Aviasales links, payout methods for SA residents.
2. Travelstart (Impact): sub-ID param (`subId1`?), deep-link URL format for a specific search, attribution window.
3. Whether Aviasales data includes FlySafair / LIFT domestic fares. If not, show "check airline direct" notes.

## Conventions
- Server components by default; `"use client"` only for interactive bits.
- Money is whole rand (`number`), formatted with `formatZar`.
- Add tests in `tests/` for any new parsing, URL building or provider normalisation.
- Commit messages: imperative, short; small focused commits.
