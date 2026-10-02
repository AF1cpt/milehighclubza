import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MilehighclubZA",
  description: "Cheapest flights from South Africa.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-ZA">
      <body className="antialiased">{children}</body>
    </html>
  );
}
