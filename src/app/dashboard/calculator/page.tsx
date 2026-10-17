import { Suspense } from "react";
import { Calculator } from "@/components/Office";
export default function Page() {
  return (
    <Suspense fallback={<p>Betöltés…</p>}>
      <Calculator />
    </Suspense>
  );
}
