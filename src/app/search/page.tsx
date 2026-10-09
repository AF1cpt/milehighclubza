import type { Metadata } from "next";
import { Suspense } from "react";
import { SearchLoading, SearchResults } from "@/components/SearchResults";

export const metadata: Metadata = {
  title: "Search results",
  robots: { index: false, follow: true },
};

// Static shell: results load in the browser from /api/fares (see SearchResults).
export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-5xl px-4 py-8">
          <SearchLoading />
        </div>
      }
    >
      <SearchResults />
    </Suspense>
  );
}
