import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { identity } from "@/lib/access";
import { getEnv } from "@/lib/env";
import { AppError } from "@/lib/domain";
import { Onboarding } from "@/components/Authentication";
export default async function Page() {
  const incoming = await headers();
  try {
    await identity(await getEnv(), incoming);
  } catch (error) {
    if (error instanceof AppError && error.status === 401) redirect("/sign-in");
    throw error;
  }
  return <Onboarding />;
}
