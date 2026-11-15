// Lead finder: Cape Town metro SMEs with no real website, via the official Google Places API (New).
// No scraping. Usage: GOOGLE_PLACES_API_KEY=... node lead-gen/find-leads.mjs [--max-per-query=40]
import { writeFileSync, mkdirSync } from "node:fs";

const KEY = process.env.GOOGLE_PLACES_API_KEY;
if (!KEY) {
  console.error("GOOGLE_PLACES_API_KEY is not set in this session. Add it in the environment settings and start a new session.");
  process.exit(2);
}

const maxPer = Number((process.argv.find((a) => a.startsWith("--max-per-query=")) || "=40").split("=")[1]);

const AREAS = ["Woodstock", "Cape Town CBD", "Sea Point", "Observatory", "Claremont", "Wynberg", "Bellville", "Durbanville",
  "Century City", "Table View", "Mitchells Plain", "Khayelitsha", "Parow", "Goodwood", "Muizenberg", "Hout Bay"];
const CATEGORIES = ["mechanic", "plumber", "electrician", "hair salon", "barber", "beauty salon", "restaurant", "guesthouse",
  "cleaning service", "builder", "panel beater", "landscaper", "boutique", "physiotherapist", "dentist", "photographer",
  "caterer", "tutor", "gym", "pet groomer", "removals company", "pest control"];

const FIELDS = ["places.id", "places.displayName", "places.formattedAddress", "places.nationalPhoneNumber",
  "places.internationalPhoneNumber", "places.websiteUri", "places.rating", "places.userRatingCount", "places.googleMapsUri",
  "places.businessStatus", "places.primaryTypeDisplayName", "places.regularOpeningHours.weekdayDescriptions",
  "places.reviews", "nextPageToken"].join(",");

const SOCIAL = /(facebook|fb\.com|instagram|linktr\.ee|wa\.me|whatsapp|tiktok|twitter|x\.com|yellosa|google\.com\/maps|business\.site)/i;

async function search(textQuery, pageToken) {
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": KEY, "X-Goog-FieldMask": FIELDS },
    body: JSON.stringify({ textQuery, regionCode: "ZA", languageCode: "en", pageSize: 20, ...(pageToken ? { pageToken } : {}) }),
  });
  if (!res.ok) throw new Error(`Places ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

const seen = new Map();
let calls = 0;
for (const cat of CATEGORIES) {
  for (const area of AREAS) {
    let token, got = 0;
    do {
      const data = await search(`${cat} in ${area}, Cape Town`, token);
      calls++;
      for (const p of data.places ?? []) if (!seen.has(p.id)) seen.set(p.id, { ...p, _cat: cat, _area: area });
      got += (data.places ?? []).length;
      token = data.nextPageToken;
    } while (token && got < maxPer);
  }
  console.error(`${cat}: ${seen.size} unique places so far (${calls} calls)`);
}

const leads = [];
for (const p of seen.values()) {
  if (p.businessStatus && p.businessStatus !== "OPERATIONAL") continue;
  const web = p.websiteUri || "";
  const kind = !web ? "no_website" : SOCIAL.test(web) ? "social_only" : null;
  if (!kind) continue;
  const phone = p.nationalPhoneNumber || p.internationalPhoneNumber || "";
  if (!phone) continue; // not callable
  const reviews = p.userRatingCount ?? 0, rating = p.rating ?? 0;
  const topReview = (p.reviews ?? []).find((r) => (r.text?.text || "").length > 40);
  // Score is a heuristic: demand evidence (reviews x rating) plus no-site gap. Not a revenue forecast.
  const score = Math.round(Math.min(reviews, 300) * 0.25 + rating * 8 + (kind === "no_website" ? 20 : 10));
  leads.push({
    name: p.displayName?.text ?? "", category: p.primaryTypeDisplayName?.text ?? p._cat, area: p._area,
    address: p.formattedAddress ?? "", phone, web_status: kind, website: web, rating, reviews, score,
    maps: p.googleMapsUri ?? "", hours: (p.regularOpeningHours?.weekdayDescriptions ?? []).join(" | "),
    review_quote: topReview ? topReview.text.text.replace(/\s+/g, " ").slice(0, 220) : "",
    pitch: kind === "no_website"
      ? `${reviews} Google reviews at ${rating}★ but no website: customers find them on Maps and have nowhere to book or enquire.`
      : `Only a social page (${web.replace(/^https?:\/\//, "").slice(0, 40)}): no own site, search presence or booking flow.`,
    do_not_contact: "", call_outcome: "", checked_at: new Date().toISOString().slice(0, 10),
  });
}
leads.sort((a, b) => b.score - a.score);

mkdirSync(new URL("./out/", import.meta.url), { recursive: true });
writeFileSync(new URL("./out/leads.json", import.meta.url), JSON.stringify(leads, null, 1));
const cols = Object.keys(leads[0] ?? { name: "" });
const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
writeFileSync(new URL("./out/leads.csv", import.meta.url), [cols.join(","), ...leads.map((l) => cols.map((c) => esc(l[c])).join(","))].join("\n"));
console.error(`Done: ${seen.size} places scanned, ${leads.length} callable leads without a real website. API calls: ${calls}.`);
