import { createAuth } from "./auth";
import { AppError, canWrite, type Plan, type Role } from "./domain";
import { first, rows } from "./db";
import type { Env } from "./env";
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  plan: Plan;
  state: string;
  template: string;
  email: string;
  phone: string;
  address: string;
  taxNumber: string;
  minimumAmount: number;
  workflowJson: string;
  periodStart: number;
  periodEnd: number | null;
  trialEnd: number | null;
  pastDueAt: number | null;
  monthlyCredits: number;
  purchasedCredits: number;
  creditDebt: number;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  cancelAtPeriodEnd: number;
  pendingPlan: Plan | null;
  autoAiResponse: number;
  googleReviewUrl: string;
  facebookReviewUrl: string;
  invoiceProvider: string;
  invoiceKey: string | null;
  invoiceBlockId: string;
  invoiceTaxMode: string;
  invoiceAutoIssue: number;
  allowedOrigins: string;
}
export interface Access {
  env: Env;
  user: { id: string; email: string; name: string };
  tenant: Tenant;
  memberId: string;
  role: Role;
}
export async function identity(env: Env, headers: Headers) {
  const session = await createAuth(env).api.getSession({ headers });
  if (!session || !session.user.emailVerified)
    throw new AppError(401, "A folytatáshoz jelentkezz be.");
  return session.user;
}
export async function memberships(env: Env, userId: string) {
  return rows<{ id: string; name: string; role: Role }>(
    env.DB,
    "SELECT t.id,t.name,m.role FROM tenants t JOIN members m ON m.tenantId=t.id WHERE m.userId=? AND m.active=1 ORDER BY t.name",
    userId,
  );
}
export async function access(
  env: Env,
  headers: Headers,
  tenantId?: string,
): Promise<Access> {
  const user = await identity(env, headers);
  const id =
    tenantId ||
    headers
      .get("cookie")
      ?.split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith("hh-tenant="))
      ?.slice(10);
  const result = id
    ? await first<Tenant & { memberId: string; role: Role }>(
        env.DB,
        "SELECT t.*,m.id AS memberId,m.role FROM tenants t JOIN members m ON m.tenantId=t.id WHERE t.id=? AND m.userId=? AND m.active=1",
        id,
        user.id,
      )
    : await first<Tenant & { memberId: string; role: Role }>(
        env.DB,
        "SELECT t.*,m.id AS memberId,m.role FROM tenants t JOIN members m ON m.tenantId=t.id WHERE m.userId=? AND m.active=1 ORDER BY t.createdAt LIMIT 1",
        user.id,
      );
  if (!result)
    throw new AppError(
      409,
      "Először hozz létre egy céget, vagy fogadj el egy meghívást.",
    );
  return {
    env,
    user,
    tenant: result,
    memberId: result.memberId,
    role: result.role,
  };
}
export function requireRole(ctx: Access, allowed: Role[]) {
  if (!allowed.includes(ctx.role))
    throw new AppError(403, "Ehhez a művelethez nincs jogosultságod.");
}
export function requireWrite(ctx: Access) {
  if (
    !canWrite(
      ctx.tenant.state,
      ctx.tenant.pastDueAt,
      Date.now(),
      ctx.tenant.trialEnd,
      ctx.tenant.periodEnd,
    )
  )
    throw new AppError(
      402,
      "A módosításhoz aktív előfizetés vagy próbaidő szükséges.",
    );
}
export function requireBusiness(ctx: Access) {
  if (ctx.tenant.plan !== "BUSINESS")
    throw new AppError(403, "Ez a funkció a Business csomagban érhető el.");
}
export function jobScope(ctx: Access) {
  return ctx.role === "DRIVER" || ctx.role === "WORKER"
    ? { sql: " AND assignedMemberId=?", args: [ctx.memberId] }
    : { sql: "", args: [] };
}
