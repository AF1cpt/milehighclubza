import { cheapestPerDay, type Fare } from "@/lib/fares";
import { saDatePlus } from "@/lib/format";

export type DateWindow = { from: string; to: string };

export type FestiveSeason = {
  /** The December the season starts in. */
  year: number;
  /** Fly out before Christmas. */
  out: DateWindow;
  /** Fly home after New Year. */
  home: DateWindow;
  /** Months to ask the fare provider for, per direction ("YYYY-MM"). */
  months: { out: string[]; home: string[] };
};

/** The festive season that is running now, or the next one. Until 15 January it's still last December's. */
export function festiveSeason(now = new Date()): FestiveSeason {
  const [y, m, d] = saDatePlus(0, now).split("-").map(Number);
  const year = m === 1 && d <= 15 ? y - 1 : y;
  return {
    year,
    out: { from: `${year}-12-01`, to: `${year}-12-24` },
    home: { from: `${year}-12-26`, to: `${year + 1}-01-15` },
    months: { out: [`${year}-12`], home: [`${year}-12`, `${year + 1}-01`] },
  };
}

/** When to promote the festive page: people plan December trips from September until mid-January. */
export function isFestivePromoTime(now = new Date()): boolean {
  const [, m, d] = saDatePlus(0, now).split("-").map(Number);
  return m >= 9 || (m === 1 && d <= 15);
}

export type Holiday = { date: string; name: string; weekday: string; longWeekend: boolean; note?: string };

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function weekday(iso: string): number {
  return new Date(`${iso}T00:00:00Z`).getUTCDay();
}

function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/**
 * Public holidays in the season (Public Holidays Act 36 of 1994, Schedule 1). Under section 2(1), a public
 * holiday that falls on a Sunday makes the following Monday a public holiday too.
 */
export function festiveHolidays(year: number): Holiday[] {
  const days: [string, string][] = [
    [`${year}-12-16`, "Day of Reconciliation"],
    [`${year}-12-25`, "Christmas Day"],
    [`${year}-12-26`, "Day of Goodwill"],
    [`${year + 1}-01-01`, "New Year's Day"],
  ];
  return days.map(([date, name]) => {
    const wd = weekday(date);
    const sunday = wd === 0;
    return {
      date,
      name,
      weekday: WEEKDAYS[wd],
      longWeekend: wd === 1 || wd === 5 || sunday,
      note: sunday ? `Falls on a Sunday, so Monday ${addDays(date, 1)} is a public holiday too.` : undefined,
    };
  });
}

/** The `n` cheapest days to depart inside the window, one fare per day, cheapest first. */
export function cheapestInWindow(fares: Fare[], window: DateWindow, n: number): Fare[] {
  return cheapestPerDay(fares.filter((f) => f.departDate >= window.from && f.departDate <= window.to))
    .sort((a, b) => a.price - b.price || a.departDate.localeCompare(b.departDate))
    .slice(0, n);
}
