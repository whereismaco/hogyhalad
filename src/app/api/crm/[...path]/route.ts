import { z } from "zod";
import { getEnv } from "@/lib/env";
import {
  access,
  identity,
  memberships,
  requireBusiness,
  requireRole,
  requireWrite,
  jobScope,
} from "@/lib/access";
import { body, errorResponse, json, readForm } from "@/lib/http";
import {
  AppError,
  canWrite,
  customerSchema,
  priceRuleSchema,
  workflowSchema,
  type Plan,
  type Stage,
} from "@/lib/domain";
import { reserveAiTask } from "@/lib/ai";
import { first, rows, statement, uid } from "@/lib/db";
import {
  addItem,
  catalog,
  createJob,
  createTenant,
  getJob,
  jobDetail,
  safeJob,
  updateJob,
  usage,
  type JobRecord,
} from "@/lib/crm";
import {
  assertOrigin,
  decrypt,
  encrypt,
  hash,
  randomToken,
  rateLimit,
} from "@/lib/security";
import { enqueue, taskStatement, taskAfterEvent } from "@/lib/tasks";
import { checkout, portal, schedulePlan, stripe } from "@/lib/billing";
import { upload } from "@/lib/storage";
export const dynamic = "force-dynamic";

async function handler(
  request: Request,
  route: { params: Promise<{ path: string[] }> },
) {
  try {
    const env = await getEnv(),
      db = env.DB,
      url = new URL(request.url),
      [resource, id, action] = (await route.params).path;
    assertOrigin(request, env);
    const user = await identity(env, request.headers);
    await rateLimit(db, "user:" + user.id, 180);
    if (resource === "companies") {
      if (request.method === "GET")
        return json({
          companies: await memberships(env, user.id),
          user: { id: user.id, name: user.name, email: user.email },
        });
      if (request.method === "POST")
        return json(await createTenant(env, user.id, await body(request)), 201);
    }
    if (resource === "accept-invitation" && request.method === "POST") {
      const input = z
        .object({ token: z.string().min(20) })
        .parse(await body(request));
      const invite = await first<{
        id: string;
        tenantId: string;
        email: string;
        role: string;
      }>(
        db,
        "SELECT * FROM invitations WHERE tokenHash=? AND state='pending' AND expiresAt>?",
        await hash(input.token),
        Date.now(),
      );
      if (!invite || invite.email.toLowerCase() !== user.email.toLowerCase())
        throw new AppError(
          404,
          "Nincs ehhez az e-mail-címhez érvényes meghívás.",
        );
      const t = await first<{
        plan: Plan;
        state: string;
        pastDueAt: number | null;
      }>(
        db,
        "SELECT plan,state,pastDueAt FROM tenants WHERE id=?",
        invite.tenantId,
      );
      if (!t || t.plan !== "BUSINESS" || !canWrite(t.state, t.pastDueAt))
        throw new AppError(
          403,
          "A meghívó cég Business előfizetése nem aktív.",
        );
      const memberId = uid(),
        now = Date.now();
      const accepted = await db.batch([
        statement(
          db,
          "UPDATE invitations SET state='accepted' WHERE id=? AND state='pending' AND expiresAt>?",
          invite.id,
          now,
        ),
        statement(
          db,
          "INSERT INTO members(id,tenantId,userId,role,createdAt) SELECT ?,?,?,?,? WHERE changes()=1 ON CONFLICT(tenantId,userId) DO UPDATE SET active=1,role=excluded.role",
          memberId,
          invite.tenantId,
          user.id,
          invite.role,
          now,
        ),
      ]);
      if (!accepted[0].meta.changes)
        throw new AppError(409, "A meghívást már felhasználták.");
      return json({ id: invite.tenantId });
    }
    const ctx = await access(env, request.headers);
    if (resource === "switch-company" && request.method === "POST") {
      const data = z.object({ id: z.string() }).parse(await body(request));
      await access(env, request.headers, data.id);
      return new Response(JSON.stringify({ ok: true }), {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
          "Set-Cookie":
            "hh-tenant=" +
            encodeURIComponent(data.id) +
            "; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000" +
            (env.APP_URL.startsWith("https:") ? "; Secure" : ""),
        },
      });
    }
    if (resource === "snapshot" && request.method === "GET") {
      const { invoiceKey: _key, ...tenant } = ctx.tenant;
      void _key;
      const scope = jobScope(ctx),
        counts = await first(
          db,
          "SELECT count(*) AS total,COALESCE(sum(CASE WHEN paymentStatus='PAID' THEN totalAmount ELSE 0 END),0) AS paid,COALESCE(sum(CASE WHEN archived=0 AND stageId!=json_extract(workflowJson,'$[#-1].id') THEN 1 ELSE 0 END),0) AS active FROM jobs WHERE tenantId=?" +
            scope.sql,
          ctx.tenant.id,
          ...scope.args,
        );
      const taskList = ["OWNER", "ADMIN"].includes(ctx.role)
        ? await rows(
            db,
            "SELECT id,type,state,attempts,lastError,result,createdAt FROM tasks WHERE tenantId=? ORDER BY createdAt DESC LIMIT 30",
            ctx.tenant.id,
          )
        : [];
      return json({
        tenant: { ...tenant, invoiceKeyConfigured: !!_key },
        user: { id: user.id, name: user.name, email: user.email },
        role: ctx.role,
        memberId: ctx.memberId,
        companies: await memberships(env, user.id),
        usage: await usage(db, ctx.tenant),
        counts,
        canWrite: canWrite(
          ctx.tenant.state,
          ctx.tenant.pastDueAt,
          Date.now(),
          ctx.tenant.trialEnd,
          ctx.tenant.periodEnd,
        ),
        catalog: await catalog(db, ctx.tenant.id),
        members: await rows(
          db,
          "SELECT m.id,m.role,m.active,u.name,u.email FROM members m JOIN user u ON u.id=m.userId WHERE m.tenantId=? ORDER BY m.role,u.name",
          ctx.tenant.id,
        ),
        tasks: taskList,
      });
    }
    if (resource === "customers") {
      requireRole(ctx, ["OWNER", "ADMIN", "DISPATCHER"]);
      if (request.method === "GET") {
        const query = (url.searchParams.get("q") || "").slice(0, 120),
          page = Math.max(1, Number(url.searchParams.get("page")) || 1);
        return json({
          items: await rows(
            db,
            "SELECT * FROM customers WHERE tenantId=? AND (name LIKE ? OR phone LIKE ? OR email LIKE ?) ORDER BY name LIMIT 50 OFFSET ?",
            ctx.tenant.id,
            "%" + query + "%",
            "%" + query + "%",
            "%" + query + "%",
            (page - 1) * 50,
          ),
        });
      }
      requireWrite(ctx);
      if (request.method === "POST" || request.method === "PATCH") {
        const data = customerSchema
            .extend({
              zip: z.string().max(20).default(""),
              city: z.string().max(100).default(""),
            })
            .parse(await body(request)),
          now = Date.now(),
          customerId = id || uid();
        if (id) {
          const result = await statement(
            db,
            "UPDATE customers SET name=?,email=?,phone=?,address=?,taxNumber=?,notes=?,zip=?,city=?,updatedAt=? WHERE tenantId=? AND id=?",
            data.name,
            data.email,
            data.phone,
            data.address,
            data.taxNumber,
            data.notes,
            data.zip,
            data.city,
            now,
            ctx.tenant.id,
            id,
          ).run();
          if (!result.meta.changes)
            throw new AppError(404, "Az ügyfél nem található.");
        } else
          await statement(
            db,
            "INSERT INTO customers(id,tenantId,name,email,phone,address,taxNumber,notes,zip,city,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
            customerId,
            ctx.tenant.id,
            data.name,
            data.email,
            data.phone,
            data.address,
            data.taxNumber,
            data.notes,
            data.zip,
            data.city,
            now,
            now,
          ).run();
        return json({ id: customerId });
      }
    }
    if (resource === "jobs") {
      if (request.method === "GET") {
        if (id) return json(await jobDetail(ctx, id));
        const scope = jobScope(ctx),
          q = (url.searchParams.get("q") || "").slice(0, 120),
          page = Math.max(1, Number(url.searchParams.get("page")) || 1),
          stage = url.searchParams.get("stage"),
          archived = url.searchParams.get("archived") === "1" ? 1 : 0;
        const date = url.searchParams.get("date");
        if (date) z.iso.date().parse(date);
        const where =
          "j.tenantId=? AND j.archived=?" +
          scope.sql.replace("assignedMemberId", "j.assignedMemberId") +
          " AND (c.name LIKE ? OR j.jobCode LIKE ? OR c.address LIKE ?)" +
          (stage ? " AND j.stageId=?" : "") +
          (date
            ? " AND (j.scheduledDate=? OR j.deliveryDate=?) AND json_extract(j.workflowJson,'$[#-1].id')!=j.stageId"
            : "");
        const args = [
          ctx.tenant.id,
          archived,
          ...scope.args,
          "%" + q + "%",
          "%" + q + "%",
          "%" + q + "%",
          ...(stage ? [stage] : []),
          ...(date ? [date, date] : []),
        ];
        const jobs = await rows<JobRecord>(
          db,
          "SELECT j.*,c.name AS customerName,c.email AS customerEmail,c.phone AS customerPhone,c.address AS customerAddress FROM jobs j JOIN customers c ON c.id=j.customerId AND c.tenantId=j.tenantId WHERE " +
            where +
            (date
              ? " ORDER BY j.routeOrder,j.createdAt"
              : " ORDER BY j.createdAt DESC") +
            " LIMIT 50 OFFSET ?",
          ...args,
          (page - 1) * 50,
        );
        const count = await first<{ n: number }>(
          db,
          "SELECT count(*) AS n FROM jobs j JOIN customers c ON c.id=j.customerId AND c.tenantId=j.tenantId WHERE " +
            where,
          ...args,
        );
        return json({ items: jobs.map(safeJob), total: count?.n ?? 0, page });
      }
      if (!id && request.method === "POST")
        return json(await createJob(ctx, await body(request)), 201);
      if (id && request.method === "PATCH")
        return json(await updateJob(ctx, id, await body(request)));
      if (id && request.method === "POST") {
        requireWrite(ctx);
        const job = await getJob(ctx, id);
        if (action === "items")
          return json(await addItem(ctx, id, await body(request)), 201);
        if (action === "remove-item") {
          requireRole(ctx, ["OWNER", "ADMIN", "DISPATCHER"]);
          const data = z
            .object({ itemId: z.string(), version: z.number().int() })
            .parse(await body(request));
          if (
            !(await first(
              db,
              "SELECT id FROM jobItems WHERE tenantId=? AND jobId=? AND id=?",
              ctx.tenant.id,
              id,
              data.itemId,
            ))
          )
            throw new AppError(404, "A tétel nem található.");
          const changed = await db.batch([
            statement(
              db,
              "UPDATE jobs SET version=version+1,updatedAt=? WHERE tenantId=? AND id=? AND version=?",
              Date.now(),
              ctx.tenant.id,
              id,
              data.version,
            ),
            statement(
              db,
              "DELETE FROM jobItems WHERE tenantId=? AND jobId=? AND id=? AND changes()=1",
              ctx.tenant.id,
              id,
              data.itemId,
            ),
            statement(
              db,
              "UPDATE jobs SET totalAmount=CASE WHEN (SELECT count(*) FROM jobItems WHERE tenantId=? AND jobId=?)=0 THEN 0 ELSE MAX(minimumAmount,(SELECT SUM(total) FROM jobItems WHERE tenantId=? AND jobId=?)) END WHERE tenantId=? AND id=?",
              ctx.tenant.id,
              id,
              ctx.tenant.id,
              id,
              ctx.tenant.id,
              id,
            ),
          ]);
          if (!changed[0].meta.changes)
            throw new AppError(
              409,
              "A munka megváltozott. Frissítsd az adatokat.",
            );
          return json({ ok: true });
        }
        if (action === "tracking") {
          requireRole(ctx, ["OWNER", "ADMIN", "DISPATCHER"]);
          const data = z
            .object({
              rotate: z.boolean().default(false),
              revoke: z.boolean().default(false),
            })
            .parse(await body(request));
          if (data.revoke) {
            await statement(
              db,
              "UPDATE jobs SET trackingHash=NULL,trackingCipher=NULL WHERE tenantId=? AND id=?",
              ctx.tenant.id,
              id,
            ).run();
            return json({ url: null });
          }
          let token =
            job.trackingCipher && !data.rotate
              ? await decrypt(env, job.trackingCipher)
              : null;
          if (!token) {
            token = randomToken();
            await statement(
              db,
              "UPDATE jobs SET trackingHash=?,trackingCipher=? WHERE tenantId=? AND id=?",
              await hash(token),
              await encrypt(env, token),
              ctx.tenant.id,
              id,
            ).run();
          }
          return json({ url: env.APP_URL + "/kovetes/" + token });
        }
        if (action === "upload") {
          const form = await readForm(request),
            file = form.get("file"),
            kind = form.get("kind");
          if (
            !(file instanceof File) ||
            !["PHOTO", "SIGNATURE"].includes(String(kind))
          )
            throw new AppError(400, "Válassz képet.");
          return json(
            await upload(ctx, id, file, kind as "PHOTO" | "SIGNATURE"),
            201,
          );
        }
        if (action === "handover") {
          const data = z
            .object({
              signatureFileId: z.string(),
              kind: z.enum(["PICKUP", "DELIVERY"]),
              version: z.number().int(),
            })
            .parse(await body(request));
          if (
            !(await first(
              db,
              "SELECT id FROM files WHERE tenantId=? AND jobId=? AND id=? AND kind='SIGNATURE'",
              ctx.tenant.id,
              id,
              data.signatureFileId,
            ))
          )
            throw new AppError(400, "A mentett aláírás hiányzik.");
          const stages = JSON.parse(job.workflowJson) as Stage[],
            current = stages.find((s) => s.id === job.stageId);
          if (data.kind === "PICKUP" && current?.kind !== "NEW")
            throw new AppError(409, "A munka már át van véve.");
          if (
            data.kind === "DELIVERY" &&
            !["READY", "DELIVERY"].includes(current?.kind ?? "")
          )
            throw new AppError(409, "A munka még nincs átadásra kész.");
          const next = stages.find(
            (s) => s.kind === (data.kind === "PICKUP" ? "RECEIVED" : "CLOSED"),
          );
          if (!next)
            throw new AppError(
              400,
              "A munkafolyamat nem tartalmaz megfelelő átadási lépést.",
            );
          const handoverId = uid(),
            eventId = uid(),
            now = Date.now();
          const result = await db.batch([
            statement(
              db,
              "UPDATE jobs SET stageId=?,version=version+1,updatedAt=? WHERE tenantId=? AND id=? AND version=?",
              next.id,
              now,
              ctx.tenant.id,
              id,
              data.version,
            ),
            statement(
              db,
              "INSERT INTO handovers(id,tenantId,jobId,memberId,kind,signatureFileId,snapshotJson,createdAt) SELECT ?,?,?,?,?,?,?,? WHERE changes()=1",
              handoverId,
              ctx.tenant.id,
              id,
              ctx.memberId,
              data.kind,
              data.signatureFileId,
              JSON.stringify({
                companyName: ctx.tenant.name,
                job: safeJob(job),
                items: await rows(
                  db,
                  "SELECT name,unit,quantity,total FROM jobItems WHERE tenantId=? AND jobId=?",
                  ctx.tenant.id,
                  id,
                ),
              }),
              now,
            ),
            statement(
              db,
              "INSERT INTO jobEvents(id,tenantId,jobId,memberId,stageId,kind,message,isPublic,createdAt) SELECT ?,?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM handovers WHERE id=?)",
              eventId,
              ctx.tenant.id,
              id,
              ctx.memberId,
              next.id,
              data.kind,
              next.name,
              Number(next.public),
              now,
              handoverId,
            ),
            taskAfterEvent(
              db,
              ctx.tenant.id,
              "PDF",
              { jobId: id, handoverId },
              "receipt:" + handoverId,
              eventId,
            ),
            taskAfterEvent(
              db,
              ctx.tenant.id,
              "JOB_EMAIL",
              {
                jobId: id,
                stageId: next.id,
                publicMessage: job.publicMessage,
                occurredAt: now,
              },
              "handover:" + handoverId,
              eventId,
            ),
            ...(data.kind === "DELIVERY" &&
            ctx.tenant.plan === "BUSINESS" &&
            ctx.tenant.invoiceAutoIssue
              ? [
                  taskAfterEvent(
                    db,
                    ctx.tenant.id,
                    "INVOICE",
                    { jobId: id },
                    "invoice-job:" + id,
                    eventId,
                  ),
                ]
              : []),
          ]);
          if (!result[0].meta.changes)
            throw new AppError(
              409,
              "A munka megváltozott. Frissítsd az adatokat.",
            );
          return json({ ok: true });
        }
        if (action === "labels") {
          requireRole(ctx, ["OWNER", "ADMIN", "DISPATCHER"]);
          return json(
            await enqueue(
              db,
              ctx.tenant.id,
              "PDF",
              { jobId: id, labels: true },
              "labels:" + id + ":" + job.version,
            ),
          );
        }
        if (action === "invoice") {
          requireRole(ctx, ["OWNER", "ADMIN"]);
          requireBusiness(ctx);
          if (!ctx.tenant.invoiceKey || !ctx.tenant.invoiceTaxMode)
            throw new AppError(
              409,
              "Állítsd be a számlázó kapcsolatot és az adózást.",
            );
          return json(
            await enqueue(
              db,
              ctx.tenant.id,
              "INVOICE",
              { jobId: id },
              "invoice-job:" + id,
            ),
          );
        }
      }
    }
    if (resource === "files" && id) {
      const file = await first<{
        jobId: string;
        objectKey: string;
        mime: string;
        filename: string;
      }>(
        db,
        "SELECT * FROM files WHERE tenantId=? AND id=?",
        ctx.tenant.id,
        id,
      );
      if (!file) throw new AppError(404, "A fájl nem található.");
      await getJob(ctx, file.jobId);
      if (request.method === "GET") {
        const object = await env.FILES.get(file.objectKey);
        if (!object) throw new AppError(404, "A fájl nem található.");
        return new Response(object.body, {
          headers: {
            "Content-Type": file.mime,
            "Content-Disposition": 'inline; filename="' + file.filename + '"',
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
            "Content-Security-Policy": "sandbox",
          },
        });
      }
      requireRole(ctx, ["OWNER", "ADMIN", "DISPATCHER"]);
      requireWrite(ctx);
      if (request.method === "PATCH") {
        const input = z
          .object({ isPublic: z.boolean() })
          .parse(await body(request));
        await statement(
          db,
          "UPDATE files SET isPublic=? WHERE tenantId=? AND id=? AND kind='PHOTO'",
          Number(input.isPublic),
          ctx.tenant.id,
          id,
        ).run();
        return json({ ok: true });
      }
    }
    if (resource === "catalog") {
      if (request.method === "GET")
        return json({ items: await catalog(db, ctx.tenant.id) });
      requireRole(ctx, ["OWNER", "ADMIN"]);
      requireWrite(ctx);
      const data = priceRuleSchema.parse(await body(request)),
        ruleId = id || uid();
      if (id)
        await statement(
          db,
          "UPDATE priceRules SET name=?,unit=?,unitPrice=?,isExtra=?,active=? WHERE tenantId=? AND id=?",
          data.name,
          data.unit,
          data.unitPrice,
          Number(data.isExtra),
          Number(data.active),
          ctx.tenant.id,
          id,
        ).run();
      else
        await statement(
          db,
          "INSERT INTO priceRules(id,tenantId,name,unit,unitPrice,isExtra,active,createdAt) VALUES(?,?,?,?,?,?,?,?)",
          ruleId,
          ctx.tenant.id,
          data.name,
          data.unit,
          data.unitPrice,
          Number(data.isExtra),
          Number(data.active),
          Date.now(),
        ).run();
      return json({ id: ruleId });
    }
    if (resource === "inquiries") {
      requireRole(ctx, ["OWNER", "ADMIN", "DISPATCHER"]);
      if (request.method === "GET") {
        const q = (url.searchParams.get("q") || "").slice(0, 120),
          page = Math.max(1, Number(url.searchParams.get("page")) || 1);
        return json({
          items: await rows(
            db,
            "SELECT * FROM inquiries WHERE tenantId=? AND (name LIKE ? OR phone LIKE ?) ORDER BY createdAt DESC LIMIT 50 OFFSET ?",
            ctx.tenant.id,
            "%" + q + "%",
            "%" + q + "%",
            (page - 1) * 50,
          ),
        });
      }
      requireWrite(ctx);
      if (!id && request.method === "POST") {
        const data = customerSchema
            .extend({
              source: z.enum(["MANUAL", "PHONE", "EMAIL"]).default("MANUAL"),
              requestKey: z.uuid(),
            })
            .parse(await body(request)),
          inquiryId = uid(),
          now = Date.now();
        await statement(
          db,
          "INSERT INTO inquiries(id,tenantId,name,email,phone,address,notes,zip,city,taxNumber,source,requestKey,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(tenantId,requestKey) DO NOTHING",
          inquiryId,
          ctx.tenant.id,
          data.name,
          data.email,
          data.phone,
          data.address,
          data.notes,
          data.zip,
          data.city,
          data.taxNumber,
          data.source,
          data.requestKey,
          now,
          now,
        ).run();
        return json(
          await first(
            db,
            "SELECT id FROM inquiries WHERE tenantId=? AND requestKey=?",
            ctx.tenant.id,
            data.requestKey,
          ),
          201,
        );
      }
      const inquiry = await first<{
        id: string;
        name: string;
        email: string;
        phone: string;
        address: string;
        notes: string;
        aiDraft: string | null;
        zip: string;
        city: string;
        taxNumber: string;
        jobId: string | null;
      }>(
        db,
        "SELECT * FROM inquiries WHERE tenantId=? AND id=?",
        ctx.tenant.id,
        id,
      );
      if (!inquiry) throw new AppError(404, "A megkeresés nem található.");
      if (action === "convert") {
        if (inquiry.jobId) return json({ id: inquiry.jobId });
        const result = await createJob(ctx, {
          customer: {
            name: inquiry.name,
            email: inquiry.email,
            phone: inquiry.phone,
            address: inquiry.address,
            notes: inquiry.notes,
            zip: inquiry.zip,
            city: inquiry.city,
            taxNumber: inquiry.taxNumber,
          },
          requestKey: inquiry.id,
        });
        await statement(
          db,
          "UPDATE inquiries SET jobId=?,state='CONVERTED',updatedAt=? WHERE tenantId=? AND id=?",
          result.id,
          Date.now(),
          ctx.tenant.id,
          id,
        ).run();
        return json(result);
      }
      if (action === "send") {
        const data = z
          .object({
            text: z.string().trim().min(5).max(10000),
            requestKey: z.uuid(),
          })
          .parse(await body(request));
        if (!inquiry.email) throw new AppError(400, "Nincs e-mail-cím.");
        return json(
          await enqueue(
            db,
            ctx.tenant.id,
            "EMAIL",
            {
              to: inquiry.email,
              subject: "Ajánlat – " + ctx.tenant.name,
              text: data.text,
              inquiryId: id,
            },
            "offer:" + data.requestKey,
          ),
        );
      }
      if (action === "ai") {
        const data = z
          .object({ requestKey: z.uuid() })
          .parse(await body(request));
        requireWrite(ctx);
        return json(
          await reserveAiTask(
            env,
            ctx.tenant.id,
            "INQUIRY",
            { inquiryId: id },
            1,
            data.requestKey,
          ),
        );
      }
      if (request.method === "PATCH") {
        const data = z
          .object({
            state: z.enum(["NEW", "OFFER_SENT", "DECLINED", "ARCHIVED"]),
            estimatedAmount: z.number().int().min(0).optional(),
            aiDraft: z.string().max(10000).optional(),
          })
          .parse(await body(request));
        await statement(
          db,
          "UPDATE inquiries SET state=?,estimatedAmount=COALESCE(?,estimatedAmount),aiDraft=COALESCE(?,aiDraft),updatedAt=? WHERE tenantId=? AND id=?",
          data.state,
          data.estimatedAmount ?? null,
          data.aiDraft ?? null,
          Date.now(),
          ctx.tenant.id,
          id,
        ).run();
        return json({ ok: true });
      }
    }
    if (resource === "settings" && request.method === "PATCH") {
      requireRole(ctx, ["OWNER", "ADMIN"]);
      requireWrite(ctx);
      const input = z
        .object({
          name: z.string().min(2).max(120),
          email: z.email(),
          phone: z.string().min(6).max(30),
          address: z.string().max(300),
          zip: z.string().max(20).default(""),
          city: z.string().max(100).default(""),
          taxNumber: z.string().max(40),
          minimumAmount: z.number().int().min(0).max(100000000),
          workflow: workflowSchema,
          autoAiResponse: z.boolean(),
          googleReviewUrl: z.union([
            z.url({ protocol: /^https?$/ }),
            z.literal(""),
          ]),
          facebookReviewUrl: z.union([
            z.url({ protocol: /^https?$/ }),
            z.literal(""),
          ]),
          allowedOrigins: z
            .array(
              z
                .url({ protocol: /^https?$/ })
                .refine(
                  (v) => new URL(v).origin === v,
                  "Csak az origin kell, útvonal nélkül.",
                ),
            )
            .max(20),
        })
        .parse(await body(request));
      await statement(
        db,
        "UPDATE tenants SET name=?,email=?,phone=?,address=?,zip=?,city=?,taxNumber=?,minimumAmount=?,workflowJson=?,autoAiResponse=?,googleReviewUrl=?,facebookReviewUrl=?,allowedOrigins=?,updatedAt=? WHERE id=?",
        input.name,
        input.email,
        input.phone,
        input.address,
        input.zip,
        input.city,
        input.taxNumber,
        input.minimumAmount,
        JSON.stringify(input.workflow),
        Number(input.autoAiResponse),
        input.googleReviewUrl,
        input.facebookReviewUrl,
        JSON.stringify(input.allowedOrigins),
        Date.now(),
        ctx.tenant.id,
      ).run();
      return json({ ok: true });
    }
    if (resource === "integration" && request.method === "POST") {
      requireRole(ctx, ["OWNER"]);
      requireBusiness(ctx);
      requireWrite(ctx);
      const data = z
        .object({
          provider: z.enum(["MANUAL", "SZAMLAZZ", "BILLINGO"]),
          apiKey: z.string().max(500).optional(),
          blockId: z.string().max(50).default(""),
          taxMode: z.enum(["AAM", "27", "18", "5", "0"]),
          autoIssue: z.boolean(),
        })
        .parse(await body(request));
      if (data.provider !== "MANUAL" && !data.apiKey && !ctx.tenant.invoiceKey)
        throw new AppError(400, "Add meg a számlázó kulcsát.");
      if (
        data.provider !== ctx.tenant.invoiceProvider &&
        data.provider !== "MANUAL" &&
        !data.apiKey
      )
        throw new AppError(400, "Új szolgáltatóhoz új kulcs szükséges.");
      await statement(
        db,
        "UPDATE tenants SET invoiceProvider=?,invoiceKey=?,invoiceBlockId=?,invoiceTaxMode=?,invoiceAutoIssue=? WHERE id=?",
        data.provider,
        data.provider === "MANUAL"
          ? null
          : data.apiKey
            ? await encrypt(env, data.apiKey)
            : ctx.tenant.invoiceKey,
        data.blockId,
        data.taxMode,
        Number(data.autoIssue),
        ctx.tenant.id,
      ).run();
      return json({ ok: true });
    }
    if (resource === "members") {
      requireRole(ctx, ["OWNER", "ADMIN"]);
      requireBusiness(ctx);
      requireWrite(ctx);
      if (request.method === "GET")
        return json({
          invitations: await rows(
            db,
            "SELECT id,email,role,state,expiresAt FROM invitations WHERE tenantId=? ORDER BY createdAt DESC",
            ctx.tenant.id,
          ),
        });
      if (id && request.method === "PATCH") {
        const input = z
          .object({
            active: z.boolean(),
            role: z.enum(["ADMIN", "DISPATCHER", "DRIVER", "WORKER"]),
          })
          .parse(await body(request));
        const target = await first<{ role: string }>(
          db,
          "SELECT role FROM members WHERE tenantId=? AND id=?",
          ctx.tenant.id,
          id,
        );
        if (
          !target ||
          target.role === "OWNER" ||
          (ctx.role !== "OWNER" &&
            (target.role === "ADMIN" || input.role === "ADMIN"))
        )
          throw new AppError(403, "Ez a felhasználó nem módosítható.");
        await statement(
          db,
          "UPDATE members SET active=?,role=? WHERE tenantId=? AND id=?",
          Number(input.active),
          input.role,
          ctx.tenant.id,
          id,
        ).run();
        return json({ ok: true });
      }
      if (request.method === "POST") {
        const data = z
          .object({
            email: z.email(),
            role: z.enum(["ADMIN", "DISPATCHER", "DRIVER", "WORKER"]),
          })
          .parse(await body(request));
        if (
          await first(
            db,
            "SELECT m.id FROM members m JOIN user u ON u.id=m.userId WHERE m.tenantId=? AND lower(u.email)=lower(?) AND m.active=1",
            ctx.tenant.id,
            data.email,
          )
        )
          throw new AppError(409, "Ez a felhasználó már a cég tagja.");
        if (ctx.role !== "OWNER" && data.role === "ADMIN")
          throw new AppError(403, "Adminisztrátort a tulajdonos hívhat meg.");
        const token = randomToken(),
          invitationId = uid(),
          now = Date.now();
        await db.batch([
          statement(
            db,
            "UPDATE invitations SET state='expired' WHERE tenantId=? AND state='pending' AND expiresAt<=?",
            ctx.tenant.id,
            now,
          ),
          statement(
            db,
            "INSERT INTO invitations(id,tenantId,email,role,tokenHash,expiresAt,createdAt) VALUES(?,?,?,?,?,?,?)",
            invitationId,
            ctx.tenant.id,
            data.email.toLowerCase(),
            data.role,
            await hash(token),
            now + 7 * 86400000,
            now,
          ),
          taskStatement(
            db,
            ctx.tenant.id,
            "EMAIL",
            {
              to: data.email,
              subject: "Meghívó – " + ctx.tenant.name,
              text:
                "Csatlakozás a céghez: " +
                env.APP_URL +
                "/invitation?token=" +
                token,
            },
            "invite:" + invitationId,
          ),
        ]);
        return json({ ok: true });
      }
    }
    if (resource === "invitations" && id && request.method === "DELETE") {
      requireRole(ctx, ["OWNER", "ADMIN"]);
      requireBusiness(ctx);
      requireWrite(ctx);
      await statement(
        db,
        "UPDATE invitations SET state='revoked' WHERE tenantId=? AND id=? AND state='pending'",
        ctx.tenant.id,
        id,
      ).run();
      return json({ ok: true });
    }
    if (resource === "invoices") {
      requireRole(ctx, ["OWNER"]);
      requireBusiness(ctx);
      if (request.method === "GET")
        return json({
          items: await rows(
            db,
            "SELECT id,sourceId,state,number,externalId,jobId FROM invoiceRecords WHERE tenantId=? ORDER BY createdAt DESC LIMIT 100",
            ctx.tenant.id,
          ),
        });
      requireWrite(ctx);
      const data = z
        .object({
          exists: z.boolean(),
          confirmed: z.literal(true),
          number: z.string().max(120),
          externalId: z.string().max(120),
        })
        .parse(await body(request));
      if (data.exists && (!data.number || !data.externalId))
        throw new AppError(
          400,
          "Add meg az elkészült számla számát és azonosítóját.",
        );
      const record = await first<{ sourceId: string; jobId: string | null }>(
        db,
        "SELECT sourceId,jobId FROM invoiceRecords WHERE tenantId=? AND id=? AND state IN ('needs_review','issuing')",
        ctx.tenant.id,
        id,
      );
      if (!record)
        throw new AppError(404, "A számlázási ellenőrzés nem található.");
      await statement(
        db,
        "UPDATE invoiceRecords SET state=?,number=?,externalId=?,updatedAt=? WHERE tenantId=? AND id=?",
        data.exists ? "issued" : "ready",
        data.number || null,
        data.externalId || null,
        Date.now(),
        ctx.tenant.id,
        id,
      ).run();
      await statement(
        db,
        "INSERT INTO auditLog(id,tenantId,userId,action,targetId,createdAt) VALUES(?,?,?,'INVOICE_RECONCILED',?,?)",
        uid(),
        ctx.tenant.id,
        user.id,
        id,
        Date.now(),
      ).run();
      if (!data.exists)
        await statement(
          db,
          "UPDATE tasks SET state='pending',attempts=0,availableAt=?,lastError=NULL WHERE tenantId=? AND type='INVOICE' AND (json_extract(payload,'$.jobId')=? OR json_extract(payload,'$.sourceId')=?)",
          Date.now(),
          ctx.tenant.id,
          record.jobId,
          record.sourceId,
        ).run();
      return json({ ok: true });
    }
    if (resource === "api-keys") {
      requireRole(ctx, ["OWNER"]);
      requireBusiness(ctx);
      if (request.method === "GET")
        return json({
          items: await rows(
            db,
            "SELECT id,name,prefix,revokedAt,createdAt FROM apiKeys WHERE tenantId=?",
            ctx.tenant.id,
          ),
        });
      requireWrite(ctx);
      if (request.method === "DELETE" && id) {
        await statement(
          db,
          "UPDATE apiKeys SET revokedAt=? WHERE tenantId=? AND id=?",
          Date.now(),
          ctx.tenant.id,
          id,
        ).run();
        return json({ ok: true });
      }
      const data = z
          .object({ name: z.string().min(2).max(80) })
          .parse(await body(request)),
        token = "hh_" + randomToken();
      await statement(
        db,
        "INSERT INTO apiKeys(id,tenantId,name,tokenHash,prefix,createdAt) VALUES(?,?,?,?,?,?)",
        uid(),
        ctx.tenant.id,
        data.name,
        await hash(token),
        token.slice(0, 10),
        Date.now(),
      ).run();
      return json({ token });
    }
    if (resource === "billing" && request.method === "POST") {
      if (id === "checkout")
        return json(
          await checkout(
            ctx,
            z
              .object({ plan: z.enum(["STARTER", "BUSINESS"]) })
              .parse(await body(request)).plan,
          ),
        );
      if (id === "portal") return json(await portal(ctx));
      if (id === "change-plan")
        return json(
          await schedulePlan(
            ctx,
            z
              .object({ plan: z.enum(["STARTER", "BUSINESS"]) })
              .parse(await body(request)).plan,
          ),
        );
      if (id === "topup") {
        requireRole(ctx, ["OWNER"]);
        requireWrite(ctx);
        if (!ctx.tenant.stripeCustomerId)
          throw new AppError(409, "Először indíts előfizetést.");
        const data = z
            .object({ size: z.enum(["small", "medium", "large"]) })
            .parse(await body(request)),
          idx = ["small", "medium", "large"].indexOf(data.size),
          price = [
            env.STRIPE_PRICE_CREDITS_SMALL,
            env.STRIPE_PRICE_CREDITS_MEDIUM,
            env.STRIPE_PRICE_CREDITS_LARGE,
          ][idx];
        if (!price)
          throw new AppError(503, "A feltöltési csomag nincs beállítva.");
        const configured = await stripe(env).prices.retrieve(price);
        if (
          configured.currency !== "huf" ||
          configured.unit_amount !== [5000, 10000, 20000][idx] * 100 ||
          configured.recurring
        )
          throw new AppError(503, "A Stripe kreditár beállítása hibás.");
        const s = await stripe(env).checkout.sessions.create({
          mode: "payment",
          customer: ctx.tenant.stripeCustomerId,
          line_items: [{ price, quantity: 1 }],
          allowed_payment_method_types: ["card"],
          metadata: {
            tenantId: ctx.tenant.id,
            kind: "credits",
            credits: String([250, 550, 1200][idx]),
          },
          success_url: env.APP_URL + "/dashboard/ai?checkout=success",
          cancel_url: env.APP_URL + "/dashboard/ai",
        });
        return json({ url: s.url });
      }
    }
    if (
      resource === "billing" &&
      id === "invoices" &&
      request.method === "GET"
    ) {
      requireRole(ctx, ["OWNER"]);
      return json({
        items: await rows(
          db,
          "SELECT id,number,state,createdAt,objectKey IS NOT NULL AS downloadable FROM invoiceRecords WHERE tenantId=? AND jobId IS NULL ORDER BY createdAt DESC LIMIT 100",
          ctx.tenant.id,
        ),
      });
    }
    if (resource === "invoice-files" && id && request.method === "GET") {
      const invoice = await first<{
        jobId: string | null;
        objectKey: string | null;
      }>(
        db,
        "SELECT jobId,objectKey FROM invoiceRecords WHERE tenantId=? AND id=? AND state='issued'",
        ctx.tenant.id,
        id,
      );
      if (!invoice) throw new AppError(404, "A számla nem található.");
      if (invoice.jobId) await getJob(ctx, invoice.jobId);
      else requireRole(ctx, ["OWNER"]);
      if (!invoice.objectKey)
        throw new AppError(409, "A számla PDF-változata még készül.");
      const object = await env.FILES.get(invoice.objectKey);
      if (!object) throw new AppError(404, "A fájl nem található.");
      return new Response(object.body, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": 'inline; filename="szamla.pdf"',
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
          "Content-Security-Policy": "sandbox",
        },
      });
    }
    if (resource === "ai") {
      requireRole(ctx, ["OWNER", "ADMIN", "DISPATCHER"]);
      if (request.method === "GET")
        return json({
          ledger: await rows(
            db,
            "SELECT description,monthlyDelta,purchasedDelta,createdAt FROM creditLedger WHERE tenantId=? ORDER BY createdAt DESC LIMIT 100",
            ctx.tenant.id,
          ),
        });
      if (request.method === "POST") {
        const data = z
          .object({ requestKey: z.uuid() })
          .parse(await body(request));
        requireWrite(ctx);
        return json(
          await reserveAiTask(
            env,
            ctx.tenant.id,
            "SUMMARY",
            {},
            2,
            data.requestKey,
          ),
        );
      }
    }
    if (resource === "tasks" && id && request.method === "POST") {
      requireRole(ctx, ["OWNER"]);
      requireWrite(ctx);
      const task = await first<{ type: string; state: string }>(
        db,
        "SELECT type,state FROM tasks WHERE tenantId=? AND id=?",
        ctx.tenant.id,
        id,
      );
      if (!task || task.type === "AI")
        throw new AppError(409, "AI-műveletet új kérésként indíthatsz.");
      if (task.type === "INVOICE") {
        const original = await first<{ payload: string }>(
            db,
            "SELECT payload FROM tasks WHERE id=? AND tenantId=?",
            id,
            ctx.tenant.id,
          ),
          payload = JSON.parse(original!.payload) as {
            jobId?: string;
            sourceId?: string;
          };
        const record = await first<{ state: string }>(
          db,
          "SELECT state FROM invoiceRecords WHERE tenantId=? AND sourceId=?",
          ctx.tenant.id,
          payload.sourceId || "job:" + payload.jobId,
        );
        if (
          record &&
          ["issuing", "needs_review", "issued"].includes(record.state)
        )
          throw new AppError(
            409,
            "Először ellenőrizd és rögzítsd a számlázás eredményét.",
          );
      }
      await statement(
        db,
        "UPDATE tasks SET state='pending',attempts=0,availableAt=?,lastError=NULL,leaseToken=NULL,leaseUntil=NULL WHERE tenantId=? AND id=? AND state='failed'",
        Date.now(),
        ctx.tenant.id,
        id,
      ).run();
      return json({ ok: true });
    }
    if (resource === "export" && request.method === "GET") {
      requireRole(ctx, ["OWNER", "ADMIN"]);
      const data = {
        company: { name: ctx.tenant.name, slug: ctx.tenant.slug },
        customers: await rows(
          db,
          "SELECT * FROM customers WHERE tenantId=?",
          ctx.tenant.id,
        ),
        jobs: await rows<JobRecord>(
          db,
          "SELECT * FROM jobs WHERE tenantId=?",
          ctx.tenant.id,
        ).then((r) => r.map(safeJob)),
        items: await rows(
          db,
          "SELECT * FROM jobItems WHERE tenantId=?",
          ctx.tenant.id,
        ),
        inquiries: await rows(
          db,
          "SELECT * FROM inquiries WHERE tenantId=?",
          ctx.tenant.id,
        ),
        events: await rows(
          db,
          "SELECT * FROM jobEvents WHERE tenantId=?",
          ctx.tenant.id,
        ),
      };
      return new Response(JSON.stringify(data, null, 2), {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": 'attachment; filename="hogyhalad-export.json"',
          "Cache-Control": "no-store",
        },
      });
    }
    throw new AppError(404, "A végpont nem található.");
  } catch (error) {
    return errorResponse(error);
  }
}
export { handler as GET, handler as POST, handler as PATCH, handler as DELETE };
