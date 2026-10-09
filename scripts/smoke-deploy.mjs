#!/usr/bin/env node
// Post-deploy check, run by .github/workflows/deploy.yml: npm run smoke:deploy -- https://your-site
// Confirms the live site serves pages and search, and shows real fares (not demo data) whenever a
// Travelpayouts token is configured. Never calls /go, so it doesn't add fake clicks to Supabase.
const base = (process.argv[2] ?? process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/+$/, "");
if (!/^https?:\/\//.test(base)) {
  console.error("Usage: npm run smoke:deploy -- https://your-site (or set NEXT_PUBLIC_SITE_URL)");
  process.exit(1);
}
const expectRealFares = Boolean(process.env.TRAVELPAYOUTS_TOKEN);
const dep = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);

async function get(path) {
  // A fresh deploy can take a few seconds to reach every Cloudflare location.
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(`${base}${path}`, { redirect: "manual" });
      if (res.status === 200 || attempt === 5) return res;
    } catch (e) {
      if (attempt === 5) throw e;
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
}

const failures = [];
function check(ok, msg) {
  console.log(`  ${ok ? "\x1b[32m✔" : "\x1b[31m✘"}\x1b[0m ${msg}`);
  if (!ok) failures.push(msg);
}

console.log(`\nSmoke test: ${base}\n`);
for (const path of ["/", "/flights", "/flights/johannesburg-to-cape-town", "/search?o=JNB&d=CPT&dep=" + dep]) {
  const res = await get(path);
  check(res.status === 200, `${path} → HTTP ${res.status}`);
}

const api = await get(`/api/fares?o=JNB&d=CPT&dep=${dep}`);
const body = api.status === 200 ? await api.json() : {};
check(api.status === 200 && Array.isArray(body.exact), `/api/fares → HTTP ${api.status}, ${body.exact?.length ?? 0} exact fares`);
if (expectRealFares) {
  check(body.demo === false, "real fares: TRAVELPAYOUTS_TOKEN reached the Worker (demo: false)");
} else {
  console.log("  ! no TRAVELPAYOUTS_TOKEN: site runs in labelled demo mode");
}

if (failures.length) {
  console.error(`\n${failures.length} check(s) failed.`);
  process.exit(1);
}
console.log("\nAll checks passed.\n");
