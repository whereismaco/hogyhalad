import { Webhook } from "svix";
import { getEnv } from "@/lib/env";
import { json, errorResponse, readText } from "@/lib/http";
import { statement } from "@/lib/db";
import { z } from "zod";
export async function POST(request: Request) {
  try {
    const env = await getEnv();
    if (!env.RESEND_WEBHOOK_SECRET)
      return json({ error: "Webhook nincs beállítva." }, 503);
    let event: { type: string; data: { email_id: string } };
    try {
      const raw = await readText(request);
      new Webhook(env.RESEND_WEBHOOK_SECRET).verify(raw, {
        "svix-id": request.headers.get("svix-id") || "",
        "svix-timestamp": request.headers.get("svix-timestamp") || "",
        "svix-signature": request.headers.get("svix-signature") || "",
      });
      event = z
        .object({ type: z.string(), data: z.object({ email_id: z.string() }) })
        .parse(JSON.parse(raw));
    } catch {
      return json({ error: "Hibás aláírás." }, 400);
    }
    const states: Record<string, string> = {
      "email.delivered": "delivered",
      "email.bounced": "bounced",
      "email.complained": "complained",
      "email.failed": "failed",
    };
    if (states[event.type])
      await statement(
        env.DB,
        "UPDATE emailDeliveries SET state=?,updatedAt=? WHERE id=? AND state NOT IN ('bounced','complained','failed')",
        states[event.type],
        Date.now(),
        event.data.email_id,
      ).run();
    return json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
