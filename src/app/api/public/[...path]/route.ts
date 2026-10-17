import { z } from "zod";
import { getEnv } from "@/lib/env";
import { first, statement, uid } from "@/lib/db";
import {
  AppError,
  canWrite,
  customerSchema,
  itemInputSchema,
  calculateItem,
  calculateTotal,
} from "@/lib/domain";
import { catalog, publicTracking } from "@/lib/crm";
import type { Tenant } from "@/lib/access";
import { rateLimit, hash } from "@/lib/security";
import { body, errorResponse, json } from "@/lib/http";
import { enqueue } from "@/lib/tasks";
export const dynamic = "force-dynamic";
async function handler(
  request: Request,
  route: { params: Promise<{ path: string[] }> },
) {
  try {
    const env = await getEnv(),
      db = env.DB,
      url = new URL(request.url),
      [kind, id] = (await route.params).path;
    const ip = request.headers.get("cf-connecting-ip") || "local";
    await rateLimit(db, "public:" + ip, 120);
    if (kind === "config" && request.method === "GET")
      return json({
        googleEnabled: !!env.GOOGLE_CLIENT_ID && !!env.GOOGLE_CLIENT_SECRET,
        turnstileSiteKey: env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || null,
      });
    if (kind === "tracking" && request.method === "GET")
      return json(await publicTracking(env, id));
    if (kind === "files" && request.method === "GET") {
      const token = url.searchParams.get("token") || "";
      if (!/^[A-Za-z0-9_-]{43}$/.test(token))
        throw new AppError(404, "Nem található.");
      const file = await first<{ objectKey: string; mime: string }>(
        db,
        "SELECT f.objectKey,f.mime FROM files f JOIN jobs j ON j.id=f.jobId AND j.tenantId=f.tenantId WHERE f.id=? AND f.kind='PHOTO' AND f.isPublic=1 AND j.trackingHash=?",
        id,
        await hash(token),
      );
      if (!file) throw new AppError(404, "Nem található.");
      const object = await env.FILES.get(file.objectKey);
      if (!object) throw new AppError(404, "Nem található.");
      return new Response(object.body, {
        headers: {
          "Content-Type": file.mime,
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
          "Content-Security-Policy": "sandbox",
        },
      });
    }
    if (kind === "widget" || kind === "quote") {
      const tenant = await first<Tenant>(
        db,
        "SELECT * FROM tenants WHERE slug=?",
        id,
      );
      if (
        !tenant ||
        tenant.plan !== "BUSINESS" ||
        !canWrite(
          tenant.state,
          tenant.pastDueAt,
          Date.now(),
          tenant.trialEnd,
          tenant.periodEnd,
        )
      )
        throw new AppError(404, "Az ajánlatkérő jelenleg nem elérhető.");
      if (kind === "quote" && request.method === "GET") {
        const raw = url.searchParams.get("item") || "";
        if (raw.length > 4000)
          throw new AppError(400, "Túl hosszú kalkuláció.");
        const input = itemInputSchema.parse(JSON.parse(raw));
        const result = calculateItem(input, await catalog(db, tenant.id));
        return json({
          total: calculateTotal([result.total], tenant.minimumAmount),
        });
      }
      if (request.method === "GET")
        return json({
          name: tenant.name,
          slug: tenant.slug,
          minimumAmount: tenant.minimumAmount,
          catalog: await catalog(db, tenant.id),
          turnstileSiteKey: env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || null,
        });
      if (request.method === "POST") {
        const origin = request.headers.get("origin"),
          allowed = [
            new URL(env.APP_URL).origin,
            ...(JSON.parse(tenant.allowedOrigins) as string[]),
          ];
        if (!origin || !allowed.includes(origin))
          throw new AppError(403, "Ez a weboldal nincs engedélyezve.");
        await rateLimit(db, "lead:" + ip + ":" + tenant.id, 5, 3600000);
        const input = customerSchema
          .extend({
            items: z.array(itemInputSchema).max(30),
            requestKey: z.uuid(),
            turnstileToken: z.string().min(1),
            website: z.string().max(0),
          })
          .parse(await body(request));
        if (!env.TURNSTILE_SECRET_KEY)
          throw new AppError(503, "A spamvédelem nincs beállítva.");
        const verification = await fetch(
          "https://challenges.cloudflare.com/turnstile/v0/siteverify",
          {
            method: "POST",
            body: new URLSearchParams({
              secret: env.TURNSTILE_SECRET_KEY,
              response: input.turnstileToken,
              remoteip: ip,
            }),
          },
        );
        const verified = (await verification.json()) as {
          success: boolean;
          hostname?: string;
        };
        if (
          !verified.success ||
          !verified.hostname ||
          !allowed.some((o) => new URL(o).hostname === verified.hostname)
        )
          throw new AppError(400, "A spamellenőrzés sikertelen.");
        const prices = await catalog(db, tenant.id),
          total = calculateTotal(
            input.items.map((i) => calculateItem(i, prices).total),
            tenant.minimumAmount,
          ),
          now = Date.now();
        const inquiryId = uid();
        await statement(
          db,
          "INSERT INTO inquiries(id,tenantId,name,email,phone,address,notes,source,estimatedAmount,requestKey,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?,'WEB_WIDGET',?,?,?,?) ON CONFLICT(tenantId,requestKey) DO NOTHING",
          inquiryId,
          tenant.id,
          input.name,
          input.email,
          input.phone,
          input.address,
          input.notes,
          total,
          input.requestKey,
          now,
          now,
        ).run();
        await enqueue(
          db,
          tenant.id,
          "EMAIL",
          {
            to: tenant.email,
            subject: "Új megkeresés – " + input.name,
            text:
              "Új webes megkeresés érkezett. Részletek: " +
              env.APP_URL +
              "/dashboard/inquiries",
          },
          "new-inquiry:" + input.requestKey,
        );
        if (tenant.autoAiResponse) {
          const inquiry = await first<{ id: string }>(
            db,
            "SELECT id FROM inquiries WHERE tenantId=? AND requestKey=?",
            tenant.id,
            input.requestKey,
          );
          if (inquiry)
            await enqueue(
              db,
              tenant.id,
              "AI_AUTO",
              { inquiryId: inquiry.id },
              "ai-auto:" + inquiry.id,
            );
        }
        return json({ ok: true, estimatedAmount: total }, 201);
      }
    }
    throw new AppError(404, "Nem található.");
  } catch (error) {
    return errorResponse(error);
  }
}
export { handler as GET, handler as POST };
