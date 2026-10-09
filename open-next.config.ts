import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

// Cloudflare Workers deployment (OpenNext), shaped for the Workers Free plan (10 ms CPU per request).
// Every page is pre-rendered at build time and served from Workers Static Assets; fresh fares come
// from rebuilding on a schedule (.github/workflows/deploy.yml), not from ISR. Only /go and /api/fares
// run per request, and both are light. See https://opennext.js.org/cloudflare/caching ("SSG site").
//
// Do not add `export const revalidate = <seconds>` to a page: this cache is read-only, and a page
// with time-based revalidation would try to queue a re-render once stale and fail.
export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
  // Serve cached pages without booting the Next server, which keeps CPU per request low.
  enableCacheInterception: true,
});
