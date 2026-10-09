const zar = new Intl.NumberFormat("en-ZA", {
  style: "currency",
  currency: "ZAR",
  maximumFractionDigits: 0,
});

export function formatZar(amount: number): string {
  return zar.format(amount);
}

export function formatDay(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-ZA", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export function formatMonth(yyyyMm: string): string {
  return new Date(`${yyyyMm}-01T00:00:00Z`).toLocaleDateString("en-ZA", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * "YYYY-MM-DD" in South Africa, `days` from today. Not `toISOString()`, which is UTC and gives yesterday's
 * date between 00:00 and 02:00 SAST. SA has no daylight saving, so adding whole days is exact.
 */
export function saDatePlus(days: number, now = new Date()): string {
  return new Date(now.getTime() + days * 86_400_000).toLocaleDateString("en-CA", { timeZone: "Africa/Johannesburg" });
}

const checkedAtFormat = new Intl.DateTimeFormat("en-ZA", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "Africa/Johannesburg",
});

/**
 * "09 Oct, 14:05 SAST". An absolute time, not "2h ago": pages are pre-rendered and served for hours,
 * and a relative time frozen into the HTML would make old prices look fresh.
 */
export function formatCheckedAt(iso: string): string {
  return `${checkedAtFormat.format(new Date(iso))} SAST`;
}

const airlineNames: Record<string, string> = {
  FA: "FlySafair",
  "4Z": "Airlink",
  SA: "South African Airways",
  BA: "British Airways",
  EK: "Emirates",
  QR: "Qatar Airways",
  ET: "Ethiopian Airlines",
  KQ: "Kenya Airways",
  KL: "KLM",
  AF: "Air France",
  TK: "Turkish Airlines",
  LH: "Lufthansa",
  MK: "Air Mauritius",
};

export function airlineName(code: string): string {
  return airlineNames[code] ?? code;
}
