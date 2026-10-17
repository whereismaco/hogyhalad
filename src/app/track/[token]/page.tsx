import { redirect } from "next/navigation";
export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  redirect("/kovetes/" + encodeURIComponent((await params).token));
}
