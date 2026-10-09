/**
 * Festive season (December holidays) page data. Each pair is published as a route page in both
 * directions (see `routePairs`); the first airport is where people fly out from.
 */
export const festivePairs: [string, string][] = [
  ["JNB", "CPT"],
  ["JNB", "DUR"],
  ["JNB", "PLZ"],
  ["JNB", "GRJ"],
  ["JNB", "ELS"],
  ["CPT", "DUR"],
  ["JNB", "MRU"],
  ["JNB", "ZNZ"],
];

/**
 * Public school summer break (learners), keyed by the December it starts in. Add each year from the
 * gazetted DBE school calendar; years not listed simply don't show school dates.
 */
export const schoolSummerBreak: Record<number, { lastDay: string; backOn: string }> = {
  // Term 4 ends Wed 9 Dec 2026; Term 1 2027 starts Wed 13 Jan 2027 (DBE calendars, checked 9 Oct 2026).
  2026: { lastDay: "2026-12-09", backOn: "2027-01-13" },
};
