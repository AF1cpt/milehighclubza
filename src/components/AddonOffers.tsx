import Link from "next/link";
import type { Airport } from "@/data/airports";
import { addons, addonsFor, enabledAddons, partnerLabels, type AddonPartner } from "@/lib/deeplinks";

const copy: Record<(typeof addons)[AddonPartner]["kind"], (to: Airport) => { title: string; body: string }> = {
  "car-hire": (to) => ({
    title: `Car hire in ${to.city}`,
    body: `Compare rental cars for when you land at ${to.name}.`,
  }),
  esim: (to) => ({
    title: `Mobile data in ${to.country}`,
    body: "Buy a prepaid travel eSIM before you fly, instead of roaming on your SA contract.",
  }),
};

/**
 * Car hire and eSIM offers for a route's destination, through /go (logged with a sub-ID like flight
 * clicks). Renders nothing until a partner's tracking link is configured (see `addons`).
 */
export function AddonOffers({
  from,
  to,
  sourcePage,
  level = 2,
}: {
  from: Airport;
  to: Airport;
  sourcePage: string;
  /** Heading level, so the box fits inside a page section (3) or stands alone (2). */
  level?: 2 | 3;
}) {
  const offers = addonsFor(to, enabledAddons());
  if (offers.length === 0) return null;

  return (
    <section className="space-y-3" aria-label="Also for your trip">
      {level === 2 ? (
        <h2 className="text-lg font-semibold">Also for your trip</h2>
      ) : (
        <h3 className="font-medium">Also for your trip to {to.city}</h3>
      )}
      <ul className="grid gap-3 sm:grid-cols-2">
        {offers.map((p) => {
          const { title, body } = copy[addons[p].kind](to);
          const href = `/go?${new URLSearchParams({ p, o: from.iata, d: to.iata, src: sourcePage })}`;
          return (
            <li key={p} className="rounded-xl border border-line p-4 flex flex-col gap-3 justify-between">
              <div className="space-y-1">
                <p className="font-medium">{title}</p>
                <p className="text-sm text-ink-soft">{body}</p>
                <p className="text-xs text-ink-soft">Partner offer: we may earn a commission, at no extra cost to you.</p>
              </div>
              <Link
                href={href}
                rel="nofollow sponsored noopener"
                target="_blank"
                prefetch={false}
                className="self-start rounded-md border border-brand px-4 py-2 text-sm font-medium text-brand hover:bg-sky"
              >
                Compare on {partnerLabels[p]}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
