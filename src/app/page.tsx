import Link from "next/link";
import { DemoBanner } from "@/components/DemoBanner";
import { SearchForm } from "@/components/SearchForm";
import { routes } from "@/data/routes";
import { cheapestPerDay, getFareProvider, oldestCheck, upcomingMonths } from "@/lib/fares";
import { formatCheckedAt, formatZar } from "@/lib/format";
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

async function cheapestFrom(slug: string) {
  const route = routes.find((r) => r.slug === slug);
  if (!route) return null;
  const [month] = upcomingMonths(1);
  const fares = cheapestPerDay(
    await getFareProvider().search({ origin: route.origin.iata, destination: route.destination.iata, depart: month, limit: 60 }),
  );
  const min = fares.length ? Math.min(...fares.map((f) => f.price)) : null;
  return { route, min, fares };
}

export default async function Home() {
  const deals = (await Promise.all(featured.map(cheapestFrom))).filter((d) => d !== null);
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

      <section className="mx-auto max-w-5xl px-4 py-10 space-y-4">
        <h2 className="text-xl font-semibold">Popular routes this month</h2>
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
