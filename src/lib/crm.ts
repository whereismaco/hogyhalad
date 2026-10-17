import { z } from "zod";
import { first, rows, statement, uid } from "./db";
import {
  AppError,
  calculateItem,
  calculateTotal,
  customerSchema,
  itemInputSchema,
  plans,
  tenantSchema,
  templates,
  type Stage,
  type PriceRule,
} from "./domain";
import {
  requireRole,
  requireWrite,
  jobScope,
  type Access,
  type Tenant,
} from "./access";
import { encrypt, hash, randomToken } from "./security";
import { taskStatement, taskAfterEvent } from "./tasks";
import type { Env } from "./env";

export interface JobRecord {
  id: string;
  tenantId: string;
  customerId: string;
  jobCode: string;
  workflowJson: string;
  stageId: string;
  archived: number;
  assignedMemberId: string | null;
  scheduledDate: string | null;
  deliveryDate: string | null;
  routeOrder: number;
  quickCount: number;
  totalAmount: number;
  minimumAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  customerNotes: string;
  internalNotes: string;
  publicMessage: string;
  trackingHash: string | null;
  trackingCipher: string | null;
  version: number;
  createdAt: number;
  updatedAt: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
}
export async function getJob(ctx: Access, id: string) {
  const scope = jobScope(ctx);
  const job = await first<JobRecord>(
    ctx.env.DB,
    "SELECT j.*,c.name AS customerName,c.email AS customerEmail,c.phone AS customerPhone,c.address AS customerAddress FROM jobs j JOIN customers c ON c.tenantId=j.tenantId AND c.id=j.customerId WHERE j.tenantId=? AND j.id=?" +
      scope.sql.replace("assignedMemberId", "j.assignedMemberId"),
    ctx.tenant.id,
    id,
    ...scope.args,
  );
  if (!job) throw new AppError(404, "A munka nem található.");
  return job;
}
export function safeJob(job: JobRecord) {
  const { trackingHash: _hash, trackingCipher: _cipher, ...safe } = job;
  void _hash;
  void _cipher;
  return safe;
}
export async function catalog(
  db: D1Database,
  tenantId: string,
): Promise<PriceRule[]> {
  const values = await rows<
    Omit<PriceRule, "active" | "isExtra"> & { active: number; isExtra: number }
  >(
    db,
    "SELECT * FROM priceRules WHERE tenantId=? ORDER BY isExtra,name",
    tenantId,
  );
  return values.map((r) => ({
    ...r,
    active: !!r.active,
    isExtra: !!r.isExtra,
  }));
}
export async function createTenant(env: Env, userId: string, input: unknown) {
  const data = tenantSchema.parse(input);
  if (
    [
      "admin",
      "www",
      "support",
      "belepes",
      "ertesito",
      "billing",
      "api",
      "noreply",
      "hogyhalad",
    ].includes(data.slug)
  )
    throw new AppError(400, "Ez a céges azonosító foglalt.");
  const id = uid(),
    now = Date.now();
  await env.DB.batch([
    statement(
      env.DB,
      "INSERT INTO tenants(id,ownerId,name,slug,template,email,phone,address,taxNumber,zip,city,workflowJson,periodStart,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      id,
      userId,
      data.name,
      data.slug,
      data.template,
      data.email,
      data.phone,
      data.address,
      data.taxNumber,
      data.zip,
      data.city,
      JSON.stringify(templates[data.template].stages),
      now,
      now,
      now,
    ),
    statement(
      env.DB,
      "INSERT INTO members(id,tenantId,userId,role,createdAt) VALUES(?,?,?,'OWNER',?)",
      uid(),
      id,
      userId,
      now,
    ),
    ...[
      {
        name:
          data.template === "RUG"
            ? "Normál szőnyegtisztítás"
            : "Alapszolgáltatás",
        unit: data.template === "RUG" ? "M2" : "FIXED",
        unitPrice: 0,
        isExtra: 0,
      },
      { name: "Extra kezelés", unit: "FIXED", unitPrice: 0, isExtra: 1 },
    ].map((r) =>
      statement(
        env.DB,
        "INSERT INTO priceRules(id,tenantId,name,unit,unitPrice,isExtra,createdAt) VALUES(?,?,?,?,?,?,?)",
        uid(),
        id,
        r.name,
        r.unit,
        r.unitPrice,
        r.isExtra,
        now,
      ),
    ),
  ]);
  return { id };
}
const jobInput = z
  .object({
    customerId: z.string().optional(),
    customer: customerSchema.optional(),
    quickCount: z.number().int().min(0).max(10000).default(0),
    assignedMemberId: z.string().nullable().default(null),
    scheduledDate: z.iso.date().nullable().default(null),
    deliveryDate: z.iso.date().nullable().default(null),
    customerNotes: z.string().max(4000).default(""),
    internalNotes: z.string().max(4000).default(""),
    requestKey: z.uuid(),
  })
  .refine(
    (d) => !!d.customerId || !!d.customer,
    "Válassz vagy hozz létre ügyfelet.",
  );
export async function createJob(ctx: Access, input: unknown) {
  requireRole(ctx, ["OWNER", "ADMIN", "DISPATCHER"]);
  requireWrite(ctx);
  const data = jobInput.parse(input),
    db = ctx.env.DB;
  const previous = await first<{ id: string }>(
    db,
    "SELECT id FROM jobs WHERE tenantId=? AND requestKey=?",
    ctx.tenant.id,
    data.requestKey,
  );
  if (previous) return previous;
  if (
    data.assignedMemberId &&
    !(await first(
      db,
      "SELECT id FROM members WHERE tenantId=? AND id=? AND active=1",
      ctx.tenant.id,
      data.assignedMemberId,
    ))
  )
    throw new AppError(400, "A munkatárs nem elérhető.");
  const id = uid(),
    now = Date.now(),
    customerId = data.customerId || uid(),
    token = randomToken();
  const stages = JSON.parse(ctx.tenant.workflowJson) as Stage[];
  const inserts: D1PreparedStatement[] = [];
  if (!data.customerId && data.customer)
    inserts.push(
      statement(
        db,
        "INSERT INTO customers(id,tenantId,name,email,phone,address,taxNumber,notes,zip,city,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
        customerId,
        ctx.tenant.id,
        data.customer.name,
        data.customer.email,
        data.customer.phone,
        data.customer.address,
        data.customer.taxNumber,
        data.customer.notes,
        data.customer.zip,
        data.customer.city,
        now,
        now,
      ),
    );
  inserts.push(
    statement(
      db,
      "INSERT INTO jobs(id,tenantId,customerId,jobCode,workflowJson,stageId,assignedMemberId,scheduledDate,deliveryDate,quickCount,minimumAmount,customerNotes,internalNotes,trackingHash,trackingCipher,requestKey,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      id,
      ctx.tenant.id,
      customerId,
      "HH-" + new Date().getUTCFullYear() + "-" + id.slice(0, 8).toUpperCase(),
      ctx.tenant.workflowJson,
      stages[0].id,
      data.assignedMemberId,
      data.scheduledDate,
      data.deliveryDate,
      data.quickCount,
      ctx.tenant.minimumAmount,
      data.customerNotes,
      data.internalNotes,
      await hash(token),
      await encrypt(ctx.env, token),
      data.requestKey,
      now,
      now,
    ),
  );
  inserts.push(
    statement(
      db,
      "INSERT INTO jobEvents(id,tenantId,jobId,memberId,stageId,kind,message,isPublic,createdAt) VALUES(?,?,?,?,?,'CREATED',?,?,?)",
      uid(),
      ctx.tenant.id,
      id,
      ctx.memberId,
      stages[0].id,
      stages[0].name,
      Number(stages[0].public),
      now,
    ),
  );
  inserts.push(
    taskStatement(
      db,
      ctx.tenant.id,
      "JOB_EMAIL",
      { jobId: id, stageId: stages[0].id, publicMessage: "", occurredAt: now },
      "job-created:" + id,
    ),
  );
  await db.batch(inserts);
  return { id };
}
export async function jobDetail(ctx: Access, id: string) {
  const job = await getJob(ctx, id);
  return {
    ...safeJob(job),
    items: await rows(
      ctx.env.DB,
      "SELECT i.*,COALESCE((SELECT json_group_array(json_object('name',e.name,'amount',e.amount)) FROM itemExtras e WHERE e.tenantId=i.tenantId AND e.itemId=i.id),'[]') AS extrasJson FROM jobItems i WHERE tenantId=? AND jobId=? ORDER BY createdAt",
      ctx.tenant.id,
      id,
    ),
    events: await rows(
      ctx.env.DB,
      "SELECT id,stageId,kind,message,isPublic,internalReason,createdAt FROM jobEvents WHERE tenantId=? AND jobId=? ORDER BY createdAt",
      ctx.tenant.id,
      id,
    ),
    files: await rows(
      ctx.env.DB,
      "SELECT id,kind,filename,isPublic,createdAt FROM files WHERE tenantId=? AND jobId=? ORDER BY createdAt DESC",
      ctx.tenant.id,
      id,
    ),
  };
}
export async function addItem(ctx: Access, id: string, input: unknown) {
  requireRole(ctx, ["OWNER", "ADMIN", "DISPATCHER"]);
  requireWrite(ctx);
  const data = itemInputSchema
      .extend({ version: z.number().int() })
      .parse(input),
    job = await getJob(ctx, id);
  const item = calculateItem(data, await catalog(ctx.env.DB, ctx.tenant.id)),
    itemId = uid(),
    now = Date.now(),
    db = ctx.env.DB;
  const batch = await db.batch([
    statement(
      db,
      "UPDATE jobs SET version=version+1,updatedAt=? WHERE tenantId=? AND id=? AND version=?",
      now,
      ctx.tenant.id,
      id,
      data.version,
    ),
    statement(
      db,
      "INSERT INTO jobItems(id,tenantId,jobId,name,unit,quantity,width,length,unitPrice,total,createdAt) SELECT ?,?,?,?,?,?,?,?,?,?,? WHERE changes()=1",
      itemId,
      ctx.tenant.id,
      id,
      item.name,
      item.unit,
      item.quantity,
      item.width,
      item.length,
      item.unitPrice,
      item.total,
      now,
    ),
    ...item.extras.map((e) =>
      statement(
        db,
        "INSERT INTO itemExtras(id,tenantId,itemId,name,amount) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM jobItems WHERE id=? AND tenantId=?)",
        uid(),
        ctx.tenant.id,
        itemId,
        e.name,
        e.amount,
        itemId,
        ctx.tenant.id,
      ),
    ),
    statement(
      db,
      "UPDATE jobs SET totalAmount=MAX(minimumAmount,COALESCE((SELECT SUM(total) FROM jobItems WHERE tenantId=? AND jobId=?),0)) WHERE tenantId=? AND id=? AND EXISTS(SELECT 1 FROM jobItems WHERE id=?)",
      ctx.tenant.id,
      id,
      ctx.tenant.id,
      id,
      itemId,
    ),
  ]);
  if (!batch[0].meta.changes)
    throw new AppError(
      409,
      "A munka közben megváltozott. Frissítsd az adatokat.",
    );
  void job;
  return { id: itemId };
}
export async function updateJob(ctx: Access, id: string, input: unknown) {
  requireWrite(ctx);
  const data = z
    .object({
      version: z.number().int(),
      stageId: z.string().optional(),
      archived: z.boolean().optional(),
      reason: z.string().max(1000).default(""),
      assignedMemberId: z.string().nullable().optional(),
      scheduledDate: z.iso.date().nullable().optional(),
      deliveryDate: z.iso.date().nullable().optional(),
      routeOrder: z.number().int().min(0).max(10000).optional(),
      paymentMethod: z.enum(["CASH", "CARD_POS", "TRANSFER"]).optional(),
      paymentStatus: z.enum(["PENDING", "PAID"]).optional(),
      publicMessage: z.string().max(2000).optional(),
      customerNotes: z.string().max(4000).optional(),
      internalNotes: z.string().max(4000).optional(),
    })
    .parse(input);
  const job = await getJob(ctx, id),
    stages = JSON.parse(job.workflowJson) as Stage[];
  const oldIndex = stages.findIndex((s) => s.id === job.stageId),
    newIndex = data.stageId
      ? stages.findIndex((s) => s.id === data.stageId)
      : oldIndex;
  if (newIndex < 0) throw new AppError(400, "Érvénytelen lépés.");
  if (
    newIndex < oldIndex &&
    (!["OWNER", "ADMIN"].includes(ctx.role) || !data.reason)
  )
    throw new AppError(
      403,
      "Visszaléptetéshez adminisztrátori jogosultság és indoklás szükséges.",
    );
  if (!["OWNER", "ADMIN", "DISPATCHER"].includes(ctx.role)) {
    if (
      Object.keys(data).some(
        (k) => !["version", "stageId", "reason"].includes(k),
      )
    )
      throw new AppError(403, "Csak a munkafolyamat léptethető.");
    if (newIndex !== oldIndex + 1)
      throw new AppError(400, "Csak a következő lépésre léphetsz.");
  }
  if (
    data.assignedMemberId &&
    !(await first(
      ctx.env.DB,
      "SELECT id FROM members WHERE tenantId=? AND id=? AND active=1",
      ctx.tenant.id,
      data.assignedMemberId,
    ))
  )
    throw new AppError(400, "Nem elérhető munkatárs.");
  const fields = [
    "stageId",
    "archived",
    "assignedMemberId",
    "scheduledDate",
    "deliveryDate",
    "routeOrder",
    "paymentMethod",
    "paymentStatus",
    "publicMessage",
    "customerNotes",
    "internalNotes",
  ] as const;
  const keys = fields.filter((k) => data[k] !== undefined);
  if (!keys.length) return { id };
  const now = Date.now(),
    eventId = uid(),
    db = ctx.env.DB,
    changedStage = !!data.stageId && data.stageId !== job.stageId;
  const result = await db.batch([
    statement(
      db,
      "UPDATE jobs SET " +
        keys.map((k) => k + "=?").join(",") +
        ",version=version+1,updatedAt=? WHERE tenantId=? AND id=? AND version=?",
      ...keys.map((k) =>
        typeof data[k] === "boolean" ? Number(data[k]) : data[k],
      ),
      now,
      ctx.tenant.id,
      id,
      data.version,
    ),
    statement(
      db,
      "INSERT INTO jobEvents(id,tenantId,jobId,memberId,stageId,kind,message,isPublic,createdAt,internalReason) SELECT ?,?,?,?,?,?,?,?,?,? WHERE changes()=1",
      eventId,
      ctx.tenant.id,
      id,
      ctx.memberId,
      data.stageId ?? job.stageId,
      changedStage ? "STATUS" : "UPDATED",
      changedStage ? stages[newIndex].name : "Munkalap módosítva",
      Number(changedStage && stages[newIndex].public),
      now,
      data.reason,
    ),
    ...(changedStage
      ? [
          taskAfterEvent(
            db,
            ctx.tenant.id,
            "JOB_EMAIL",
            {
              jobId: id,
              stageId: data.stageId,
              publicMessage: data.publicMessage ?? job.publicMessage,
              occurredAt: now,
            },
            "status:" + eventId,
            eventId,
          ),
        ]
      : []),
    ...(changedStage &&
    stages[newIndex].kind === "CLOSED" &&
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
      "A munka közben megváltozott. Frissítsd az adatokat.",
    );
  return { id };
}
export async function publicTracking(
  env: Env,
  token: string,
  tenantId?: string,
) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token))
    throw new AppError(404, "A követés nem található.");
  const job = await first<
    JobRecord & { tenantName: string; tenantPhone: string; reviewUrl: string }
  >(
    env.DB,
    "SELECT j.id,j.tenantId,j.jobCode,j.workflowJson,j.stageId,j.publicMessage,j.totalAmount,j.paymentStatus,j.quickCount,j.updatedAt,t.name AS tenantName,t.phone AS tenantPhone,t.googleReviewUrl AS reviewUrl FROM jobs j JOIN tenants t ON t.id=j.tenantId WHERE j.trackingHash=?" +
      (tenantId ? " AND j.tenantId=?" : ""),
    await hash(token),
    ...(tenantId ? [tenantId] : []),
  );
  if (!job) throw new AppError(404, "A követés nem található.");
  const workflow = JSON.parse(job.workflowJson) as Stage[];
  const publicStages = workflow.filter((s) => s.public);
  const currentIndex = workflow.findIndex((s) => s.id === job.stageId);
  const current = workflow
    .slice(0, currentIndex + 1)
    .filter((s) => s.public)
    .at(-1);
  const items = await rows(
    env.DB,
    "SELECT name,unit,quantity,width,length,total FROM jobItems WHERE tenantId=? AND jobId=? ORDER BY createdAt",
    job.tenantId,
    job.id,
  );
  const events = await rows(
    env.DB,
    "SELECT stageId,message,createdAt FROM jobEvents WHERE tenantId=? AND jobId=? AND isPublic=1 ORDER BY createdAt",
    job.tenantId,
    job.id,
  );
  const photos = await rows<{ id: string; filename: string }>(
    env.DB,
    "SELECT id,filename FROM files WHERE tenantId=? AND jobId=? AND kind='PHOTO' AND isPublic=1",
    job.tenantId,
    job.id,
  );
  return {
    jobCode: job.jobCode,
    company: { name: job.tenantName, phone: job.tenantPhone },
    stages: publicStages,
    currentStageId: current?.id ?? null,
    message: job.publicMessage,
    totalAmount: job.totalAmount,
    paymentStatus: job.paymentStatus,
    quickCount: job.quickCount,
    updatedAt: job.updatedAt,
    items,
    events,
    photos: photos.map((f) => ({
      id: f.id,
      filename: f.filename,
      url: "/api/public/files/" + f.id + "?token=" + encodeURIComponent(token),
    })),
    reviewUrl: workflow[currentIndex]?.kind === "CLOSED" ? job.reviewUrl : null,
  };
}
export type Tracking = Awaited<ReturnType<typeof publicTracking>>;
export async function usage(db: D1Database, tenant: Tenant) {
  const [job, inquiry, seats] = await Promise.all([
    first<{ count: number }>(
      db,
      "SELECT count(*) AS count FROM jobs WHERE tenantId=? AND createdAt>=?",
      tenant.id,
      tenant.periodStart,
    ),
    first<{ count: number }>(
      db,
      "SELECT count(*) AS count FROM inquiries WHERE tenantId=? AND createdAt>=?",
      tenant.id,
      tenant.periodStart,
    ),
    first<{ count: number }>(
      db,
      "SELECT count(*) AS count FROM members WHERE tenantId=? AND active=1",
      tenant.id,
    ),
  ]);
  return {
    jobs: job?.count ?? 0,
    inquiries: inquiry?.count ?? 0,
    seats: seats?.count ?? 0,
    limits: plans[tenant.plan],
  };
}
export { calculateTotal };
