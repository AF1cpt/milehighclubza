import type { MetadataRoute } from "next";
import { site } from "@/config/site";
import { routes } from "@/data/routes";
import { routeFaresByMonth } from "@/lib/fares";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  // Route pages without fares are noindexed (src/app/flights/[slug]/page.tsx), so they stay out of here too.
  const withFares = (
    await Promise.all(routes.map(async (r) => ((await routeFaresByMonth(r)).some((m) => m.fares.length > 0) ? r : null)))
  ).filter((r) => r !== null);
  return [
    { url: site.url, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${site.url}/flights`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${site.url}/december-holiday-flights`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    ...withFares.map((r) => ({
      url: `${site.url}/flights/${r.slug}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: r.domestic ? 0.9 : 0.7,
    })),
    { url: `${site.url}/how-we-make-money`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${site.url}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];
}
