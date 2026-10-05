# CLAUDE.md — MilehighclubZA

Flight meta-search for South African travellers. We show recently-found cheapest fares and earn
affiliate commission when users click out to a partner and book. We do NOT sell tickets and we do NOT scrape.

## Non-negotiables
- **No scraping** of airline/OTA/meta-search sites, ever (ToS + SA Cybercrimes Act risk). Data comes only from
  partner APIs (Travelpayouts now; Skyscanner/KAYAK/Aviasales live search once traffic qualifies).
- **Never present cached prices as live.** Every price shows "Found Xh ago · price may have changed".
- **Demo data must always be labelled.** `SampleProvider` is only used when `TRAVELPAYOUTS_TOKEN` is unset, and
  `<DemoBanner/>` must render on any page that shows fares.
- **/go never accepts a URL from the client.** Partner URLs are built server-side in `src/lib/deeplinks.ts`
  (prevents open redirects and affiliate-link tampering).
- **POPIA:** no analytics/marketing scripts unless `readConsent() === "all"`. Email/WhatsApp alerts need
  double opt-in with stored consent text + timestamp (see roadmap).
- Partner rules: no bidding on partner brand keywords, no auto-redirects, no "error fare" posts via Skyscanner.
- Keep the brand name only in `src/config/site.ts`.

## Stack
Next.js 15 (App Router, TS, Tailwind v4) on Vercel · Supabase Postgres (click + conversion logs) · Vitest 5 ·
GitHub Actions CI. Node 22 (`.nvmrc`). `.devcontainer/` sets up GitHub Codespaces (Node 22 + Claude Code,
`npm ci` on create, port 3000). It's the default dev environment when local npm is blocked (e.g. corporate VPN).

## Commands
- `npm run dev` — local dev (demo mode without env vars)
- `npm test` — Vitest (one file per module in `tests/`) · `npm run typecheck` · `npm run lint`
- `npm run check` — lint + typecheck + tests + build; must pass before any commit (CI runs the same)
- `postcss` is pinned via `overrides` in package.json to a patched version — keep it until Next ships the fix

## Map
- `src/config/site.ts` — brand, URL, locale
- `src/data/airports.ts` — supported airports (add here first)
- `src/data/routes.ts` — `routePairs` = published SEO route pages (both directions auto-generated)
- `src/lib/fares/` — `FareProvider` interface; `travelpayouts.ts` (real), `sample.ts` (demo); `index.ts` picks one
- `src/lib/deeplinks.ts` — partner URL builders + sub-ID; formats marked VERIFY must be checked against dashboards
- `src/lib/clicks.ts` — click logging to Supabase (`clicks` table), never throws
- `src/app/go/route.ts` — validate → log click (sub-ID) → 302 to partner
- `src/app/flights/[slug]` — ISR route pages (6h), price calendars, FAQ JSON-LD from real data only
- `supabase/migrations/` — schema; `revenue_by_page` view joins clicks↔conversions on sub-ID

## Open items to verify (do not guess)
1. Travelpayouts: `currency=zar` support, `sub_id` param name on Aviasales links, payout methods for SA residents.
2. Travelstart (Impact): sub-ID param (`subId1`?), deep-link URL format for a specific search, attribution window.
3. Whether Aviasales data includes FlySafair / LIFT domestic fares. If not, show "check airline direct" notes.

## Conventions
- Server components by default; `"use client"` only for interactive bits.
- Money is whole rand (`number`), formatted with `formatZar`.
- Add tests in `tests/` for any new parsing, URL building or provider normalisation.
- Commit messages: imperative, short; small focused commits.
