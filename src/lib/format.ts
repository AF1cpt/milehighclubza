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

export function timeAgo(iso: string, now = Date.now()): string {
  const hours = Math.max(0, Math.round((now - new Date(iso).getTime()) / 3600_000));
  if (hours < 1) return "under an hour ago";
  if (hours < 48) return `${hours}h ago`;
  return `${Math.round(hours / 24)} days ago`;
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
