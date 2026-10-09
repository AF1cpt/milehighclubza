# Roadmap — sequenced for profit

Each step is triggered by a milestone, not a date. Doing things early (e.g. applying to Skyscanner with no
traffic) gets rejected; doing them late leaves money on the table.

## Goal and decisions (9 Oct 2026)

- **Target:** about **R20k/month within 12–18 months**. Under 3 hours a week until launch, more time after.
- **Forecast honestly at 3 months.** My mid-case guess is ~R300 per 1,000 visitors from flights alone (15%
  click out × 2% of clicks book × R100 average commission). Those inputs are placeholders, not benchmarks;
  replace them with our own clicks and bookings once they flow.
- **Hosting:** Cloudflare Workers **Free plan**. Pages are static and rebuilt with fresh fares every 6 hours by
  `.github/workflows/deploy.yml`; search loads results from `/api/fares`. Measured locally, every request uses
  ~7–8 ms CPU against the 10 ms limit. If that's too tight in production, Workers Paid ($5/month) lets pages
  refresh on Cloudflare again (R2 cache + Durable Object queue).
- **Name:** renaming before launch. The owner picks it; the domain is bought but waits on the name.
- **Analytics:** strict consent only (nothing before "Accept all"). Traffic proof comes from Google Search
  Console and the server-side click log, which need no cookies.

## What one booking pays (confirm in each dashboard before relying on it)

| Partner | Commission | On a R1,500 ticket | On a R15,000 ticket | Status |
|---|---|---|---|---|
| Aviasales (Travelpayouts) | ~1.1–1.3% of ticket | R17–R20 | R165–R195 | Built |
| Travelstart (Impact) | Flat per booking; sources say R72–R175 by tier | R72–R175 | R72–R175 | Built, lands on homepage |
| Kiwi.com (Travelpayouts) | 3%; reportedly sells LIFT | R45 | R450 | Not built |
| DiscoverCars (Travelpayouts) | 56% of their income + 24% on Full Coverage, 365-day cookie | | | Not built |
| Airalo eSIM | ~10%, 30-day cookie | | | Not built |
| Hotels (Trip.com / Booking.com) | ~5% / ~4% (Booking.com now only via CJ or Awin) | | | Not built |

Domestic: Travelstart's flat fee beats Aviasales about 5×. International: Kiwi's 3% beats Aviasales' ~1.2%.
Flights alone pay thinly; add-ons and an owned audience are where the margin is.

## Phase 0 — Launch, before the December peak

Trigger: now. Done when real fares show on the live domain and the first click lands in Supabase.

**Owner:**
- [ ] Pick the name; check the domain and trademarks
- [ ] Create a free Cloudflare account; add `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` as GitHub secrets
- [ ] Set the `NEXT_PUBLIC_SITE_URL` repository variable (workers.dev URL first, then the domain)
- [ ] Join Travelpayouts; add `TRAVELPAYOUTS_TOKEN` + `TRAVELPAYOUTS_MARKER` as GitHub secrets
- [ ] Add `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` as GitHub secrets
- [ ] Connect the domain in Cloudflare (Worker → Settings → Domains & Routes)
- [ ] Google Search Console: verify the domain, submit the sitemap
- [ ] Apply to Travelstart on Impact once the site is live; ask for the deep-link format and sub-ID parameter

**Claude:**
- [x] Honest "Checked … SAST" price labels (no fake "found 1h ago")
- [x] Cloudflare Workers port with scheduled static rebuilds, deploy smoke test
- [x] Supabase project restored; schema, view and RLS verified
- [ ] Apply the new name (`src/config/site.ts`, `tests/format.test.ts`)
- [ ] Run `npm run verify:travelpayouts` once the token exists (answers ZAR and FlySafair coverage)
- [ ] After the first deploy, check CPU time per request in Workers Logs

## Phase 1 — Earn more per visitor (weeks 2–6, no traffic needed)

Trigger: real fares showing.
- [ ] Widen `/go` beyond flights (click target per product) + migration for the `clicks.partner` constraint
- [ ] Car hire block on domestic destination pages (DiscoverCars)
- [ ] eSIM block on international route pages (Airalo)
- [ ] Kiwi.com as a second flight partner
- [ ] Hotels block (Trip.com, or Booking.com via Awin/CJ if SA publishers are eligible)
- [ ] Travel insurance on Schengen routes (Amsterdam, Paris): partner still to research

## Phase 2 — Measure what earns (weeks 2–8)

- [ ] Monthly import of Impact + Travelpayouts booking reports into `conversions` (manual first, ~10 min)
- [ ] Weekly clicks-by-page summary from `clicks` and `revenue_by_page`
- [ ] Search Console numbers as traffic evidence for partner applications

## Phase 3 — Traffic on autopilot (weeks 3–16)

- [ ] Festive season, school holiday and long-weekend pages (SA calendar). Time-sensitive: December first
- [ ] Daily `fare_snapshot` job → our own price history → "cheapest month" charts nobody else has
- [ ] Monthly "SA fare index" page, pitched to local media for links
- [ ] Expand `routePairs` towards ~150; noindex any route with < 14 days of data. Every page must carry real
      data: Google's spam policies target mass-produced thin pages
- [ ] Bag-inclusive price toggle (verified carrier rules table)

## Phase 4 — Owned audience (≈1k visitors/month, once more time is available)

- [ ] WhatsApp Channel for deals (WhatsApp says admins can't see followers' phone numbers)
- [ ] Email deal alerts with double opt-in (POPIA s69): store consent text version + timestamp + IP
- [ ] Automate the conversion import (Impact API, Travelpayouts stats API)

## Phase 5 — Scale partners

- [ ] ~5k unique visitors/month → apply **Skyscanner** affiliate (Impact; threshold from third-party sources)
- [ ] ≥10k visitors → apply **KAYAK Affiliate Network**
- [ ] ≥50k MAU → **Aviasales live Search API**, Kiwi via Travelpayouts
- [ ] ≥100k MAU → **Skyscanner Travel API** (live prices, no caching)
- [ ] Negotiate a Travelstart deals feed / higher CPA tier with booking volume as evidence

## Phase 6 — Optional .NET worker

Move scheduled jobs (price prefetch, alert evaluation, conversion import) to a C# worker if they outgrow
GitHub Actions. The `FareProvider` interface is the seam.

## Known risks

- **FlySafair coverage is unknown.** If Aviasales data lacks it, "cheapest" on domestic routes may not be true.
- **Travelstart clicks land on its homepage** until we get the deep-link format: users must search again.
- **Free plan headroom is thin** (~7–8 ms measured locally vs a 10 ms limit). Cloudflare tolerates occasional
  overruns but stops Workers that overrun consistently (Error 1102). Fallback: Workers Paid, $5/month.
- **Scheduled rebuilds depend on GitHub Actions.** Runs can start late. In a public repo, scheduled workflows
  are disabled after 60 days without repository activity; GitHub emails first, and you re-enable them in the
  Actions tab. Prices keep their "Checked …" time, so a missed rebuild shows as older times, never as fresh.
- **Supabase free projects pause when idle.** Click logging fails silently while paused; restore it in the
  Supabase dashboard. Real traffic keeps it awake.
- **Payouts:** Travelpayouts pays from $50 via PayPal or $400 by bank transfer to a USD/EUR account; available
  methods depend on country. Affiliate income is taxable: check with an accountant.
