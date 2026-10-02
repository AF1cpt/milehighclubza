import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type ClickRecord = {
  id: string;
  partner: string;
  origin: string;
  destination: string;
  depart_date: string;
  return_date: string | null;
  price_shown: number | null;
  source_page: string | null;
  device: string;
  referrer: string | null;
  utm_source: string | null;
  utm_campaign: string | null;
};

let client: SupabaseClient | null | undefined;

function getClient(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  client = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
  return client;
}

export function deviceFromUserAgent(ua: string | null): string {
  if (!ua) return "unknown";
  if (/bot|crawler|spider|crawling/i.test(ua)) return "bot";
  if (/mobile|android|iphone/i.test(ua)) return "mobile";
  if (/ipad|tablet/i.test(ua)) return "tablet";
  return "desktop";
}

/** Never throws: a failed log must not block the user's redirect. */
export async function logClick(record: ClickRecord): Promise<void> {
  const db = getClient();
  if (!db) {
    console.info("[click]", JSON.stringify(record));
    return;
  }
  const { error } = await db.from("clicks").insert(record);
  if (error) console.error("[click] insert failed:", error.message);
}
