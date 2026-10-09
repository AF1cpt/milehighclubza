import Link from "next/link";
import { DemoBanner } from "@/components/DemoBanner";
import { SearchForm } from "@/components/SearchForm";
import { routes } from "@/data/routes";
import { cheapestInWindow, getFareProvider, monthsIn, oldestCheck, type DateWindow } from "@/lib/fares";
import { formatCheckedAt, formatZar, saDatePlus } from "@/lib/format";
import { festiveSeason, isFestivePromoTime } from "@/lib/festive";
import { site } from "@/config/site";

// Fully static: rebuilt with fresh fares by the scheduled deploy (.github/workflows/deploy.yml).
export const revalidate = false;

const featured = [
  "johannesburg-to-cape-town",
  "cape-town-to-johannesburg",
  "johannesburg-to-durban",
  "cape-town-to-durban",
  "johannesburg-to-london",
  "johannesburg-to-dubai",
  "johannesburg-to-mauritius",
  "johannesburg-to-zanzibar",
];

/** Deals look 30 days ahead, not "this month", which has only a few days left near month-end. */
const DEAL_DAYS = 30;

async function cheapestFrom(slug: string, window: DateWindow) {
  const route = routes.find((r) => r.slug === slug);
  if (!route) return null;
  const all = await Promise.all(
    monthsIn(window).map((m) =>
      getFareProvider().search({ origin: route.origin.iata, destination: route.destination.iata, depart: m, limit: 60 }),
    ),
  );
  const fares = cheapestInWindow(all.flat(), window, DEAL_DAYS + 1);
  return { route, min: fares[0]?.price ?? null, fares };
}

export default async function Home() {
  const window = { from: saDatePlus(0), to: saDatePlus(DEAL_DAYS) };
  const deals = (await Promise.all(featured.map((slug) => cheapestFrom(slug, window)))).filter((d) => d !== null);
  const checkedAt = oldestCheck(deals.flatMap((d) => d.fares));

  return (
    <>
      <DemoBanner />
      <section className="bg-sky">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:py-14 space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">{site.tagline}</h1>
            <p className="text-ink-soft max-w-2xl">
              We check recently found fares across partners and show you the cheapest days to fly, in rand. Pick a
              deal and book with a trusted partner.
            </p>
          </div>
          <SearchForm />
        </div>
      </section>

      {isFestivePromoTime() && (
        <section className="mx-auto max-w-5xl px-4 pt-10">
          <Link
            href="/december-holiday-flights"
            className="block rounded-xl border border-brand bg-sky p-4 hover:bg-white"
          >
            <p className="font-semibold">December holidays {festiveSeason().year}: cheapest days to fly →</p>
            <p className="text-sm text-ink-soft">
              Fly out before Christmas and home after New Year: Cape Town, Durban, Gqeberha, George, Mauritius and more.
            </p>
          </Link>
        </section>
      )}

      <section className="mx-auto max-w-5xl px-4 py-10 space-y-4">
        <h2 className="text-xl font-semibold">Popular routes: cheapest in the next 30 days</h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {deals.map(({ route, min }) => (
            <li key={route.slug}>
              <Link href={`/flights/${route.slug}`} className="block rounded-xl border border-line p-4 hover:border-brand">
                <p className="font-medium">
                  {route.origin.city} → {route.destination.city}
                </p>
                <p className="text-sm text-ink-soft">
                  {min ? <>from <span className="text-deal font-semibold">{formatZar(min)}</span> one way</> : "See prices"}
                </p>
              </Link>
            </li>
          ))}
        </ul>
        {checkedAt && (
          <p className="text-xs text-ink-soft">
            Cached partner prices, checked {formatCheckedAt(checkedAt)}. They may have changed.
          </p>
        )}
        <Link href="/flights" className="inline-block text-sm underline">All routes</Link>
      </section>
    </>
  );
}
