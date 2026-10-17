import { getEnv } from "@/lib/env";
import { stripe } from "@/lib/billing";
import { errorResponse, json, readText } from "@/lib/http";
import { statement } from "@/lib/db";
import { taskStatement } from "@/lib/tasks";
export async function POST(request: Request) {
  try {
    const env = await getEnv(),
      signature = request.headers.get("stripe-signature");
    if (!signature || !env.STRIPE_WEBHOOK_SECRET)
      return json({ error: "Hibás webhook." }, 400);
    let event;
    try {
      event = await stripe(env).webhooks.constructEventAsync(
        await readText(request),
        signature,
        env.STRIPE_WEBHOOK_SECRET,
      );
    } catch {
      return json({ error: "Hibás aláírás." }, 400);
    }
    await env.DB.batch([
      statement(
        env.DB,
        "INSERT INTO webhookEvents(id,type,receivedAt) VALUES(?,?,?) ON CONFLICT(id) DO NOTHING",
        event.id,
        event.type,
        Date.now(),
      ),
      taskStatement(env.DB, null, "STRIPE_EVENT", event, "stripe:" + event.id),
    ]);
    return json({ received: true });
  } catch (error) {
    return errorResponse(error);
  }
}
