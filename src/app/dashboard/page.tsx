import { Suspense } from "react";
import { Overview } from "@/components/Office";
export default function Page() {
  return (
    <Suspense fallback={<p>Betöltés…</p>}>
      <Overview />
    </Suspense>
  );
}
