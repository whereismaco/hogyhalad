import { first, statement, uid } from "./db";
import { AppError } from "./domain";
import type { Env } from "./env";
export async function reserveAiTask(
  env: Env,
  tenantId: string,
  kind: string,
  payload: Record<string, unknown>,
  cost: number,
  requestKey: string,
) {
  if (!env.OPENAI_API_KEY)
    throw new AppError(503, "Az OpenAI-hozzáférés még nincs beállítva.");
  const db = env.DB,
    key = "ai:" + tenantId + ":" + requestKey;
  const prior = await first<{ id: string }>(
    db,
    "SELECT id FROM tasks WHERE tenantId=? AND dedupeKey=?",
    tenantId,
    key,
  );
  if (prior) return prior;
  const id = uid(),
    now = Date.now();
  await db.batch([
    statement(
      db,
      "INSERT INTO tasks(id,tenantId,type,payload,availableAt,dedupeKey,createdAt,updatedAt) SELECT ?,?,'AI',?,?,?,?,? FROM tenants WHERE id=? AND monthlyCredits+purchasedCredits>=? AND creditDebt=0 AND state IN ('active','trialing','past_due') AND (state!='trialing' OR trialEnd IS NULL OR trialEnd>?) AND (state!='past_due' OR pastDueAt+259200000>?) ON CONFLICT(dedupeKey) DO NOTHING",
      id,
      tenantId,
      JSON.stringify({ kind, ...payload }),
      now,
      key,
      now,
      now,
      tenantId,
      cost,
      now,
      now,
    ),
    statement(
      db,
      "INSERT INTO creditLedger(id,tenantId,taskId,monthlyDelta,purchasedDelta,description,requestKey,createdAt) SELECT ?,id,?,-MIN(monthlyCredits,?),-MAX(0,?-monthlyCredits),?,?,? FROM tenants WHERE id=? AND EXISTS(SELECT 1 FROM tasks WHERE id=?)",
      uid(),
      id,
      cost,
      cost,
      kind === "SUMMARY" ? "Napi összefoglaló" : "Megkeresés és választervezet",
      "reserve:" + id,
      now,
      tenantId,
      id,
    ),
    statement(
      db,
      "UPDATE tenants SET purchasedCredits=purchasedCredits-MAX(0,?-monthlyCredits),monthlyCredits=MAX(0,monthlyCredits-?) WHERE id=? AND EXISTS(SELECT 1 FROM tasks WHERE id=?)",
      cost,
      cost,
      tenantId,
      id,
    ),
  ]);
  const result = await first<{ id: string }>(
    db,
    "SELECT id FROM tasks WHERE tenantId=? AND dedupeKey=?",
    tenantId,
    key,
  );
  if (!result) throw new AppError(402, "Nincs elegendő AI-kredit.");
  return result;
}
export async function refundAi(env: Env, taskId: string) {
  await env.DB.batch([
    statement(
      env.DB,
      "INSERT INTO creditLedger(id,tenantId,taskId,monthlyDelta,purchasedDelta,description,requestKey,createdAt) SELECT ?,tenantId,taskId,-monthlyDelta,-purchasedDelta,'Sikertelen AI-művelet visszatérítése',?,? FROM creditLedger WHERE taskId=? AND requestKey=? ON CONFLICT(requestKey) DO NOTHING",
      uid(),
      "refund:" + taskId,
      Date.now(),
      taskId,
      "reserve:" + taskId,
    ),
    statement(
      env.DB,
      "UPDATE tenants SET monthlyCredits=monthlyCredits+COALESCE((SELECT monthlyDelta FROM creditLedger WHERE requestKey=?),0),purchasedCredits=purchasedCredits+COALESCE((SELECT purchasedDelta FROM creditLedger WHERE requestKey=?),0) WHERE id=(SELECT tenantId FROM tasks WHERE id=?) AND changes()=1",
      "refund:" + taskId,
      "refund:" + taskId,
      taskId,
    ),
  ]);
}
