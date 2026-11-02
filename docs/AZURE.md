# Azure migration: services needed

**Status:** plan only, nothing built on Azure yet (2 Nov 2026). Today the system runs on Cloudflare Workers (site),
Supabase (database) and GitHub Actions (CI, 6-hourly rebuilds, daily price snapshots). This document lists the Azure
services that replace them, what each one does here, what stays outside Azure, the code changes, and the order to
migrate in. Facts and prices were checked on 2 Nov 2026 (sources at the end); confirm prices in the
[Azure Pricing Calculator](https://azure.microsoft.com/pricing/calculator/) before committing.

## The short version

| # | Azure service | Replaces | Job in this system | Start with |
|---|---|---|---|---|
| 1 | **Subscription + resource group** in **South Africa North** (Johannesburg) | Cloudflare / Supabase accounts | Holds everything; keeps data in South Africa | One resource group, e.g. `rg-fares-za` |
| 2 | **Azure Container Apps** (environment + one app) | Cloudflare Workers + `@opennextjs/cloudflare` | Runs the Next.js site as a container: static pages, `/go` click-outs, `/api/fares` search | Consumption plan |
| 3 | **Azure Container Apps job** (schedule trigger) | `.github/workflows/snapshot-fares.yml` runtime | Daily price snapshot into the database (needs DB access, so it runs inside Azure) | Same image, different command; cron in UTC |
| 4 | **Azure Container Registry** | (none: Workers took a bundle) | Stores the site image that Container Apps pulls | Basic tier |
| 5 | **Azure Database for PostgreSQL – Flexible Server** | Supabase Postgres | `clicks`, `conversions`, `fare_snapshots`, `revenue_by_page` view | Burstable B1MS (see decision 1) |
| 6 | **Azure Key Vault** | GitHub secrets uploaded as Worker secrets | Travelpayouts token, DB credentials, affiliate links | Standard tier |
| 7 | **Managed identities** + **Microsoft Entra workload identity federation** | `CLOUDFLARE_API_TOKEN` in GitHub | App/job read Key Vault and pull images without passwords; GitHub Actions deploys via OIDC, with no long-lived Azure secret in GitHub | One user-assigned identity for the app and job; one federated credential for the repo |
| 8 | **Log Analytics workspace** + **Application Insights** | Workers Logs / Observability | Request logs, errors, CPU/memory, the `[click] insert failed` lines | Server-side telemetry only (see POPIA) |
| 9 | **Azure Cost Management budget + alerts** | (none: we were on free plans) | Emails before spend passes a limit you set | Budget on the resource group |

**Optional, add when needed:** Azure DNS (only if DNS moves off the registrar), Azure Front Door Standard (global
caching/WAF; not needed for a South African audience at first), Azure Communication Services Email (deal alerts,
roadmap Phase 4), Azure Blob Storage (shared page cache if we later run several replicas with ISR, or DB exports).

**Not recommended for this app:**
- **Azure Static Web Apps:** hybrid Next.js (route handlers like `/go`) is still **preview**, with a 250 MB app limit
  and no linked backends.
- **Azure CDN (classic):** closed to new resources since 15 Aug 2025 and retiring on 30 Sep 2027. Use Front Door if a
  CDN is ever needed.
- **Azure App Service** is a valid alternative to Container Apps: always on, no cold starts, fixed monthly price,
  no scale-to-zero. Pick it if cold starts turn out to matter (see decision 2).

## What stays outside Azure

- **GitHub** (moving to `CCC-capecodecollective`): code, pull requests, **GitHub Actions** for CI (lint, typecheck,
  tests, build), building the image, and the **6-hourly rebuild** that bakes fresh fares into the pages. Builds call
  the Travelpayouts API but never the database, so they can stay on GitHub's runners. The `Verify Travelpayouts`
  workflow stays too.
- **Partners:** Travelpayouts API and the affiliate programs (Aviasales, Airalo, DiscoverCars, Travelstart).
- **Domain registrar** (DNS can stay there; point a CNAME at the Container App).

## How it fits together

```
GitHub (CCC-capecodecollective/milehighclubza)
  Actions: CI on every PR · every 6h: build pages with fresh fares → push image
     │  OIDC (no stored Azure password)
     ▼
Azure · South Africa North · rg-fares-za
  Container Registry ──image──► Container Apps environment
                                 ├─ app: fares-za-web   (pages, /go, /api/fares) ──► Travelpayouts API
                                 │        │ writes clicks
                                 └─ job: snapshot-fares (daily 03:41 UTC = 05:41 SAST) ──► Travelpayouts API
                                          │ writes fare_snapshots
                                          ▼
                                 PostgreSQL Flexible Server (clicks, conversions, fare_snapshots)
  Key Vault (secrets) ◄── managed identity ── app + job
  Log Analytics + Application Insights ◄── logs and server telemetry
  Cost Management budget ── email alerts
```

## Current → Azure, piece by piece

| Today | Azure | Notes |
|---|---|---|
| Cloudflare Worker `fares-za` via OpenNext | Container App running `next start` from a `standalone` build | Removes `@opennextjs/cloudflare`, `wrangler`, `open-next.config.ts`, `wrangler.jsonc`. Also removes the adapter's refusal to build Next 15 (but Next 15 is still out of security support: upgrade to Next 16 anyway) |
| Workers Free 10 ms CPU limit | None (you size CPU/memory per replica) | The CPU rules in CLAUDE.md and the page-size reason in `scripts/check-build.mjs` no longer apply; keep the "has fares" half of the build guard |
| Static pages rebuilt every 6h | Same, deployed as a new image revision | Lowest-risk port. Later option: Next ISR (`revalidate`) works on a Node server, which could replace the rebuild schedule |
| `public/_headers` | `headers()` in `next.config.ts` | Cloudflare-specific file |
| `wrangler.jsonc` `vars` (`TRAVELPAYOUTS_PROJECT_ID`) | Container App environment variable | Public value, no Key Vault needed |
| Worker secrets from GitHub | Key Vault secrets referenced by the app and job | `TRAVELPAYOUTS_TOKEN`, `TRAVELPAYOUTS_MARKER`, DB connection, affiliate links |
| Supabase (`supabase-js`, PostgREST) | Flexible Server via `pg` (node-postgres) | Change `src/lib/clicks.ts` and `scripts/snapshot-fares.ts`; migrations are plain SQL and move as-is |
| Snapshot workflow on GitHub runners | Container Apps job on a schedule | Keeps DB credentials and traffic inside Azure; GitHub runner IPs can't be allow-listed easily |
| Workers Logs | Log Analytics + Application Insights | Container Apps sends console logs to Log Analytics |
| `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` | Federated credential (`AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`) | These IDs are not secrets; nothing long-lived to leak |

## Free tiers and costs (checked 2 Nov 2026)

| Service | What's free / what it costs | Watch out for |
|---|---|---|
| Container Apps (Consumption) | First **180,000 vCPU-seconds, 360,000 GiB-seconds and 2 million requests** per subscription per month are free | One replica that never scales to zero (0.25 vCPU for 30 days ≈ 648,000 vCPU-seconds) passes the free grant. Scale-to-zero stays near free but adds a cold start to the first visit after a quiet spell |
| PostgreSQL Flexible Server | **Free for 12 months on a new Azure free account:** 750 hours/month of Burstable B1MS, 32 GB storage, 32 GB backup | Only for new customers. After 12 months it becomes the main monthly cost |
| Container Registry Basic | About **$0.167/day (~$5/month)**, 10 GB included | Alternative: GitHub Container Registry (no Azure cost; pull needs a token instead of managed identity) |
| Log Analytics / Application Insights | First **5 GB/month per billing account** free | Shared across all workspaces on the account; set a daily cap |
| Key Vault (Standard) | Charged per operation; tiny at our volume | Check the pricing page |
| Front Door Standard (optional) | About **$35/month base fee** before traffic (secondary sources) | Why it's optional, not required |
| GitHub Actions | Free and unlimited on public repos; **private repos on GitHub Free orgs get 2,000 minutes/month** | Our estimate: roughly 500 minutes/month (rebuilds 4×/day, CI, daily checks) |

## Code changes (one PR, before cut-over)

1. Upgrade Next 15 → 16 (security support ended 21 Oct 2026). Drop `--dangerouslyUseUnsupportedNextVersion`.
2. `next.config.ts`: `output: "standalone"` and the security headers from `public/_headers`.
3. Add a `Dockerfile` (Node 22, multi-stage, non-root) and `.dockerignore`.
4. Remove the Cloudflare pieces: `@opennextjs/cloudflare`, `wrangler`, `open-next.config.ts`, `wrangler.jsonc`,
   `cf:*` scripts, `public/_headers`.
5. Database: replace `supabase-js` with `pg` in `src/lib/clicks.ts` and `scripts/snapshot-fares.ts`; one
   `DATABASE_URL` setting. Keep "never throws" for click logging.
6. `.github/workflows/deploy.yml`: `azure/login` (OIDC) → build and push the image → update the Container App;
   `verify:build` and `smoke:deploy` stay as they are.
7. Snapshot: keep `npm run snapshot:fares`, run it as the Container Apps job; drop the GitHub schedule.
8. Update `tests/deploy.test.ts` (it guards Cloudflare-specific rules), `CLAUDE.md`, `README.md`, `ROADMAP.md`.

## Migration order

1. **Merge PR #4 first.** Scheduled deploys have failed since 21 Oct 2026 (Next 15 end of support), so live prices
   are frozen. It also starts the daily price history.
2. **Move the repo:** GitHub → repo Settings → General → Danger zone → Transfer ownership → `CCC-capecodecollective`.
   Then check, in the new location:
   - Actions secrets and variables are present (GitHub's docs say secrets stay with a transferred repo; confirm
     anyway).
   - Actions are allowed by the organisation's settings, and scheduled workflows are running.
   - The Claude GitHub app is installed on the organisation, if Claude should keep working on it.
3. **Azure account:** create the subscription (a new free account gets the 12-month database offer), a budget with
   alerts, and `rg-fares-za` in South Africa North. Confirm in the portal's create screens that Container Apps and
   PostgreSQL Flexible Server offer South Africa North. If not, pick the nearest region they do and note the extra
   latency.
4. **Provision:** Log Analytics → Key Vault → Container Registry → PostgreSQL Flexible Server (apply
   `supabase/migrations/*.sql`) → Container Apps environment → app and job → managed identity roles (Key Vault
   Secrets User, AcrPull) → federated credential for the GitHub repo.
5. **Ship the code PR** to a staging revision; run `npm run smoke:deploy -- <azure url>`, do a test click, check the
   row lands in Postgres.
6. **Copy data** from Supabase (`clicks`, `conversions`, `fare_snapshots`) with `pg_dump`/`pg_restore` or CSV.
7. **Cut over:** point the domain (or set the new URL) and update `NEXT_PUBLIC_SITE_URL`. Change the website URL on
   the Travelpayouts **Fares-za** project and in Google Search Console.
8. **Decommission** after a week of clean running: Cloudflare Worker and API token, then the Supabase project (keep
   an export).

## POPIA and data residency

- **South Africa North keeps the click log in South Africa.** Supabase runs in London (eu-west-2) today, which is a
  cross-border transfer under POPIA. Moving the database is a privacy improvement, not just a hosting change.
- **Telemetry stays server-side.** Application Insights' browser script counts as analytics: add it only behind
  `readConsent() === "all"`, like any other analytics. Server-side request telemetry sets no cookies.

## Decisions for the owner

1. **Database:** move to Azure PostgreSQL (data in South Africa, small code change, paid after the free year) or keep
   Supabase for now (no code change, data stays in London)?
2. **Hosting mode:** Container Apps with scale-to-zero (near free, cold starts), Container Apps with 1 replica always
   on (no cold starts, small monthly cost), or App Service (always on, fixed price)?
3. **Repo visibility** in the organisation: public (unlimited Actions minutes) or private (2,000 minutes/month on
   GitHub Free)?
4. **Azure account:** a new free account (12-month database offer) or an existing Cape Code Collective subscription?

## Sources (checked 2 Nov 2026)

- Container Apps billing and free grant: https://learn.microsoft.com/azure/container-apps/billing
- Container Apps scheduled jobs: https://learn.microsoft.com/azure/container-apps/jobs
- Container Apps free managed certificates (GA 27 Mar 2024): https://learn.microsoft.com/azure/container-apps/custom-domains-managed-certificates
- PostgreSQL Flexible Server on the free account: https://learn.microsoft.com/azure/postgresql/flexible-server/how-to-deploy-on-azure-free-account
- Static Web Apps and Next.js (hybrid = preview): https://learn.microsoft.com/azure/static-web-apps/nextjs
- Azure CDN classic retirement: https://learn.microsoft.com/azure/cdn/classic-cdn-retirement-faq
- Front Door base fee (Microsoft Q&A, secondary): https://learn.microsoft.com/en-us/answers/questions/2284557/azure-cdn-standard-from-microsoft-(classic)-will-b
- Container Registry tiers and price: https://learn.microsoft.com/azure/container-registry/container-registry-skus
- Application Insights pricing (5 GB free): https://azure.microsoft.com/pricing/details/application-insights/
- South Africa North region: https://learn.microsoft.com/azure/reliability/regions-list
- GitHub repository transfers: https://docs.github.com/repositories/creating-and-managing-repositories/transferring-a-repository
- GitHub plans (Actions minutes): https://docs.github.com/en/get-started/learning-about-github/githubs-plans
