import type { Metadata } from "next";
import Link from "next/link";
import { routes } from "@/data/routes";

export const metadata: Metadata = {
  title: "Cheap flight routes from South Africa",
  description: "Every route we track: domestic South African flights and international flights from Johannesburg, Cape Town and Durban.",
  alternates: { canonical: "/flights" },
};

export default function RoutesIndex() {
  const domestic = routes.filter((r) => r.domestic);
  const intl = routes.filter((r) => !r.domestic);

  const list = (items: typeof routes) => (
    <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((r) => (
        <li key={r.slug}>
          <Link href={`/flights/${r.slug}`} className="block rounded-lg border border-line px-3 py-2 hover:border-brand">
            {r.origin.city} → {r.destination.city}
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 space-y-8">
      <h1 className="text-3xl font-semibold tracking-tight">Cheap flight routes</h1>
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Domestic South Africa</h2>
        {list(domestic)}
      </section>
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">International</h2>
        {list(intl)}
      </section>
    </div>
  );
}
