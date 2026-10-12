// Daily price history: npm run snapshot:fares (.github/workflows/snapshot-fares.yml runs it every morning).
// For every route page and each of the next 12 departure months, stores the cheapest fare, the median of the
// daily cheapest fares and how many days had fares in Supabase `fare_snapshots`. Re-running on the same SA
// day overwrites that day's rows, so a retry never duplicates them.
import { createClient } from "@supabase/supabase-js";
import { routes } from "@/data/routes";
import { upcomingMonths } from "@/lib/fares";
import { summariseMonth, type FareSnapshot } from "@/lib/fares/snapshot";
import { TravelpayoutsProvider } from "@/lib/fares/travelpayouts";
import { saDatePlus } from "@/lib/format";

async function main(): Promise<number> {
  const { TRAVELPAYOUTS_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!TRAVELPAYOUTS_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Set TRAVELPAYOUTS_TOKEN, SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
    return 1;
  }

  const provider = new TravelpayoutsProvider(TRAVELPAYOUTS_TOKEN);
  const months = upcomingMonths(12);
  const snapshotDate = saDatePlus(0);
  const jobs = routes.flatMap((r) => months.map((month) => ({ origin: r.origin.iata, destination: r.destination.iata, month })));

  // Travelpayouts allows 600 requests/minute on this endpoint: 4 at a time, at most every 0.5 s, stays near 480.
  const rows: FareSnapshot[] = [];
  for (let i = 0; i < jobs.length; i += 4) {
    const started = Date.now();
    const batch = await Promise.all(
      jobs.slice(i, i + 4).map(async (job) => {
        const fares = await provider.search({ origin: job.origin, destination: job.destination, depart: job.month, limit: 100 }, { live: true });
        return summariseMonth(fares, { ...job, snapshotDate });
      }),
    );
    rows.push(...batch.filter((row) => row !== null));
    await new Promise((resolve) => setTimeout(resolve, Math.max(0, 500 - (Date.now() - started))));
  }

  console.log(`${snapshotDate}: ${rows.length} route-months with fares from ${jobs.length} requests (${routes.length} routes × ${months.length} months).`);
  if (rows.length === 0) {
    // Same reasoning as the build guard: no fares anywhere means the API failed, not that flights stopped.
    console.error("No fares at all: the fare API probably failed. Nothing stored.");
    return 1;
  }

  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const { error } = await db.from("fare_snapshots").upsert(rows, { onConflict: "snapshot_date,origin,destination,depart_month" });
  if (error) {
    console.error(`Saving to Supabase failed: ${error.message}`);
    return 1;
  }
  console.log("Saved.");
  return 0;
}

main().then((code) => process.exit(code));
