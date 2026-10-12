import type { MetadataRoute } from "next";
import { site } from "@/config/site";
import { routes } from "@/data/routes";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: site.url, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${site.url}/flights`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${site.url}/december-holiday-flights`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    ...routes.map((r) => ({
      url: `${site.url}/flights/${r.slug}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: r.domestic ? 0.9 : 0.7,
    })),
    { url: `${site.url}/how-we-make-money`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${site.url}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];
}
