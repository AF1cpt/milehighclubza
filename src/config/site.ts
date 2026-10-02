// Single source of truth for branding. Rename the site by editing this file only.
export const site = {
  name: "MilehighclubZA",
  shortName: "MHC ZA",
  tagline: "Cheapest flights from South Africa, found fast.",
  description:
    "Compare recent cheapest fares for domestic South African and international flights from Johannesburg, Cape Town and Durban, then book with a trusted partner.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  currency: "ZAR",
  locale: "en-ZA",
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "hello@example.com",
} as const;

export type Site = typeof site;
