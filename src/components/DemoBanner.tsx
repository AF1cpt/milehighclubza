import { isDemoMode } from "@/lib/fares";

export function DemoBanner() {
  if (!isDemoMode()) return null;
  return (
    <div className="bg-warn-soft text-warn text-sm">
      <p className="mx-auto max-w-5xl px-4 py-2">
        Demo mode: prices shown are sample data, not real fares. Add a <code>TRAVELPAYOUTS_TOKEN</code> to show live
        cached prices.
      </p>
    </div>
  );
}
