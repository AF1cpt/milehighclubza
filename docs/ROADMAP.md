# Roadmap — sequenced for profit

Each step is triggered by a milestone, not a date. Doing things early (e.g. applying to Skyscanner with no
traffic) gets rejected; doing them late leaves money on the table.

## Phase 0 — Now (MVP, demo mode) ✅
- [x] Search, route pages, click-out tracking, compliance pages
- [x] 40 automated tests, CI on GitHub Actions, 0 audit vulnerabilities
- [x] Supabase project `milehighclubza` with `clicks`, `conversions`, `revenue_by_page`
- [ ] Buy a domain, deploy to Vercel
- [ ] Google Search Console + sitemap

## Phase 1 — Day one partners (no traffic needed)
Trigger: site is live on a real domain with the legal pages up.
- [ ] Join **Travelpayouts** → set `TRAVELPAYOUTS_TOKEN` + `TRAVELPAYOUTS_MARKER` (demo banner disappears)
- [ ] Join **Travelstart** affiliate on Impact → set `TRAVELSTART_AFFILIATE_LINK`
- [ ] Verify the VERIFY items in `CLAUDE.md` (sub-ID params, ZAR, FlySafair/LIFT coverage)
- [ ] Add Supabase keys to Vercel → click logging live (project + schema already exist)
- [ ] Join **Trip.com** (hotels 5.5%) → add a hotel cross-sell block on destination route pages

## Phase 2 — Content engine (weeks 4–12)
Trigger: real fares showing.
- [ ] Expand `routePairs` to ~150 routes; noindex any route with < 14 days of data
- [ ] Price-history table (`fare_snapshot`) written by a daily job → "cheapest month" charts from our own data
- [ ] School-holiday + long-weekend pages (SA calendar)
- [ ] Bag-inclusive price toggle (verified carrier rules table)
- [ ] Analytics (consent-gated)

## Phase 3 — Owned audience (≈1k visitors/month)
- [ ] Email deal alerts with double opt-in (POPIA s69): store consent text version + timestamp + IP
- [ ] WhatsApp Channel for broadcast deals; WhatsApp Business API alerts later
- [ ] Nightly conversion import (Impact API, Travelpayouts stats API) → `conversions` table → `revenue_by_page`

## Phase 4 — Scale partners
- [ ] ≥5k unique visitors/month → apply **Skyscanner** affiliate (Impact)
- [ ] ≥10k visitors → apply **KAYAK Affiliate Network**
- [ ] ≥50k MAU → **Aviasales live Search API**, Kiwi via Travelpayouts
- [ ] ≥100k MAU → **Skyscanner Travel API** (live prices, no caching)
- [ ] Negotiate Travelstart deals feed / higher CPA tier with booking volume as evidence

## Phase 5 — Optional .NET worker
Move scheduled jobs (price prefetch, alert evaluation, conversion import) to a C# worker if they outgrow
Vercel cron. The `FareProvider` interface is the seam.
