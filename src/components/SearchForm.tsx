"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { airports } from "@/data/airports";

type Props = {
  defaultOrigin?: string;
  defaultDestination?: string;
};

function todayPlus(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function SearchForm({ defaultOrigin = "JNB", defaultDestination = "CPT" }: Props) {
  const router = useRouter();
  const [origin, setOrigin] = useState(defaultOrigin);
  const [destination, setDestination] = useState(defaultDestination);
  const [tripType, setTripType] = useState<"return" | "oneway">("return");
  const [depart, setDepart] = useState(todayPlus(14));
  const [ret, setRet] = useState(todayPlus(17));
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (origin === destination) return setError("Pick a destination that's different from where you're leaving.");
    if (!depart) return setError("Pick a departure date.");
    if (depart < todayPlus(0)) return setError("Departure date can't be in the past.");
    if (tripType === "return" && (!ret || ret < depart)) return setError("Return date must be on or after departure.");
    setError(null);
    const q = new URLSearchParams({ o: origin, d: destination, dep: depart });
    if (tripType === "return") q.set("ret", ret);
    router.push(`/search?${q}`);
  }

  function swap() {
    setOrigin(destination);
    setDestination(origin);
  }

  const field = "w-full rounded-md border border-line bg-white px-3 py-2.5 text-base";

  return (
    <form onSubmit={submit} className="rounded-xl border border-line bg-white p-4 sm:p-5 space-y-4" noValidate>
      <div className="flex gap-4 text-sm" role="radiogroup" aria-label="Trip type">
        {(["return", "oneway"] as const).map((t) => (
          <label key={t} className="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="trip" checked={tripType === t} onChange={() => setTripType(t)} />
            {t === "return" ? "Return" : "One way"}
          </label>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] items-end">
        <label className="block text-sm">
          <span className="text-ink-soft">From</span>
          <select className={field} value={origin} onChange={(e) => setOrigin(e.target.value)}>
            {airports.map((a) => (
              <option key={a.iata} value={a.iata}>{a.city} ({a.iata})</option>
            ))}
          </select>
        </label>
        <button type="button" onClick={swap} aria-label="Swap origin and destination" className="h-11 w-11 justify-self-end sm:justify-self-auto rounded-md border border-line hover:bg-sky">
          <span className="sm:hidden" aria-hidden="true">⇅</span>
          <span className="hidden sm:inline" aria-hidden="true">⇄</span>
        </button>
        <label className="block text-sm">
          <span className="text-ink-soft">To</span>
          <select className={field} value={destination} onChange={(e) => setDestination(e.target.value)}>
            {airports.map((a) => (
              <option key={a.iata} value={a.iata}>{a.city} ({a.iata})</option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-ink-soft">Depart</span>
          <input type="date" className={field} value={depart} min={todayPlus(0)} onChange={(e) => setDepart(e.target.value)} />
        </label>
        {tripType === "return" && (
          <label className="block text-sm">
            <span className="text-ink-soft">Return</span>
            <input type="date" className={field} value={ret} min={depart} onChange={(e) => setRet(e.target.value)} />
          </label>
        )}
      </div>

      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}

      <button type="submit" className="w-full sm:w-auto rounded-md bg-brand px-6 py-3 font-medium text-white hover:bg-brand-dark">
        Find cheapest flights
      </button>
    </form>
  );
}
