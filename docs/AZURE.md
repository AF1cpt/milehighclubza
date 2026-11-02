# Azure migration: services needed

**Status:** plan only, nothing built on Azure yet (2 Nov 2026). Today the system runs on Cloudflare Workers (site),
Supabase Cloud (database, London) and GitHub Actions (CI, 6-hourly rebuilds, daily price snapshots). This document lists
the Azure services that replace them, what each one does, what stays outside Azure, the code changes, and the order to
migrate in. Facts and prices were checked on 2 Nov 2026 (sources at the end); price the full list in the
[Azure Pricing Calculator](https://azure.microsoft.com/pricing/calculator/) for South Africa North before building.

**Decisions so far (owner, 2 Nov 2026)**
- **Database:** self-hosted Supabase on Azure.
- **Hosting:** whatever is best for the app; budget isn't the constraint.
- **Budget:** **US$250,000** of Azure credit on our mentor's subscription (**AI BIZZHIVE**).
- **Repo:** private, in `CCC-capecodecollective`.
- **Staging environment:** decide later.

**Because the subscription belongs to our mentor**
- Ask for **Owner on our own resource groups** (`rg-fares-za`, `rg-fares-za-data`), not the whole subscription. Then
  we can manage our resources and give access without touching anything else on it.
- Set the **budget alerts on our resource groups** and send them to our own email, so we see our spend separately.
- Find out **when the credit expires** and what happens to running resources after that. Plan the move to our own
  subscription before then.
- Keep **everything as code** (Bicep or Terraform, code change 7), so the whole setup can be rebuilt in another
  subscription if needed.

## The short version

**Site and delivery**

| # | Azure service | Replaces | Job in this system | Start with |
|---|---|---|---|---|
| 1 | **Subscription + resource groups** in **South Africa North** (Johannesburg) | Cloudflare and Supabase accounts | Holds everything and keeps data in South Africa | `rg-fares-za` (app) and `rg-fares-za-data` (database) |
| 2 | **Azure Front Door Standard** | Cloudflare's edge | Custom domain, TLS, edge caching of the pre-rendered pages, custom WAF rules (e.g. rate limits on `/go` and `/api/fares`) | Standard. Premium adds managed WAF rule sets and bot protection |
| 3 | **Azure Container Apps**, workload-profiles environment in our VNet | Cloudflare Workers + `@opennextjs/cloudflare` | Runs the Next.js site (`next start`): pages, `/go` click-outs, `/api/fares` search | **Minimum 2 replicas, zone-redundant**: no cold starts, survives a zone outage. Multiple-revision mode for zero-downtime deploys and instant rollback |
| 4 | **Container Apps job** (schedule trigger) | Runtime of `.github/workflows/snapshot-fares.yml` | Daily price snapshot into Supabase. Must run inside the VNet to reach the private database | Same image, `npm run snapshot:fares`, cron `41 3 * * *` (UTC) = 05:41 SAST |
| 5 | **Azure Container Registry** | Nothing (Workers took a bundle) | Stores the site image | Basic |

**Database: self-hosted Supabase**

| # | Azure service | Replaces | Job in this system | Start with |
|---|---|---|---|---|
| 6 | **Linux virtual machine** running Supabase's official Docker Compose stack | Supabase Cloud | Postgres + PostgREST (what our code uses through `supabase-js`), plus Kong gateway, Studio dashboard and the other Supabase services | 4 vCPU / 8 GB RAM or more (Supabase's recommendation), e.g. `Standard_D4s_v5` (4 vCPU, 16 GB). Ubuntu LTS. No public IP |
| 7 | **Managed disks** | Supabase Cloud storage | Postgres data on its own disk, separate from the OS disk | Premium SSD, 128 GB or more (Supabase recommends 80 GB+) |
| 8 | **Virtual network, subnets, network security groups, private DNS** | Nothing (everything was public) | Puts the app, the job and the database on a private network. Only the Container Apps subnet can reach Supabase's port | One VNet; subnets for Container Apps and the VM |
| 9 | **Azure Bastion** | Supabase Cloud dashboard login | Admin access to the VM and to Studio without exposing either to the internet | Pick the tier when the account is set up |
| 10 | **Azure Backup** + **Blob Storage** | Supabase Cloud backups | Daily VM/disk backups plus a nightly `pg_dump` to a storage account with soft delete. Self-hosting means **we** own backups and restore tests | Recovery Services vault, a storage account |
| 11 | **Azure Update Manager** | Supabase Cloud patching | OS security updates on the VM on a schedule. Supabase image upgrades stay a manual, tested step | Weekly maintenance window |

**Shared**

| # | Azure service | Replaces | Job in this system | Start with |
|---|---|---|---|---|
| 12 | **Azure Key Vault** | GitHub secrets uploaded as Worker secrets | Travelpayouts token, Supabase keys and Postgres password, affiliate links, Studio login | Standard |
| 13 | **Managed identities** + **Microsoft Entra workload identity federation** | `CLOUDFLARE_API_TOKEN` in GitHub | App and job read Key Vault and pull images without passwords. GitHub Actions deploys via OIDC, with no long-lived Azure secret in GitHub | One user-assigned identity; one federated credential for the repo |
| 14 | **Log Analytics** + **Application Insights** (incl. availability tests) + **Azure Monitor alerts** | Workers Logs | App logs (incl. `[click] insert failed`), VM and database health, an uptime test on the site, alerts on errors, disk and memory | Server-side telemetry only (see POPIA) |
| 15 | **Cost Management budget + alerts** | Nothing (we were on free plans) | Emails at 50/80/100% of a monthly limit you set | Budget per resource group |

**Optional, later:** Azure DNS (only if DNS moves off the registrar), Azure Communication Services Email (deal alerts,
roadmap Phase 4), a staging environment (`rg-fares-za-staging`) once more people work on the code.

**Considered and not chosen**

| Option | Why not |
|---|---|
| Azure Static Web Apps | Hybrid Next.js (route handlers like `/go`) is still **preview**, with a 250 MB app limit and no linked backends |
| Azure CDN (classic) | Closed to new resources since 15 Aug 2025; retires 30 Sep 2027. Front Door replaces it |
| Supabase on AKS (Kubernetes) | Only community-maintained Helm chart and an early-stage operator. Docker Compose is Supabase's supported self-hosting route; one VM is simpler to run and back up |
| Supabase services pointed at Azure Database for PostgreSQL | Not the documented path: Supabase's stack ships its own Postgres image with the roles and extensions its services expect |
| App Service instead of Container Apps | Works, but Container Apps gives the scheduled job, revisions with traffic split, and VNet + zone redundancy in one place |

## What stays outside Azure

- **GitHub** (private repo in `CCC-capecodecollective`): code, pull requests, and **GitHub Actions** for:
  - CI (lint, typecheck, tests, build) and building and pushing the image;
  - the **6-hourly rebuild** that bakes fresh fares into the pages. Builds call the Travelpayouts API but never the
    database, so they can stay on GitHub's runners;
  - the `Verify Travelpayouts` check.

  Private repos on GitHub Free orgs get **2,000 Actions minutes a month**; our estimate is roughly 500.
- **Partners:** the Travelpayouts API and the affiliate programs (Aviasales, Airalo, DiscoverCars, Travelstart).
- **Domain registrar:** keep DNS there and point the domain at Front Door.

## How it fits together

```
Visitors ──► Azure Front Door Standard (domain, TLS, cache, WAF rules)
                         │
GitHub (CCC-capecodecollective, private)                      Azure · South Africa North
  Actions: CI · every 6h build pages with fresh fares ──OIDC──► Container Registry
                                                                     │ image
                         ┌───────────────────────────────────────────┴─────────────┐
                         │ VNet                                                    │
                         │  Container Apps (zone-redundant, ≥2 replicas)           │
                         │   ├─ fares-za-web   pages, /go, /api/fares ──► Travelpayouts API
                         │   └─ snapshot-fares job (daily 05:41 SAST) ──► Travelpayouts API
                         │            │ private HTTP to Kong                       │
                         │            ▼                                            │
                         │  VM: Supabase (Docker Compose), data on Premium SSD     │
                         │       ▲ Bastion (admin)    │ backups ─► Recovery vault + Blob
                         └────────────────────────────────────────────────────────┘
  Key Vault ◄─ managed identity ─ app, job, VM      Log Analytics / App Insights ◄─ logs, uptime test
```

## Current → Azure, piece by piece

| Today | Azure | Notes |
|---|---|---|
| Cloudflare Worker `fares-za` via OpenNext | Container App running `next start` from a `standalone` build | Removes `@opennextjs/cloudflare`, `wrangler`, `open-next.config.ts`, `wrangler.jsonc`, and the adapter's refusal to build Next 15. Next 15 is still out of security support, so upgrade to 16 anyway |
| Workers Free 10 ms CPU limit | None: we size CPU and memory per replica | The CPU rules in CLAUDE.md and the page-size reason in `scripts/check-build.mjs` stop applying; keep the "has fares" half of the guard |
| Static pages rebuilt every 6h | Same, each rebuild is a new image revision | Lowest-risk port. Later: Next ISR (`revalidate`) works on a Node server and could replace the rebuild schedule |
| `public/_headers` | `headers()` in `next.config.ts` | Cloudflare-specific file |
| `wrangler.jsonc` `vars` (`TRAVELPAYOUTS_PROJECT_ID`) | Container App environment variable | Public value |
| Worker secrets from GitHub | Key Vault secrets referenced by the app and job | Same names: `TRAVELPAYOUTS_TOKEN`, `TRAVELPAYOUTS_MARKER`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, affiliate links |
| Supabase Cloud (London) | Self-hosted Supabase on the VM | **No code change:** `supabase-js` talks to the self-hosted gateway. Self-hosted supports one `sb_secret` key or the legacy `service_role` JWT. `SUPABASE_URL` becomes the VM's private address |
| Snapshot workflow on GitHub runners | Container Apps job | GitHub runners can't reach a private database; the job runs inside the VNet |
| Workers Logs | Log Analytics + Application Insights | Container Apps and the VM (Azure Monitor Agent) both send logs there |
| `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` | Federated credential (`AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`) | These IDs aren't secrets; nothing long-lived to leak |

## Costs (checked 2 Nov 2026)

The budget comfortably covers this setup. Monthly spend is driven by the VM and its disk, the always-on Container
Apps replicas and Front Door. Price those three in the calculator for South Africa North; consider a 1- or 3-year
reservation for the VM once its size is proven.

| Service | Known price / free allowance | Note |
|---|---|---|
| Front Door Standard | **$35/month base**, plus traffic | Premium is $330/month base (managed WAF rules, bot protection, Private Link) |
| Container Apps | First **180,000 vCPU-seconds, 360,000 GiB-seconds and 2 million requests** per subscription per month free | Two always-on replicas go past the free grant (0.25 vCPU × 30 days ≈ 648,000 vCPU-seconds each), so expect a monthly charge |
| Container Registry Basic | About **$0.167/day** (~$5/month), 10 GB included | |
| Log Analytics / Application Insights | First **5 GB/month per billing account** free | Set a daily cap |
| VM, managed disk, Backup, Bastion, Key Vault, Blob Storage | Price in the calculator | VM size and disk tier are the big items |
| GitHub Actions (private repo) | **2,000 minutes/month** on GitHub Free orgs | Estimate ~500 used |

## Code changes (one PR, before cut-over)

1. Upgrade Next 15 → 16 (security support ended 21 Oct 2026). Drop `--dangerouslyUseUnsupportedNextVersion`.
2. `next.config.ts`: `output: "standalone"` and the security headers from `public/_headers`.
3. Add a `Dockerfile` (Node 22, multi-stage, non-root) and `.dockerignore`.
4. Remove the Cloudflare pieces: `@opennextjs/cloudflare`, `wrangler`, `open-next.config.ts`, `wrangler.jsonc`, the
   `cf:*` scripts, `public/_headers`.
5. `.github/workflows/deploy.yml`: `azure/login` (OIDC) → build and push the image → new Container App revision →
   `smoke:deploy` against the new revision → shift traffic. `verify:build` stays.
6. Snapshot: keep `npm run snapshot:fares`, run it as the Container Apps job; drop the GitHub schedule.
7. Infrastructure as code (Bicep or Terraform) for everything above, so the setup can be rebuilt and reviewed.
8. Update `tests/deploy.test.ts` (it guards Cloudflare-specific rules), `CLAUDE.md`, `README.md`, `ROADMAP.md`.

Database code (`src/lib/clicks.ts`, `scripts/snapshot-fares.ts`) does **not** change.

## Migration order

1. **Merge PR #4 first.** Scheduled deploys have failed since 21 Oct 2026 (Next 15 end of support), so live prices
   are frozen. It also starts the daily price history.
2. **Move the repo:** GitHub → repo Settings → General → Danger zone → Transfer ownership → `CCC-capecodecollective`,
   then set it to private. In the new location, check:
   - Actions secrets and variables are present (GitHub's docs say secrets stay with a transferred repo; confirm
     anyway);
   - the organisation allows Actions and the scheduled workflows run;
   - the Claude GitHub app is installed on the organisation, if Claude should keep working on it.
3. **Azure account:** choose the subscription and set budgets and alerts. Create the resource groups in South Africa
   North, and confirm in the portal's create screens that Container Apps (with zone redundancy) and the VM size are
   offered there.
4. **Network and shared services:** VNet, subnets, NSGs, private DNS → Log Analytics → Key Vault → Container Registry
   → managed identity (Key Vault Secrets User, AcrPull) → federated credential for the GitHub repo.
5. **Supabase VM:**
   - Create the VM and data disk, no public IP, with Bastion for access.
   - Install Docker, then follow Supabase's self-hosting guide: clone the `docker/` folder, generate the secrets and
     keys into `.env` from Key Vault, `docker compose up`.
   - Apply `supabase/migrations/*.sql`.
   - Turn on Azure Backup and the nightly `pg_dump` to Blob, then **test a restore**.
6. **App:** ship the code PR. Deploy a revision without traffic, run `npm run smoke:deploy -- <revision url>`, do a
   test click and check the row lands in the self-hosted `clicks` table, then shift traffic.
7. **Copy data** from Supabase Cloud (`clicks`, `conversions`, `fare_snapshots`) with `pg_dump`/`pg_restore`.
8. **Cut over:**
   - Add the domain on Front Door and update `NEXT_PUBLIC_SITE_URL`.
   - Change the website URL on the Travelpayouts **Fares-za** project and in Google Search Console.
9. **Decommission** after a week of clean running: the Cloudflare Worker and API token, then the Supabase Cloud
   project (keep an export).

## Running self-hosted Supabase: what we take on

- **Backups and restores:** daily, tested monthly. Nobody else does this for us any more.
- **Upgrades:**
  - Supabase images: read the self-hosting changelog, upgrade in a maintenance window, take a backup first.
  - OS patches: through Update Manager.
- **Security:**
  - Studio and the VM are never public.
  - Only the Container Apps subnet reaches the gateway.
  - Rotate the Postgres password and API keys from Key Vault.
  - Optionally turn off Supabase services we don't use (Auth, Storage, Realtime, Edge Functions): our code only needs
    Postgres and PostgREST through Kong.
- **Capacity:** watch memory and disk. Supabase's minimum is 4 GB RAM, and the stack is killed by the kernel when
  memory runs out.

## POPIA and data residency

- **South Africa North keeps the click log in South Africa.** Supabase Cloud runs in London (eu-west-2) today, which
  is a cross-border transfer under POPIA. Moving the database is a privacy improvement, not just a hosting change.
- **Telemetry stays server-side.** Application Insights' browser script counts as analytics: add it only behind
  `readConsent() === "all"`, like any other analytics. Server-side request telemetry sets no cookies.

## Still to decide

1. **Front Door: yes or no, and which tier.**
   - **What it is:** Azure's front entrance for the site, sitting between visitors and our app. It handles the domain
     and HTTPS certificate, caches pages close to visitors, and blocks abuse with firewall rules. Abuse here means,
     for example, bots hammering `/go` with fake clicks or `/api/fares` to use up our Travelpayouts quota. Cloudflare
     did this for us before.
   - **Without it:** Container Apps can still serve the domain with a free certificate, but there's no edge cache and
     no firewall in front.
   - **Recommendation:** Standard ($35/month base) now. Premium ($330/month) only if bots or attacks show up.
2. **Staging environment:** later, as decided.
   - **What staging means:** a second copy of the site where changes are tried before real visitors see them.
   - **What we have without it:** each deploy is a new Container Apps revision that gets 0% of traffic until its
     smoke test passes, then the switch; rollback is instant.
   - **When to add it:** when several people change the code, or before risky changes such as Supabase upgrades and
     database changes.

## Sources (checked 2 Nov 2026)

- Supabase self-hosting with Docker (requirements, setup): https://supabase.com/docs/guides/self-hosting/docker
- Supabase self-hosted API keys (new and legacy): https://supabase.com/docs/guides/self-hosting/self-hosted-auth-keys
- Supabase on Kubernetes (community): https://github.com/supabase-community/supabase-kubernetes
- Container Apps billing and free grant: https://learn.microsoft.com/azure/container-apps/billing
- Container Apps scheduled jobs: https://learn.microsoft.com/azure/container-apps/jobs
- Container Apps free managed certificates (GA 27 Mar 2024): https://learn.microsoft.com/azure/container-apps/custom-domains-managed-certificates
- Front Door pricing and WAF by tier: https://learn.microsoft.com/azure/frontdoor/understanding-pricing and https://learn.microsoft.com/azure/frontdoor/waf-overview
- Static Web Apps and Next.js (hybrid = preview): https://learn.microsoft.com/azure/static-web-apps/nextjs
- Azure CDN classic retirement: https://learn.microsoft.com/azure/cdn/classic-cdn-retirement-faq
- Container Registry tiers and price: https://learn.microsoft.com/azure/container-registry/container-registry-skus
- Application Insights pricing (5 GB free): https://azure.microsoft.com/pricing/details/application-insights/
- South Africa North region: https://learn.microsoft.com/azure/reliability/regions-list
- GitHub repository transfers: https://docs.github.com/repositories/creating-and-managing-repositories/transferring-a-repository
- GitHub plans (Actions minutes): https://docs.github.com/en/get-started/learning-about-github/githubs-plans
