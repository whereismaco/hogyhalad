import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { identity } from "@/lib/access";
import { getEnv } from "@/lib/env";
import { AppError } from "@/lib/domain";
import { AppShell } from "@/components/AppShell";
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const incoming = await headers();
  try {
    await identity(await getEnv(), incoming);
  } catch (error) {
    if (error instanceof AppError && error.status === 401) redirect("/sign-in");
    throw error;
  }
  return <AppShell>{children}</AppShell>;
}
