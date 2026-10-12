import { describe, expect, it } from "vitest";
import type { Fare } from "@/lib/fares";
import { summariseMonth } from "@/lib/fares/snapshot";

const fare = (departDate: string, price: number, airline = "FA"): Fare => ({
  origin: "JNB",
  destination: "CPT",
  departDate,
  price,
  airline,
  transfers: 0,
  checkedAt: "2026-10-12T04:00:00.000Z",
  source: "travelpayouts",
});
const ctx = { origin: "JNB", destination: "CPT", month: "2026-11", snapshotDate: "2026-10-12" };

describe("summariseMonth", () => {
  it("keeps each day's cheapest fare and summarises the month", () => {
    const fares = [fare("2026-11-03", 1400), fare("2026-11-03", 1100, "GE"), fare("2026-11-10", 1300), fare("2026-11-20", 900, "SA"), fare("2026-11-21", 1600)];
    expect(summariseMonth(fares, ctx)).toEqual({
      snapshot_date: "2026-10-12",
      origin: "JNB",
      destination: "CPT",
      depart_month: "2026-11",
      min_price: 900,
      median_price: 1200, // daily cheapest: 1100, 1300, 900, 1600 → middle two 1100 and 1300
      days_with_fares: 4,
      cheapest_date: "2026-11-20",
      airline: "SA",
    });
  });

  it("ignores other months, picks the earliest day on a tie, and returns null with no fares", () => {
    expect(summariseMonth([fare("2026-12-01", 500)], ctx)).toBeNull();
    expect(summariseMonth([], ctx)).toBeNull();
    const tie = summariseMonth([fare("2026-11-09", 1000), fare("2026-11-02", 1000), fare("2026-11-30", 1200)], ctx);
    expect(tie).toMatchObject({ cheapest_date: "2026-11-02", median_price: 1000, days_with_fares: 3 });
  });

  it("uses the route's airport codes even when the API answers with city codes", () => {
    const london = { ...fare("2026-11-05", 9000), destination: "LON" };
    expect(summariseMonth([london], { ...ctx, destination: "LHR" })?.destination).toBe("LHR");
  });
});
