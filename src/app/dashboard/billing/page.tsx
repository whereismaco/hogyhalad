import { Suspense } from "react";
import { Billing } from "@/components/Office";
export default function Page() {
  return (
    <Suspense fallback={<p>Betöltés…</p>}>
      <Billing />
    </Suspense>
  );
}
