import type { Metadata } from "next";
import { site } from "@/config/site";

export const metadata: Metadata = {
  title: "How we make money",
  description: `${site.name} is free to use. Here is how we earn money, and what that means for the prices you see.`,
};

export default function Disclosure() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-10 space-y-4 leading-relaxed">
      <h1 className="text-3xl font-semibold tracking-tight">How we make money</h1>
      <p>
        {site.name} is free to use. When you click through to a partner such as a travel agency or booking site and
        make a booking, that partner may pay us a commission. You pay the same price either way.
      </p>
      <p>
        We don&apos;t sell tickets ourselves. Your booking, payment, changes and refunds are handled by the partner you
        book with, under their terms.
      </p>
      <h2 className="text-xl font-semibold pt-2">About the prices you see</h2>
      <p>
        The fares on {site.name} are prices our partners found recently, not live quotes. They can change or sell out
        before you book. The price on the partner&apos;s site at checkout is the one that counts, including any fees and
        baggage charges.
      </p>
      <p>
        We rank results by price. Commission does not change the order of results. Not every airline sells through
        every partner, so occasionally an airline&apos;s own website may be cheaper.
      </p>
    </article>
  );
}
