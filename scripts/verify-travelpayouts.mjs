#!/usr/bin/env node
// Go-live check for the Travelpayouts integration. Run: npm run verify:travelpayouts
// Reads TRAVELPAYOUTS_TOKEN / TRAVELPAYOUTS_MARKER from the environment or .env.local.
// Answers the open questions in CLAUDE.md with real data: does the token work, is ZAR supported,
// and which airlines (FlySafair especially) actually show up on SA routes.
import { existsSync, readFileSync } from "node:fs";

if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && m[2] && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const token = process.env.TRAVELPAYOUTS_TOKEN;
// Test-only override so the success path can be exercised against a local stand-in.
const API = process.env.TRAVELPAYOUTS_API_BASE ?? "https://api.travelpayouts.com";
const marker = process.env.TRAVELPAYOUTS_MARKER;
const ok = (s) => console.log(`  \x1b[32m✔\x1b[0m ${s}`);
const bad = (s) => console.log(`  \x1b[31m✘\x1b[0m ${s}`);
const warn = (s) => console.log(`  \x1b[33m!\x1b[0m ${s}`);
let failures = 0;
// Prints ✔ when cond holds, otherwise ✘ (or ! when soft) and counts it.
function check(cond, okMsg, failMsg, soft = false) {
  if (cond) return ok(okMsg);
  (soft ? warn : bad)(failMsg);
  failures++;
}

console.log("\nMilehighclubZA · Travelpayouts go-live check\n");

if (!token) {
  bad("TRAVELPAYOUTS_TOKEN is not set (Codespaces secret or .env.local). Nothing to check.");
  process.exit(1);
}
ok(`Token found (${token.slice(0, 4)}…${token.slice(-2)}, ${token.length} chars)`);
check(marker, `Marker found: ${marker}`, "TRAVELPAYOUTS_MARKER not set: Aviasales clicks won't earn commission", true);

const nextMonth = (() => {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)).toISOString().slice(0, 7);
})();

async function prices(origin, destination) {
  const q = new URLSearchParams({ origin, destination, departure_at: nextMonth, currency: "zar", sorting: "price", limit: "100", one_way: "true" });
  const res = await fetch(`${API}/aviasales/v3/prices_for_dates?${q}`, {
    headers: { "X-Access-Token": token, "Accept-Encoding": "gzip, deflate" },
  });
  const text = await res.text();
  let body = {};
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text.slice(0, 200) };
  }
  return { status: res.status, body };
}

console.log(`\n1. Token and currency (JNB → CPT, ${nextMonth})`);
let first;
try {
  first = await prices("JNB", "CPT");
} catch (e) {
  bad(`Could not reach api.travelpayouts.com: ${e.message}`);
  process.exit(1);
}
if (first.status === 401 || (first.status === 403 && !first.body.raw)) {
  bad(`Travelpayouts rejected the token (HTTP ${first.status}). Copy it again from Travelpayouts → Profile → API token.`);
  process.exit(1);
}
if (first.status === 403) {
  bad(`HTTP 403 with a non-API response: a firewall or VPN is probably blocking api.travelpayouts.com. Run this in the Codespace. (${first.body.raw})`);
  process.exit(1);
}
if (first.status !== 200 || !first.body.success) {
  bad(`Unexpected response: HTTP ${first.status} ${JSON.stringify(first.body).slice(0, 200)}`);
  process.exit(1);
}
ok("Token accepted (HTTP 200, success: true)");
const cur = String(first.body.currency ?? "").toLowerCase();
check(cur === "zar", "Prices returned in ZAR", `Currency came back as "${cur || "unknown"}", not ZAR. Prices would be wrong.`);
const sample = first.body.data?.[0];
if (sample) {
  const fieldsOk = ["origin", "destination", "price", "airline", "departure_at"].every((k) => k in sample);
  check(fieldsOk, "Response shape matches src/lib/fares/travelpayouts.ts", `Fields changed: ${Object.keys(sample).join(", ")}`);
  check(
    sample.price > 200 && sample.price < 20000,
    `Cheapest JNB→CPT: R${Math.round(sample.price)} on ${sample.departure_at.slice(0, 10)} (${sample.airline}), looks like real rand`,
    `Cheapest JNB→CPT is R${sample.price}; that doesn't look like a normal rand fare, so check the currency`,
    true,
  );
}

console.log(`\n2. Coverage on key routes (${nextMonth}, one way)`);
const routes = [["JNB", "CPT"], ["CPT", "JNB"], ["JNB", "DUR"], ["CPT", "DUR"], ["JNB", "PLZ"], ["JNB", "LHR"], ["JNB", "DXB"], ["CPT", "LHR"]];
const domesticAirlines = new Set();
for (const [o, d] of routes) {
  const { status, body } = o === "JNB" && d === "CPT" ? first : await prices(o, d);
  const rows = status === 200 && body.success ? body.data ?? [] : [];
  const days = new Set(rows.map((r) => r.departure_at.slice(0, 10))).size;
  const airlines = [...new Set(rows.map((r) => r.airline))];
  if (["CPT", "DUR", "PLZ"].includes(d) && ["JNB", "CPT"].includes(o)) airlines.forEach((a) => domesticAirlines.add(a));
  const line = `${o}→${d}: ${rows.length} fares over ${days} days · airlines: ${airlines.join(", ") || "none"}`;
  if (rows.length === 0) check(false, "", `${line} (route page would show 'no recent fares')`, true);
  else if (days < 14) warn(`${line} (thin data)`);
  else ok(line);
}

console.log("\n3. Local airlines on domestic routes");
// LIFT is left out on purpose: its airline code isn't confirmed, so it will show under "Other codes seen".
const names = { FA: "FlySafair", "4Z": "Airlink", SA: "SAA", "5Z": "CemAir" };
for (const [code, name] of Object.entries(names)) {
  if (domesticAirlines.has(code)) ok(`${name} (${code}) fares present`);
  else warn(`${name} (${code}) not seen this month`);
}
if (!domesticAirlines.has("FA")) {
  failures++;
  warn("FlySafair is missing. It's the cheapest airline on most SA routes, so our 'cheapest' may not be. See CLAUDE.md open item 3.");
}
const others = [...domesticAirlines].filter((a) => !names[a]);
if (others.length) console.log(`    Other codes seen: ${others.join(", ")}`);

console.log("\n4. Sample affiliate link (open it to check it lands on a real search)");
const dd = (sample?.departure_at ?? `${nextMonth}-15`).slice(0, 10);
const [, mm, day] = dd.split("-");
const link = new URL(`https://www.aviasales.com/search/JNB${day}${mm}CPT1`);
link.searchParams.set("currency", "zar");
if (marker) link.searchParams.set("marker", marker);
link.searchParams.set("sub_id", "verify");
console.log(`    ${link}`);

console.log(failures ? `\nDone with ${failures} warning(s). Real data will work; review the items above.\n` : "\nAll checks passed. Real data is ready.\n");
