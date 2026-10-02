"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const KEY = "cookie-consent";

export type ConsentValue = "all" | "essential";

export function readConsent(): ConsentValue | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === "all" || v === "essential" ? v : null;
  } catch {
    return null;
  }
}

/**
 * POPIA-friendly consent banner. We set no analytics or marketing cookies until the user picks "Accept all".
 * When you add analytics, load it only if readConsent() === "all".
 */
export function CookieConsent() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(readConsent() === null);
  }, []);

  function choose(v: ConsentValue) {
    try {
      localStorage.setItem(KEY, v);
    } catch {
      /* storage blocked: banner simply reappears next visit */
    }
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div role="dialog" aria-label="Cookie preferences" className="fixed bottom-0 inset-x-0 z-50 border-t border-line bg-white">
      <div className="mx-auto max-w-5xl px-4 py-4 flex flex-col sm:flex-row gap-3 sm:items-center justify-between text-sm">
        <p className="text-ink-soft">
          We use essential cookies to run the site. With your OK we&apos;d also use analytics to improve it.{" "}
          <Link href="/privacy" className="underline">Privacy policy</Link>
        </p>
        <div className="flex gap-2 shrink-0">
          <button onClick={() => choose("essential")} className="px-3 py-2 rounded-md border border-line hover:bg-sky">
            Essential only
          </button>
          <button onClick={() => choose("all")} className="px-3 py-2 rounded-md bg-brand text-white hover:bg-brand-dark">
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}
