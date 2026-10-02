export type Airport = {
  iata: string;
  city: string;
  name: string;
  country: string;
  /** URL-safe city slug used in route page URLs */
  slug: string;
  domestic: boolean;
};

export const airports: Airport[] = [
  { iata: "JNB", city: "Johannesburg", name: "O.R. Tambo International", country: "South Africa", slug: "johannesburg", domestic: true },
  { iata: "CPT", city: "Cape Town", name: "Cape Town International", country: "South Africa", slug: "cape-town", domestic: true },
  { iata: "DUR", city: "Durban", name: "King Shaka International", country: "South Africa", slug: "durban", domestic: true },
  { iata: "PLZ", city: "Gqeberha", name: "Chief Dawid Stuurman International", country: "South Africa", slug: "gqeberha", domestic: true },
  { iata: "ELS", city: "East London", name: "King Phalo Airport", country: "South Africa", slug: "east-london", domestic: true },
  { iata: "GRJ", city: "George", name: "George Airport", country: "South Africa", slug: "george", domestic: true },
  { iata: "BFN", city: "Bloemfontein", name: "Bram Fischer International", country: "South Africa", slug: "bloemfontein", domestic: true },
  { iata: "LHR", city: "London", name: "Heathrow", country: "United Kingdom", slug: "london", domestic: false },
  { iata: "DXB", city: "Dubai", name: "Dubai International", country: "United Arab Emirates", slug: "dubai", domestic: false },
  { iata: "DOH", city: "Doha", name: "Hamad International", country: "Qatar", slug: "doha", domestic: false },
  { iata: "AMS", city: "Amsterdam", name: "Schiphol", country: "Netherlands", slug: "amsterdam", domestic: false },
  { iata: "CDG", city: "Paris", name: "Charles de Gaulle", country: "France", slug: "paris", domestic: false },
  { iata: "NBO", city: "Nairobi", name: "Jomo Kenyatta International", country: "Kenya", slug: "nairobi", domestic: false },
  { iata: "MRU", city: "Mauritius", name: "Sir Seewoosagur Ramgoolam International", country: "Mauritius", slug: "mauritius", domestic: false },
  { iata: "ZNZ", city: "Zanzibar", name: "Abeid Amani Karume International", country: "Tanzania", slug: "zanzibar", domestic: false },
  { iata: "WDH", city: "Windhoek", name: "Hosea Kutako International", country: "Namibia", slug: "windhoek", domestic: false },
  { iata: "HRE", city: "Harare", name: "Robert Gabriel Mugabe International", country: "Zimbabwe", slug: "harare", domestic: false },
  { iata: "ADD", city: "Addis Ababa", name: "Bole International", country: "Ethiopia", slug: "addis-ababa", domestic: false },
];

const byIata = new Map(airports.map((a) => [a.iata, a]));
const bySlug = new Map(airports.map((a) => [a.slug, a]));

export function getAirport(iata: string): Airport | undefined {
  return byIata.get(iata.toUpperCase());
}

export function getAirportBySlug(slug: string): Airport | undefined {
  return bySlug.get(slug.toLowerCase());
}

export function isKnownIata(code: string): boolean {
  return byIata.has(code.toUpperCase());
}
