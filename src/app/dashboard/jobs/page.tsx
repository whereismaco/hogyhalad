import { Suspense } from "react";
import { JobsView } from "@/components/Jobs";
export default function Page() {
  return (
    <Suspense fallback={<p>Betöltés…</p>}>
      <JobsView />
    </Suspense>
  );
}
