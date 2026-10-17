import { notFound } from "next/navigation";
import { getEnv } from "@/lib/env";
import { publicTracking } from "@/lib/crm";
import { AppError } from "@/lib/domain";
import { TrackingView } from "@/components/Tracking";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Megrendelés követése",
  robots: { index: false, follow: false },
};
export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  let initial;
  try {
    initial = await publicTracking(await getEnv(), token);
  } catch (error) {
    if (error instanceof AppError && error.status === 404) notFound();
    throw error;
  }
  return <TrackingView initial={initial} token={token} />;
}
