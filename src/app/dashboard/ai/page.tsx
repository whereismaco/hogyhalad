import { Suspense } from "react";
import { AiWallet } from "@/components/Office";
export default function Page() {
  return (
    <Suspense fallback={<p>Betöltés…</p>}>
      <AiWallet />
    </Suspense>
  );
}
