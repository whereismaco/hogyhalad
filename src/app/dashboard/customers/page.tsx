import { Suspense } from "react";
import { Customers } from "@/components/Office";
export default function Page() {
  return (
    <Suspense fallback={<p>Betöltés…</p>}>
      <Customers />
    </Suspense>
  );
}
