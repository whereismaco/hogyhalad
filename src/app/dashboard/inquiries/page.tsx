import { Suspense } from "react";
import { Inquiries } from "@/components/Office";
export default function Page() {
  return (
    <Suspense fallback={<p>Betöltés…</p>}>
      <Inquiries />
    </Suspense>
  );
}
