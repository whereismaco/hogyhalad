import { Suspense } from "react";
import { Settings } from "@/components/Settings";
export default function Page() {
  return (
    <Suspense fallback={<p>Betöltés…</p>}>
      <Settings />
    </Suspense>
  );
}
