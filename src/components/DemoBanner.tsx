import { isDemoMode } from "@/lib/fares";
import { DemoNotice } from "./DemoNotice";

export function DemoBanner() {
  if (!isDemoMode()) return null;
  return <DemoNotice />;
}
