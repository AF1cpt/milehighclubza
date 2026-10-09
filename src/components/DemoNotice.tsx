/** The demo-mode warning itself. <DemoBanner/> shows it on the server; search shows it from the API's flag. */
export function DemoNotice() {
  return (
    <div className="bg-warn-soft text-warn text-sm">
      <p className="mx-auto max-w-5xl px-4 py-2">
        Demo mode: prices shown are sample data, not real fares. Add a <code>TRAVELPAYOUTS_TOKEN</code> to show live
        cached prices.
      </p>
    </div>
  );
}
