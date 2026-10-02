export type Fare = {
  origin: string;
  destination: string;
  /** ISO date YYYY-MM-DD */
  departDate: string;
  /** ISO date YYYY-MM-DD, absent for one-way */
  returnDate?: string;
  /** Price in ZAR, whole rand */
  price: number;
  /** IATA airline code, e.g. "FA" */
  airline: string;
  transfers: number;
  /** When the provider last saw this price (ISO timestamp). Cached data — may have changed. */
  foundAt: string;
  source: "travelpayouts" | "sample";
};

export type FareQuery = {
  origin: string;
  destination: string;
  /** "YYYY-MM" for a whole month or "YYYY-MM-DD" for a specific day */
  depart: string;
  /** Optional return day or month */
  ret?: string;
  limit?: number;
};

export interface FareProvider {
  readonly id: Fare["source"];
  /** Cheapest cached fares matching the query, sorted by price ascending. */
  search(query: FareQuery): Promise<Fare[]>;
}
