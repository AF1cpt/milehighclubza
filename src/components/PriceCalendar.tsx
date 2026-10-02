import Link from "next/link";
import type { Fare } from "@/lib/fares";
import { formatZar } from "@/lib/format";

/** Bar-per-day price calendar for one month. Pure CSS, works without JS and on low data. */
export function PriceCalendar({ fares, month }: { fares: Fare[]; month: string }) {
  if (fares.length === 0) {
    return <p className="text-sm text-ink-soft">No recent fares for this month yet.</p>;
  }
  const max = Math.max(...fares.map((f) => f.price));
  const min = Math.min(...fares.map((f) => f.price));

  return (
    <div>
      <div className="flex items-end gap-[3px] h-32" aria-label={`Cheapest fare per day in ${month}`} role="img">
        {fares.map((f) => {
          const h = 20 + (80 * f.price) / max;
          const isMin = f.price === min;
          const q = new URLSearchParams({ o: f.origin, d: f.destination, dep: f.departDate });
          return (
            <Link
              key={f.departDate}
              href={`/search?${q}`}
              title={`${f.departDate}: ${formatZar(f.price)}`}
              className={`flex-1 rounded-t ${isMin ? "bg-deal" : "bg-brand/60 hover:bg-brand"}`}
              style={{ height: `${h}%` }}
            >
              <span className="sr-only">
                {f.departDate} {formatZar(f.price)}
              </span>
            </Link>
          );
        })}
      </div>
      <div className="flex justify-between text-xs text-ink-soft mt-1">
        <span>{fares[0].departDate.slice(8)}</span>
        <span>
          Low {formatZar(min)} · High {formatZar(max)}
        </span>
        <span>{fares[fares.length - 1].departDate.slice(8)}</span>
      </div>
    </div>
  );
}
