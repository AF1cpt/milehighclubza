import Link from "next/link";
import type { Fare } from "@/lib/fares";
import { enabledPartners, partnerLabels, type Partner } from "@/lib/deeplinks";
import { airlineName, formatCheckedAt, formatDay, formatZar } from "@/lib/format";

export function goHref(fare: Fare, partner: Partner, sourcePage: string): string {
  const q = new URLSearchParams({
    p: partner,
    o: fare.origin,
    d: fare.destination,
    dep: fare.departDate,
    price: String(fare.price),
    src: sourcePage,
  });
  if (fare.returnDate) q.set("ret", fare.returnDate);
  return `/go?${q}`;
}

export function FareList({
  fares,
  sourcePage,
  cheapestOverall,
}: {
  fares: Fare[];
  sourcePage: string;
  /** Lowest price across everything on the page; the badge only shows on fares that match it. */
  cheapestOverall?: number;
}) {
  const partners = enabledPartners();

  if (fares.length === 0) {
    return (
      <div className="rounded-xl border border-line bg-sky p-6 text-ink-soft">
        No recent fares found for these dates. Try nearby dates or a whole month from the route page.
      </div>
    );
  }

  const cheapest = cheapestOverall ?? fares[0].price;

  return (
    <ul className="space-y-3">
      {fares.map((f, i) => (
        <li key={`${f.departDate}-${f.returnDate}-${f.airline}-${i}`} className="rounded-xl border border-line p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-semibold">{formatZar(f.price)}</span>
              {f.price === cheapest && (
                <span className="text-xs font-medium rounded bg-deal-soft text-deal px-2 py-0.5">Cheapest</span>
              )}
            </div>
            <p className="text-sm">
              {formatDay(f.departDate)}
              {f.returnDate ? ` → ${formatDay(f.returnDate)}` : " · one way"} · {airlineName(f.airline)} ·{" "}
              {f.transfers === 0 ? "Direct" : `${f.transfers} stop${f.transfers > 1 ? "s" : ""}`}
            </p>
            <p className="text-xs text-ink-soft">Checked {formatCheckedAt(f.checkedAt)} · cached price, may have changed</p>
          </div>
          <div className="flex gap-2 shrink-0">
            {partners.map((p) => (
              <Link
                key={p}
                href={goHref(f, p, sourcePage)}
                rel="nofollow sponsored noopener"
                target="_blank"
                prefetch={false}
                className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
              >
                View on {partnerLabels[p]}
              </Link>
            ))}
          </div>
        </li>
      ))}
    </ul>
  );
}
