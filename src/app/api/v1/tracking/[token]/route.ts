import { getEnv } from "@/lib/env";
import { first } from "@/lib/db";
import { AppError, canWrite } from "@/lib/domain";
import { publicTracking } from "@/lib/crm";
import { hash, rateLimit } from "@/lib/security";
import { errorResponse, json } from "@/lib/http";
export async function GET(
  request: Request,
  route: { params: Promise<{ token: string }> },
) {
  try {
    const env = await getEnv(),
      token =
        request.headers.get("authorization")?.replace(/^Bearer /i, "") || "";
    if (!token.startsWith("hh_"))
      throw new AppError(401, "Érvénytelen API-kulcs.");
    const key = await first<{
      tenantId: string;
      plan: string;
      state: string;
      pastDueAt: number | null;
      trialEnd: number | null;
      periodEnd: number | null;
    }>(
      env.DB,
      "SELECT k.tenantId,t.plan,t.state,t.pastDueAt,t.trialEnd,t.periodEnd FROM apiKeys k JOIN tenants t ON t.id=k.tenantId WHERE k.tokenHash=? AND k.revokedAt IS NULL",
      await hash(token),
    );
    if (!key) throw new AppError(401, "Érvénytelen API-kulcs.");
    if (
      key.plan !== "BUSINESS" ||
      !canWrite(
        key.state,
        key.pastDueAt,
        Date.now(),
        key.trialEnd,
        key.periodEnd,
      )
    )
      throw new AppError(403, "Aktív Business előfizetés szükséges.");
    await rateLimit(env.DB, "api:" + key.tenantId, 300);
    return json(
      await publicTracking(env, (await route.params).token, key.tenantId),
    );
  } catch (error) {
    return errorResponse(error);
  }
}
