# MilehighclubZA

**Cheapest flights from South Africa, found fast.**

MilehighclubZA is a flight meta-search site for South African travellers. It shows the cheapest recently-found
fares for domestic routes (Johannesburg, Cape Town, Durban, Gqeberha and more) and international flights from
JNB/CPT, then sends the traveller to a booking partner. **We earn affiliate commission on bookings made through
our links.** We never sell tickets and we never scrape airline or travel sites.

| | |
|---|---|
| **Stack** | Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · Supabase Postgres · Vitest |
| **Hosting** | Cloudflare Workers, Free plan (OpenNext adapter); static pages rebuilt every 6h by GitHub Actions |
| **Fare data** | Travelpayouts / Aviasales Data API (cached prices), with a labelled demo fallback |
| **Revenue** | Travelstart (flat rand per booking) and Aviasales (revenue share) affiliate click-outs |
| **Status** | MVP complete, running in demo mode until partner credentials are added |

---

## Contents

1. [Quick start](#quick-start)
2. [Scripts](#scripts)
3. [Environment variables](#environment-variables)
4. [What's in the MVP](#whats-in-the-mvp)
5. [How it works](#how-it-works)
6. [Project structure](#project-structure)
7. [Database](#database)
8. [Testing](#testing)
9. [Deploying](#deploying)
10. [Go-live checklist](#go-live-checklist)
11. [Common tasks](#common-tasks)
12. [Compliance](#compliance)
13. [Troubleshooting](#troubleshooting)
14. [Working with Claude Code](#working-with-claude-code)

---

## Quick start

Requires **Node.js 20.9+** (22 recommended, see `.nvmrc`).

```bash
git clone https://github.com/AF1cpt/milehighclubza.git
cd milehighclubza
npm install
cp .env.example .env.local      # Windows PowerShell: Copy-Item .env.example .env.local
npm run dev                     # http://localhost:3000
```

> **On a work laptop or behind a corporate VPN?** Use [GitHub Codespaces](#develop-in-github-codespaces-with-claude-code)
> instead. It runs in the cloud, so company firewalls and certificate inspection don't get in the way.

With an empty `.env.local` the site runs in **demo mode**. Every page works, prices are realistic sample data,
and a yellow banner on every fare page says so. You can build, test and deploy before any partner has approved you.

### Develop in GitHub Codespaces (with Claude Code)

The repo includes `.devcontainer/devcontainer.json`, so every Codespace starts with Node 22, all packages
installed, Claude Code (CLI and VS Code panel), ESLint and Tailwind extensions, and port 3000 forwarded.

1. On the repo page: **Code → Codespaces → Create codespace on main**. The first build takes a few minutes and
   runs `npm ci` for you.
2. In the terminal: `npm run dev`. A preview of the site opens. You can also use the **Ports** tab → port 3000 →
   open in browser.
3. Open a second terminal (the **+** button) and run `claude`. Follow the sign-in link (needs a Claude Pro, Max,
   Team or Enterprise plan). If the browser says it's done but the terminal is still waiting, copy the code from
   the browser and paste it into the terminal.
4. A good first prompt: *Read CLAUDE.md and docs/ROADMAP.md, run `npm run check`, then start Phase 1.*

**Stay signed in across rebuilds (optional):** run `claude setup-token` once, then save the token as a
Codespaces secret named `CLAUDE_CODE_OAUTH_TOKEN` at
[github.com/settings/codespaces](https://github.com/settings/codespaces), with access to this repo.
Partner keys (`TRAVELPAYOUTS_TOKEN` etc.) can be stored the same way, never in the code.

**Cost:** personal GitHub accounts include a monthly free Codespaces allowance (check yours under
Settings → Billing). Codespaces stop after 30 idle minutes; stop yours manually when you're done to save hours.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Local dev server with hot reload |
| `npm run build` | Production build (pre-renders all route pages) |
| `npm start` | Serve the production build |
| `npm test` | Unit and integration tests (Vitest) |
| `npm run lint` | ESLint (Next.js rules) |
| `npm run typecheck` | TypeScript, no emit |
| `npm run check` | All four of the above, the same as CI. Run before every push |
| `npm run verify:travelpayouts` | Go-live check: token works, prices in ZAR, coverage per route, FlySafair present, sample affiliate link |
| `npm run verify:build` | After a build: fails if fewer than half the route pages have fares (CI and Deploy run it) |
| `npm run cf:preview` | Build for Cloudflare and run it locally in the real Workers runtime (http://localhost:8787) |
| `npm run cf:build` | Cloudflare Workers build only (CI runs this instead of `npm run build`) |
| `npm run cf:deploy` | Build and deploy from your machine (needs `npx wrangler login`); prefer the Deploy workflow |
| `npm run smoke:deploy -- <url>` | Post-deploy checks against a live URL: pages, search API, real fares when a token is set |

## Environment variables

Locally, copy `.env.example` to `.env.local` and fill values in as partner approvals land. In production they
live in GitHub (see [Deploying](#deploying)): the Deploy workflow uses them at build time and uploads the
server-side ones to the Worker. Every one is optional; the site degrades gracefully without it.

| Variable | Without it | With it | Where to get it |
|---|---|---|---|
| `TRAVELPAYOUTS_TOKEN` | Demo mode: sample prices + banner | Real cached fares from Aviasales | Travelpayouts → Profile → API token |
| `TRAVELPAYOUTS_MARKER` | Aviasales clicks don't earn | Commission on Aviasales bookings | Travelpayouts → your partner ID (marker) |
| `TRAVELSTART_AFFILIATE_LINK` | Travelstart button hidden | "View on Travelstart" shown first | Impact → Travelstart → tracking link |
| `SUPABASE_URL` | Clicks logged to server console | Clicks stored in Postgres | Supabase → Project settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | (as above) | (as above) | Supabase → Project settings → API → `service_role` |
| `NEXT_PUBLIC_SITE_URL` | Canonicals point at localhost | Correct canonicals and sitemap | Your domain, e.g. `https://milehighclub.co.za` |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Placeholder email on privacy page | Real contact for POPIA requests | Your inbox |

> **Never** commit `.env.local` or expose `SUPABASE_SERVICE_ROLE_KEY` to the browser. Only `NEXT_PUBLIC_*`
> variables reach the client. `.gitignore` already excludes every `.env*` file except `.env.example`.

## What's in the MVP

- **Search**: return or one-way between 18 airports. Results show your exact dates plus a "cheaper if you're
  flexible this month" list. One "Cheapest" badge marks the lowest price on the page.
- **44 route pages**, e.g. `/flights/johannesburg-to-cape-town`, built for Google:
  - cheapest 5 dates over the next 3 months
  - a price calendar per month (tap a bar to search that day; green is the cheapest day)
  - FAQ answers generated from real data: cheapest month, cheapest weekday, airlines seen
  - Breadcrumb and FAQ structured data (JSON-LD), canonical URLs, rebuilt with fresh fares every 6 hours
- **Routes index** at `/flights`, split into domestic and international.
- **December holidays page** at `/december-holiday-flights`: cheapest days to fly out before Christmas and home
  after New Year on 8 holiday routes, key dates (public holidays computed from the Public Holidays Act, school
  dates from `src/data/festive.ts`), FAQ from real data. Promoted on the home page from September to 15 January.
- **Click-out tracking** at `/go`: every partner click gets a unique sub-ID so commissions can be traced back to
  the exact page and route that earned them.
- **Compliance**: affiliate disclosure (`/how-we-make-money`), POPIA privacy draft (`/privacy`), cookie consent
  banner, "Checked 09 Oct, 14:05 SAST · cached price, may have changed" on every fare.
- **SEO plumbing**: `sitemap.xml`, `robots.txt` (blocks `/go` and `/search` from indexing), Open Graph metadata.
- **Performance**: about 108 kB per page. Pages are pre-rendered; only search fetches data in the browser (a
  small JSON response), which suits prepaid mobile data.

## How it works

### A search, end to end

```
Browser ── /search?o=JNB&d=CPT&dep=2026-11-14&ret=2026-11-18    (static page shell)
   │  <SearchResults/> validates the query, then
   ▼
GET /api/fares?o=JNB&d=CPT&dep=…&ret=…  ──►  getFareProvider()
                                                ├─ TRAVELPAYOUTS_TOKEN set → TravelpayoutsProvider
                                                │     GET api.travelpayouts.com/aviasales/v3/prices_for_dates
                                                │     (token in header, currency=zar, live: no cache)
                                                └─ not set → SampleProvider (deterministic demo prices)
   │  JSON: { demo, partners, exact, flexible, cheapestOverall }
   ▼
FareList (in the browser) → "View on Travelstart / Aviasales" → /go?p=…&o=…&d=…&dep=…
```

Route pages and the home page don't call the API per visit: they're pre-rendered at build time, and the
scheduled deploy rebuilds them every 6 hours.

### A click-out, end to end

```
/go?p=aviasales&o=JNB&d=CPT&dep=2026-11-14&price=1890&src=route:johannesburg-to-cape-town
   │ 1. validate: known partner, known airports, origin ≠ destination, real dates
   │    (anything invalid → redirect home, nothing logged)
   │ 2. generate sub-ID (16 hex chars)
   │ 3. build the partner URL on the server (never from user input, so no open redirect)
   │ 4. log click → Supabase `clicks` (or console if not configured; a failed log never blocks the user)
   ▼
302 → https://www.aviasales.com/search/JNB1411CPT1?marker=…&sub_id=<sub-ID>
```

When the partner reports a booking, its report carries the same sub-ID. Import it into `conversions` and the
`revenue_by_page` view shows which pages actually make money.

### Why cached prices, not live

Live flight-search APIs (Skyscanner, Aviasales Search, Kiwi) need 50k–100k monthly users before they'll grant
access. The Travelpayouts Data API is open from day one but returns prices other users found recently. That's
why every price says when we checked it and that it may have changed. See `docs/ROADMAP.md` for when the live
APIs unlock.

### Why static pages on a schedule

The Cloudflare Workers Free plan allows 10 ms of CPU per request. Measured in the Workers runtime,
re-rendering a route page or server-rendering search took 18–28 ms, while serving a pre-rendered page or the
JSON search API takes ~7–8 ms. So nothing heavy runs on Cloudflare: GitHub Actions (no CPU limit) renders
every page with fresh fares every 6 hours and deploys the result. Labels show the absolute time we checked
each price, so a late rebuild shows older times rather than looking fresh. Workers Paid ($5/month) would let
pages refresh on Cloudflare instead; see `open-next.config.ts`.

## Project structure

```
src/
├── app/
│   ├── page.tsx                  Home: search + popular routes
│   ├── search/page.tsx           Search results shell (not indexed)
│   ├── api/fares/route.ts        Search results as JSON (validated, live provider call)
│   ├── flights/page.tsx          All routes index
│   ├── flights/[slug]/page.tsx   SEO route pages (static, rebuilt every 6h)
│   ├── december-holiday-flights/ Festive season page (static, rebuilt every 6h)
│   ├── go/route.ts               Click-out: validate → log → 302
│   ├── how-we-make-money/        Affiliate disclosure
│   ├── privacy/                  POPIA privacy policy (draft)
│   ├── sitemap.ts · robots.ts    SEO
│   ├── layout.tsx · globals.css  Shell, footer disclosure, theme
├── components/
│   ├── SearchForm.tsx            Client form with validation
│   ├── SearchResults.tsx         Client: fetches /api/fares and renders results
│   ├── FareList.tsx              Fare cards + partner buttons (server or browser)
│   ├── PriceCalendar.tsx         CSS-only month bar chart
│   ├── DemoBanner.tsx            Shown whenever sample data is in use (DemoNotice is the markup)
│   └── CookieConsent.tsx         POPIA consent banner
├── config/site.ts                Brand name, URL, locale (rename the site here only)
├── data/
│   ├── airports.ts               Supported airports
│   └── routes.ts                 Published route pages (`routePairs`)
└── lib/
    ├── fares/                    FareProvider interface, Travelpayouts, Sample, search, helpers
    ├── deeplinks.ts              Partner URL builders + sub-IDs
    ├── clicks.ts                 Click logging (Supabase or console)
    └── format.ts                 Rand, dates, "checked at" times, airline names
supabase/migrations/              Database schema
scripts/                          Travelpayouts go-live check, post-deploy smoke test
open-next.config.ts · wrangler.jsonc   Cloudflare Workers build and Worker config
.github/workflows/                CI (every push/PR) and Deploy (after green CI on main, every 6h, manual)
tests/                            Vitest suites (one per module)
docs/ROADMAP.md                   What to build next, and at what traffic level
CLAUDE.md                         Rules and map for Claude Code
```

## Database

Supabase project **milehighclubza** (London region). The schema lives in
`supabase/migrations/0001_clicks_and_conversions.sql` and is already applied.

| Object | Purpose |
|---|---|
| `clicks` | One row per partner click. `id` is the sub-ID sent to the partner |
| `conversions` | Partner-reported bookings, imported later, joined on `sub_id` |
| `revenue_by_page` | View: clicks, bookings and commission per source page |

Row-level security is **on** with no public policies, so only the server (service role key) can read or write.
The Supabase linter reports this as "RLS enabled, no policy" at INFO level; that's intentional.

To recreate it elsewhere, paste the migration into the Supabase SQL editor, or run `supabase db push` with the CLI.

Free Supabase projects pause after a stretch of inactivity. While paused, click logging fails (the redirect
still works, but the click is lost). Restore it from the Supabase dashboard; steady traffic keeps it awake.

## Testing

```bash
npm test          # 65 tests, about 2 seconds
npm run check     # lint + typecheck + tests + build, same as CI
```

| File | Covers |
|---|---|
| `tests/format.test.ts` | Brand config, rand formatting, dates, absolute SAST "checked" times, airline names |
| `tests/routes.test.ts` | Airport data integrity, route slugs, both directions, domestic flag |
| `tests/fares.test.ts` | Travelpayouts normalising, token kept out of URLs, error handling, sample data, helpers |
| `tests/deeplinks.test.ts` | Partner URL formats, sub-IDs, Travelstart toggle, device detection |
| `tests/go.test.ts` | Full `/go` handler: redirect, logging, unique sub-IDs, 8 rejection cases, no-cache headers |
| `tests/search.test.ts` | Search validation, flexible-dates dedupe, always-live provider calls |
| `tests/api-fares.test.ts` | Full `/api/fares` handler: demo flag, partners, 400s, cache and noindex headers |
| `tests/deploy.test.ts` | Guards the static Cloudflare setup: no page with time-based `revalidate` |
| `tests/check-build-fares.test.ts` | Build guard: counts route pages with fares, blocks a deploy when most are empty |

GitHub Actions (`.github/workflows/ci.yml`) runs lint, typecheck, tests and the Cloudflare build on every push and PR. It also
runs `npm audit` twice: **production dependencies must be clean** (this blocks the build), and dev tooling is
reported but doesn't block, because tools like the linter never ship to users and sometimes have advisories
with no patched version yet. Check the "Audit dev tooling" step now and then, and update when a fix lands.

**Manual smoke test** after `npm run cf:preview` (the real Workers runtime, http://localhost:8787), or
`npm run build && npm start`:

1. `/`: search JNB → CPT, return. Results load, one "Cheapest" badge, every fare says "Checked … SAST".
2. `/flights/johannesburg-to-cape-town`: 3 calendars, tapping a bar opens a search for that day.
3. Click "View on Aviasales": a new tab opens on aviasales.com and the server logs a `[click]` line.
4. `/flights/johannesburg-to-atlantis`: 404.
5. `/go?p=evil&o=JNB&d=CPT&dep=2026-11-14`: redirects home.
6. Resize to phone width: no sideways scrolling, buttons full width.

## Deploying

The site runs on the **Cloudflare Workers Free plan** through the OpenNext adapter. `.github/workflows/deploy.yml`
builds and deploys it after every green CI run on `main`, every 6 hours (that's what refreshes the fares), and
on demand (Actions → Deploy → Run workflow). Until Cloudflare is connected it skips with a notice instead of
failing.

### One-time setup

1. Create a free account at [dash.cloudflare.com](https://dash.cloudflare.com). Open **Workers & Pages** and note
   your workers.dev subdomain (choose one if asked). The site will be at `https://fares-za.<subdomain>.workers.dev`.
2. **My Profile → API Tokens → Create Token**, use the **Edit Cloudflare Workers** template. Copy your
   **Account ID** from the dashboard too.
3. In GitHub: **Settings → Secrets and variables → Actions**:

   | Name | Kind | Value |
   |---|---|---|
   | `CLOUDFLARE_API_TOKEN` | Secret | Token from step 2 |
   | `CLOUDFLARE_ACCOUNT_ID` | Secret | Account ID from step 2 |
   | `NEXT_PUBLIC_SITE_URL` | Variable | The workers.dev URL now, your domain later. Required |
   | `NEXT_PUBLIC_CONTACT_EMAIL` | Variable | Contact for POPIA requests |
   | `TRAVELPAYOUTS_TOKEN`, `TRAVELPAYOUTS_MARKER`, `TRAVELSTART_AFFILIATE_LINK`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Secrets | As in [Environment variables](#environment-variables); add them as approvals land |

4. **Actions → Deploy → Run workflow.** Before deploying it checks the build has fares (if the fare API failed
   during the build, it stops and the last good version stays live). The last step smoke-tests the live site,
   and fails if a Travelpayouts token is configured but the site still serves demo data.
5. **Custom domain:** add the domain to Cloudflare (free plan) and switch its nameservers to Cloudflare at your
   registrar. Then **Workers & Pages → fares-za → Settings → Domains & Routes → Add → Custom domain**. Update
   `NEXT_PUBLIC_SITE_URL` and run the workflow again.
6. In Google Search Console, verify the domain and submit `https://<domain>/sitemap.xml`.

GitHub is the one place to manage secrets: each deploy uploads the server-side ones to the Worker
(`wrangler deploy --secrets-file`). Deploys only run for pushes to this repository, never for fork PRs.

### Limits to watch

- **CPU:** 10 ms per request on Free. Measured locally at ~7–8 ms. Check real numbers in **Workers & Pages →
  fares-za → Logs** after the first deploy; consistent overruns return Error 1102. Fallback: Workers Paid
  ($5/month), then switch `open-next.config.ts` to the R2 + Durable Object queue setup.
- **Requests:** 100,000 per day on Free. Pages, `/api/fares` and `/go` count; JS, CSS and other static files
  are free and unlimited. A search costs 2 requests (page + API).
- **Schedule:** GitHub can start scheduled runs late. In a public repo, scheduled workflows are disabled after
  60 days without repository activity; re-enable Deploy in the Actions tab if GitHub emails you.

## Go-live checklist

- [ ] Name chosen (`src/config/site.ts`), domain connected in Cloudflare, `NEXT_PUBLIC_SITE_URL` variable set
- [ ] Cloudflare secrets set → Deploy workflow green, smoke test passes
- [ ] Travelpayouts approved → `TRAVELPAYOUTS_TOKEN` + `TRAVELPAYOUTS_MARKER` secrets → `npm run verify:travelpayouts` passes → demo banner gone
- [ ] Travelstart (Impact) approved → `TRAVELSTART_AFFILIATE_LINK` secret
- [ ] Supabase secrets set → a test click appears in `clicks`
- [ ] Verify the items marked `VERIFY` in `src/lib/deeplinks.ts` and `src/lib/fares/travelpayouts.ts`
      against your partner dashboards (sub-ID parameter names, `currency=zar`)
- [ ] Check whether partner data includes **FlySafair and LIFT** domestic fares
- [ ] Workers Logs: CPU per request comfortably under 10 ms
- [ ] Real contact email set; privacy policy reviewed before collecting any emails or phone numbers
- [ ] Search Console + sitemap submitted

## Common tasks

**Add a route page.** Add a pair to `routePairs` in `src/data/routes.ts`, e.g. `["DUR", "PLZ"]`. Both directions
are published, added to the sitemap and pre-rendered automatically. Both airports must exist in `airports.ts`.

**Add an airport.** Add an entry to `src/data/airports.ts` (IATA code, city, name, country, URL slug, domestic flag).
The route tests check codes and slugs are unique and well-formed.

**Add a partner.** Add it to the `Partner` type, `buildPartnerUrl`, `enabledPartners` and `partnerLabels` in
`src/lib/deeplinks.ts`, add it to `PARTNERS` in `src/app/go/route.ts`, add it to the `clicks.partner` check
constraint with a new migration, and write tests.

**Add a fare source.** Implement `FareProvider` in `src/lib/fares/`, return `Fare[]` sorted by price, and select
it in `getFareProvider()`.

**Rename the site.** Edit `src/config/site.ts`. Nothing else hard-codes the name.

## Compliance

- **No scraping.** All data comes from partner APIs we're licensed to use.
- **Honest prices.** Cached fares always show when we checked them (absolute SA time) and that they may change. No "guaranteed
  lowest" claims.
- **Affiliate disclosure** in the footer of every page and on `/how-we-make-money`.
- **POPIA.** No analytics or marketing cookies before consent. Click logs hold no IP address or personal details.
  Email or WhatsApp alerts (not built yet) will need double opt-in with stored consent.
- **Partner rules.** No bidding on partner brand keywords, no auto-redirects, no error-fare posts using Skyscanner.

This isn't legal advice. Have the privacy policy reviewed before collecting personal information.

## Troubleshooting

| Problem | Fix |
|---|---|
| Yellow "Demo mode" banner in production | `TRAVELPAYOUTS_TOKEN` GitHub secret missing. Add it and run the Deploy workflow |
| Prices empty after adding the token | Check server logs for `[travelpayouts] HTTP 401` (bad token) or `429` (rate limit) |
| "View on Travelstart" missing | `TRAVELSTART_AFFILIATE_LINK` not set, by design |
| Clicks not in Supabase | Check both Supabase variables are set. Logs show `[click] insert failed: …` with the reason |
| Sitemap URLs show localhost | Set the `NEXT_PUBLIC_SITE_URL` repository variable and run the Deploy workflow |
| Deploy failed at "Refuse to deploy a build without fares" | The fare API failed during the build (look for `[travelpayouts] HTTP …` in the build log). The previous version is still live; the next scheduled run retries |
| Deploy run says "Skipping deploy" | `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` secrets not set yet |
| Prices' "Checked" times getting old | Scheduled deploys stopped or failing: check the Actions tab (re-enable Deploy if disabled) |
| Error 1102 "Worker exceeded resource limits" | CPU over 10 ms per request on Free. See [Limits to watch](#limits-to-watch) |
| Clicks stopped appearing in Supabase | Project paused for inactivity. Restore it in the Supabase dashboard |
| `npm install` peer-dependency errors | Use Node 22 (`nvm use`) and `npm ci` |
| `npm ERR! enoent ... package.json` | You're not in the project folder. `cd milehighclubza` first |
| `SELF_SIGNED_CERT_IN_CHAIN` or "tarball seems to be corrupted" | A company VPN or antivirus is intercepting HTTPS. Use Codespaces, or ask IT for the company root certificate and set `npm config set cafile <path>`. **Never** set `strict-ssl false` |

## Working with Claude Code

Open the repo in Claude Code and it reads `CLAUDE.md` first: the non-negotiable rules, a map of the code and the
open items to verify. A good first prompt:

> Read CLAUDE.md and docs/ROADMAP.md, run `npm run check`, then start Phase 1.

---

© MilehighclubZA. Private project.
