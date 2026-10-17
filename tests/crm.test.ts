import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { testDatabase } from "./database";
import {
  createTenant,
  createJob,
  getJob,
  publicTracking,
  addItem,
  updateJob,
} from "../src/lib/crm";
import {
  plans,
  calculateItem,
  calculateTotal,
  canWrite,
  workflowSchema,
  templates,
} from "../src/lib/domain";
import { reserveAiTask, refundAi } from "../src/lib/ai";
import { encrypt, decrypt, hash, randomToken } from "../src/lib/security";
import { first, rows, statement } from "../src/lib/db";
import type { Access, Tenant } from "../src/lib/access";
import type { Env } from "../src/lib/env";
import { createAuth } from "../src/lib/auth";
import { generatePdf } from "../src/lib/integrations/pdf";
import {
  issueInvoice,
  downloadInvoice,
  UncertainInvoiceError,
} from "../src/lib/integrations/invoice";
import { processTask } from "../workers/background";
import { processStripe } from "../src/lib/billing";
import { enqueue } from "../src/lib/tasks";
import { PDFDocument, PDFPage } from "pdf-lib";
import { XMLParser } from "fast-xml-parser";
import { readFileSync } from "node:fs";
import type Stripe from "stripe";
let database: ReturnType<typeof testDatabase>, env: Env, a: Access, b: Access;
async function context(userId: string, slug: string): Promise<Access> {
  const now = Date.now();
  await statement(
    env.DB,
    "INSERT INTO user(id,name,email,emailVerified,createdAt,updatedAt) VALUES(?,?,?,1,?,?)",
    userId,
    userId,
    userId + "@example.com",
    now,
    now,
  ).run();
  const { id } = await createTenant(env, userId, {
    name: slug,
    slug,
    email: userId + "@example.com",
    phone: "+36301112222",
    address: "Fő utca 1.",
    zip: "1111",
    city: "Budapest",
    taxNumber: "",
    template: "RUG",
  });
  await statement(
    env.DB,
    "UPDATE tenants SET state='active',plan='BUSINESS',monthlyCredits=10,purchasedCredits=5 WHERE id=?",
    id,
  ).run();
  const tenant = (await first<Tenant>(
    env.DB,
    "SELECT * FROM tenants WHERE id=?",
    id,
  ))!;
  const member = (await first<{ id: string }>(
    env.DB,
    "SELECT id FROM members WHERE tenantId=?",
    id,
  ))!;
  return {
    env,
    tenant,
    memberId: member.id,
    role: "OWNER",
    user: { id: userId, name: userId, email: userId + "@example.com" },
  };
}
async function job(ctx: Access, requestKey = crypto.randomUUID()) {
  return createJob(ctx, {
    customer: {
      name: "Teszt Ügyfél",
      email: "ugyfel@example.com",
      phone: "+36302223333",
      address: "Másik utca 2.",
      zip: "1112",
      city: "Budapest",
    },
    requestKey,
  });
}
beforeEach(async () => {
  database = testDatabase();
  env = {
    DB: database.db,
    APP_URL: "http://localhost:3000",
    EMAIL_DOMAIN: "hogyhalad.hu",
    AUTH_FROM: "HogyHalad <belepes@hogyhalad.hu>",
    ENVIRONMENT: "development",
    BETTER_AUTH_SECRET: "test-secret-long-enough-for-authentication-0123456789",
    DATA_ENCRYPTION_KEY: btoa("01234567890123456789012345678901"),
    OPENAI_API_KEY: "test-only-not-a-real-key",
    RESEND_API_KEY: "test-only-not-a-real-key",
  } as Env;
  a = await context("user-a", "ceg-a");
  b = await context("user-b", "ceg-b");
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  database.close();
});
describe("Céges adatvédelem", () => {
  it("másik cég munkája azonosítóval sem olvasható", async () => {
    const value = await job(a);
    await expect(getJob(b, value.id)).rejects.toMatchObject({ status: 404 });
  });
  it("adatbázisszinten tiltja az idegen ügyfelet és munkatársat", async () => {
    const value = await job(a),
      record = await getJob(a, value.id);
    await expect(
      createJob(b, {
        customerId: record.customerId,
        requestKey: crypto.randomUUID(),
      }),
    ).rejects.toThrow(/FOREIGN KEY/);
    await expect(
      createJob(b, {
        customer: { name: "Teszt", phone: "1234567" },
        assignedMemberId: a.memberId,
        requestKey: crypto.randomUUID(),
      }),
    ).rejects.toMatchObject({ status: 400 });
  });
  it("nyilvános követésben nincs belső adat és rossz tokenre nincs fallback", async () => {
    const value = await job(a),
      record = await getJob(a, value.id),
      token = await decrypt(env, record.trackingCipher!);
    await statement(
      env.DB,
      "UPDATE jobs SET internalNotes='TITKOS BELSŐ ADAT' WHERE id=?",
      value.id,
    ).run();
    await updateJob(a, value.id, { version: 1, stageId: "received" });
    await updateJob(a, value.id, {
      version: 2,
      stageId: "new",
      reason: "TITKOS VISSZALÉPÉSI INDOK",
    });
    const dto = await publicTracking(env, token);
    expect(JSON.stringify(dto)).not.toContain("TITKOS");
    expect(dto).not.toHaveProperty("tenantId");
    expect(dto).not.toHaveProperty("customerEmail");
    await expect(publicTracking(env, "hibas")).rejects.toMatchObject({
      status: 404,
    });
    await expect(publicTracking(env, randomToken())).rejects.toMatchObject({
      status: 404,
    });
    await expect(publicTracking(env, token, b.tenant.id)).rejects.toMatchObject(
      { status: 404 },
    );
    await statement(
      env.DB,
      "UPDATE jobs SET trackingHash=NULL WHERE id=?",
      value.id,
    ).run();
    await expect(publicTracking(env, token)).rejects.toMatchObject({
      status: 404,
    });
  });
  it("a sofőr csak a neki rendelt munkát kapja", async () => {
    const value = await job(a);
    await expect(
      getJob({ ...a, role: "DRIVER", memberId: "masik" }, value.id),
    ).rejects.toMatchObject({ status: 404 });
  });
});
describe("Párhuzamosság, kvóták és munkalapok", () => {
  it("ugyanaz a kérés csak egy munkát és egy ügyfelet hoz létre", async () => {
    const requestKey = crypto.randomUUID(),
      value = await job(a, requestKey),
      again = await job(a, requestKey);
    expect(again.id).toBe(value.id);
    expect(
      (
        await first<{ n: number }>(
          env.DB,
          "SELECT count(*) AS n FROM customers WHERE tenantId=?",
          a.tenant.id,
        )
      )?.n,
    ).toBe(1);
  });
  it("kvótahibánál az ügyfél létrehozását is visszagörgeti", async () => {
    await statement(
      env.DB,
      "UPDATE tenants SET plan='STARTER' WHERE id=?",
      a.tenant.id,
    ).run();
    const value = await job(a),
      record = await getJob(a, value.id);
    database.sqlite.exec("DROP TRIGGER job_quota;");
    database.sqlite.exec(
      "CREATE TRIGGER job_quota BEFORE INSERT ON jobs BEGIN SELECT CASE WHEN (SELECT count(*) FROM jobs WHERE tenantId=NEW.tenantId)>=1 THEN RAISE(ABORT,'QUOTA_JOBS') END; END;",
    );
    await expect(job(a)).rejects.toThrow(/QUOTA_JOBS/);
    expect(
      (
        await first<{ n: number }>(
          env.DB,
          "SELECT count(*) AS n FROM customers WHERE tenantId=?",
          a.tenant.id,
        )
      )?.n,
    ).toBe(1);
    expect(record.customerId).toBeTruthy();
  });
  it("a munkafolyamat és az ár snapshot marad, elavult módosítás nem ír felül", async () => {
    const value = await job(a),
      record = await getJob(a, value.id);
    await statement(
      env.DB,
      "UPDATE tenants SET workflowJson=? WHERE id=?",
      JSON.stringify(templates.CAR.stages),
      a.tenant.id,
    ).run();
    expect((await getJob(a, value.id)).workflowJson).toBe(record.workflowJson);
    await statement(
      env.DB,
      "UPDATE priceRules SET unitPrice=2400 WHERE tenantId=? AND isExtra=0",
      a.tenant.id,
    ).run();
    const rule = await first<{ id: string }>(
      env.DB,
      "SELECT id FROM priceRules WHERE tenantId=? AND isExtra=0",
      a.tenant.id,
    );
    await addItem(a, value.id, {
      version: 1,
      ruleId: rule!.id,
      width: 2,
      length: 3,
      quantity: 1,
      extras: [],
    });
    expect((await getJob(a, value.id)).totalAmount).toBe(14400);
    await expect(
      updateJob(a, value.id, { version: 1, stageId: "received" }),
    ).rejects.toMatchObject({ status: 409 });
    expect(
      (await rows(env.DB, "SELECT * FROM jobEvents WHERE jobId=?", value.id))
        .length,
    ).toBe(1);
  });
  it("előfizetés nélkül a módosítás tiltott", async () => {
    await expect(
      job({ ...a, tenant: { ...a.tenant, state: "canceled" } }),
    ).rejects.toMatchObject({ status: 402 });
  });
  it("Starterben nem hozható létre második felhasználó", async () => {
    await statement(
      env.DB,
      "UPDATE tenants SET plan='STARTER' WHERE id=?",
      a.tenant.id,
    ).run();
    await expect(
      statement(
        env.DB,
        "INSERT INTO members(id,tenantId,userId,role,createdAt) VALUES(?,?,?,'WORKER',?)",
        crypto.randomUUID(),
        a.tenant.id,
        b.user.id,
        Date.now(),
      ).run(),
    ).rejects.toThrow(/SEAT_LIMIT/);
  });
});
describe("Számítás és AI-kreditek", () => {
  it("egységes kerekítést és minimumdíjat használ", () => {
    const rule = {
      id: "rug",
      name: "Szőnyeg",
      unit: "M2" as const,
      unitPrice: 2400,
      isExtra: false,
      active: true,
    };
    expect(
      calculateItem(
        { ruleId: "rug", quantity: 1, width: 1.6, length: 2.3, extras: [] },
        [rule],
      ).total,
    ).toBe(8832);
    expect(calculateTotal([8832], 12000)).toBe(12000);
    expect(calculateTotal([], 12000)).toBe(0);
  });
  it("negatív vagy idegen árlistatétel elutasítva", () => {
    expect(() =>
      calculateItem({ ruleId: "foreign", quantity: 1, extras: [] }, []),
    ).toThrow();
  });
  it("egy kérésre egyszer foglal és egyszer térít vissza kreditet", async () => {
    const key = crypto.randomUUID(),
      task = await reserveAiTask(env, a.tenant.id, "SUMMARY", {}, 2, key);
    await reserveAiTask(env, a.tenant.id, "SUMMARY", {}, 2, key);
    expect(
      (
        await first<Tenant>(
          env.DB,
          "SELECT * FROM tenants WHERE id=?",
          a.tenant.id,
        )
      )?.monthlyCredits,
    ).toBe(8);
    await refundAi(env, task.id);
    await refundAi(env, task.id);
    expect(
      (
        await first<Tenant>(
          env.DB,
          "SELECT * FROM tenants WHERE id=?",
          a.tenant.id,
        )
      )?.monthlyCredits,
    ).toBe(10);
  });
  it("kreditkeret nem mehet negatívba", async () => {
    await statement(
      env.DB,
      "UPDATE tenants SET monthlyCredits=1,purchasedCredits=0 WHERE id=?",
      a.tenant.id,
    ).run();
    await expect(
      reserveAiTask(env, a.tenant.id, "SUMMARY", {}, 2, crypto.randomUUID()),
    ).rejects.toMatchObject({ status: 402 });
    expect(
      (
        await first<{ n: number }>(
          env.DB,
          "SELECT count(*) AS n FROM tasks WHERE type='AI'",
        )
      )?.n,
    ).toBe(0);
  });
  it("titkosítás visszafejthető, más kulccsal nem", async () => {
    const ciphertext = await encrypt(env, "titok");
    expect(ciphertext).not.toContain("titok");
    expect(await decrypt(env, ciphertext)).toBe("titok");
    await expect(
      decrypt(
        {
          ...env,
          DATA_ENCRYPTION_KEY: btoa("abcdefghijklmnopqrstuvwxyz012345"),
        },
        ciphertext,
      ),
    ).rejects.toThrow();
    expect(await hash("x")).toHaveLength(64);
  });
  it("türelmi idő pontosan három nap", () => {
    expect(canWrite("past_due", 1000, 1000 + 3 * 86400000 - 1)).toBe(true);
    expect(canWrite("past_due", 1000, 1000 + 3 * 86400000)).toBe(false);
  });
  it("munkafolyamat első és utolsó szerepe kötött", () => {
    expect(workflowSchema.safeParse(templates.RUG.stages).success).toBe(true);
    expect(
      workflowSchema.safeParse([...templates.RUG.stages].reverse()).success,
    ).toBe(false);
    expect(plans.STARTER.price).toBe(29990);
  });
});
describe("Valódi Better Auth magic link és munkamenet", () => {
  describe("Dokumentumok és háttérfeladatok", () => {
    it("valódi, magyar betűkészletű PDF készül és újrapróbáláskor nem duplázódik", async () => {
      const value = await job(a),
        objects = new Map<string, Uint8Array>();
      const files = {
        put: async (key: string, data: Uint8Array) => {
          objects.set(key, data);
        },
        get: async (key: string) => {
          const data = objects.get(key);
          return data
            ? { arrayBuffer: async () => new Uint8Array(data).buffer }
            : null;
        },
      } as unknown as R2Bucket;
      const font = readFileSync("public/fonts/NotoSans-Regular.ttf");
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => new Response(new Uint8Array(font).buffer)),
      );
      const target = { ...env, FILES: files },
        taskId = crypto.randomUUID();
      const rule = await first<{ id: string }>(
        env.DB,
        "SELECT id FROM priceRules WHERE tenantId=? AND isExtra=0 LIMIT 1",
        a.tenant.id,
      );
      await addItem(a, value.id, {
        version: 1,
        ruleId: rule!.id,
        width: 2,
        length: 3,
        quantity: 1,
        extras: [],
      });
      const firstPdf = await generatePdf(
        target,
        a.tenant.id,
        value.id,
        undefined,
        true,
        taskId,
      );
      const second = await generatePdf(
        target,
        a.tenant.id,
        value.id,
        undefined,
        true,
        taskId,
      );
      expect(second.fileId).toBe(firstPdf.fileId);
      expect(objects.size).toBe(1);
      const bytes = [...objects.values()][0],
        doc = await PDFDocument.load(bytes);
      expect(doc.getPageCount()).toBeGreaterThanOrEqual(1);
      expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
      const signatureId = crypto.randomUUID(),
        handoverId = crypto.randomUUID();
      const signature = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jGqkAAAAASUVORK5CYII=",
        "base64",
      );
      objects.set("signature.png", signature);
      await statement(
        env.DB,
        "INSERT INTO files(id,tenantId,jobId,kind,objectKey,filename,mime,size,createdAt) VALUES(?,?,?,'SIGNATURE','signature.png','signature.png','image/png',?,?)",
        signatureId,
        a.tenant.id,
        value.id,
        signature.length,
        Date.now(),
      ).run();
      const signedJob = await getJob(a, value.id);
      await statement(
        env.DB,
        "INSERT INTO handovers(id,tenantId,jobId,memberId,kind,signatureFileId,snapshotJson,createdAt) VALUES(?,?,?,?,'PICKUP',?,?,?)",
        handoverId,
        a.tenant.id,
        value.id,
        a.memberId,
        signatureId,
        JSON.stringify({
          companyName: "Aláíráskori cég",
          job: signedJob,
          items: [
            {
              id: "signed-item",
              name: "Aláíráskori tétel",
              quantity: 1,
              unit: "DB",
              total: signedJob.totalAmount,
            },
          ],
        }),
        Date.now(),
      ).run();
      await statement(
        env.DB,
        "UPDATE customers SET name='Későbbi ügyfélnév' WHERE tenantId=? AND id=?",
        a.tenant.id,
        signedJob.customerId,
      ).run();
      const draw = vi.spyOn(PDFPage.prototype, "drawText");
      const receipt = await generatePdf(
        target,
        a.tenant.id,
        value.id,
        handoverId,
        false,
        crypto.randomUUID(),
      );
      const drawn = draw.mock.calls.map(([text]) => text).join("\n");
      expect(drawn).toContain("Aláíráskori cég");
      expect(drawn).toContain("Teszt Ügyfél");
      expect(drawn).toContain("Aláíráskori tétel");
      expect(drawn).not.toContain("Későbbi ügyfélnév");
      const receiptFile = await first<{ objectKey: string }>(
        env.DB,
        "SELECT objectKey FROM files WHERE id=?",
        receipt.fileId,
      );
      expect(
        (
          await PDFDocument.load(objects.get(receiptFile!.objectKey)!)
        ).getPageCount(),
      ).toBeGreaterThanOrEqual(1);
    });
    it("a Számlázz.hu kérés helyes beállításokkal és külső azonosítóval készül", async () => {
      let captured = "";
      vi.stubGlobal(
        "fetch",
        vi.fn(async (_url: string, init: RequestInit) => {
          captured = await (
            (init.body as FormData).get("action-xmlagentxmlfile") as File
          ).text();
          return new Response("%PDF-1.7\n", {
            headers: { szlahu_szamlaszam: "TEST%2F2026-1" },
          });
        }),
      );
      const result = await issueInvoice(env, {
        sourceId: "source-1",
        name: "Őrzött Ügyfél",
        email: "test@example.com",
        address: "Fő utca 1.",
        zip: "1111",
        city: "Budapest",
        taxNumber: "",
        amount: 29990,
        description: "Szolgáltatás",
        paid: true,
        taxMode: "AAM",
        provider: "SZAMLAZZ",
        apiKey: "test-only",
        blockId: "",
      });
      expect(result.number).toBe("TEST/2026-1");
      const xml = new XMLParser().parse(captured);
      expect(xml.xmlszamla.beallitasok.szamlaKulsoAzon).toBe("source-1");
      expect(xml.xmlszamla.beallitasok.valaszVerzio).toBe(1);
      expect(xml.xmlszamla.fejlec).not.toHaveProperty("szamlaKulsoAzon");
      expect(xml.xmlszamla.tetelek.tetel.bruttoErtek).toBe(29990);
    });
    it("bizonytalan számlázási válasz külön ellenőrzést igényel", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => {
          throw new Error("network");
        }),
      );
      await expect(
        issueInvoice(env, {
          sourceId: "source-2",
          name: "Ügyfél",
          email: "test@example.com",
          address: "Fő utca",
          zip: "1111",
          city: "Budapest",
          taxNumber: "",
          amount: 1000,
          description: "Teszt",
          paid: true,
          taxMode: "AAM",
          provider: "SZAMLAZZ",
          apiKey: "test-only",
          blockId: "",
        }),
      ).rejects.toBeInstanceOf(UncertainInvoiceError);
    });
    it("Billingo még nem generált PDF-je új letöltést kér, nem új számlát", async () => {
      const fetcher = vi.fn(async (_input: string | Request) => {
        void _input;
        return new Response("{}", { status: 202 });
      });
      vi.stubGlobal("fetch", fetcher);
      await expect(
        downloadInvoice("BILLINGO", "test-only", "42"),
      ).rejects.toThrow("INVOICE_PDF_NOT_READY");
      expect(String(fetcher.mock.calls[0]?.[0] || "")).toContain(
        "/42/download",
      );
    });
    it("hiányzó AI-konfigurációnál a háttérfeladat hibás és pontosan egyszer térít vissza", async () => {
      const task = await reserveAiTask(
        env,
        a.tenant.id,
        "SUMMARY",
        {},
        2,
        crypto.randomUUID(),
      );
      await processTask({ ...env, OPENAI_API_KEY: undefined }, task.id);
      await processTask({ ...env, OPENAI_API_KEY: undefined }, task.id);
      expect(
        (
          await first<{ state: string }>(
            env.DB,
            "SELECT state FROM tasks WHERE id=?",
            task.id,
          )
        )?.state,
      ).toBe("failed");
      expect(
        (
          await first<Tenant>(
            env.DB,
            "SELECT * FROM tenants WHERE id=?",
            a.tenant.id,
          )
        )?.monthlyCredits,
      ).toBe(10);
    });
    it("a lease megakadályozza a már feldolgozott levél újbóli küldését", async () => {
      const fetcher = vi.fn(async () => Response.json({ id: "delivery-1" }));
      vi.stubGlobal("fetch", fetcher);
      const task = await enqueue(
        env.DB,
        a.tenant.id,
        "EMAIL",
        { to: "test@example.com", subject: "Teszt", text: "Teszt" },
        "mail-test",
      );
      await processTask(env, task!.id);
      await processTask(env, task!.id);
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(
        (
          await first<{ state: string }>(
            env.DB,
            "SELECT state FROM tasks WHERE id=?",
            task!.id,
          )
        )?.state,
      ).toBe("done");
    });
  });
  describe("Stripe események és ismétlések", () => {
    const makeEvent = (
      type: string,
      object: unknown,
      id = crypto.randomUUID(),
    ) => ({ id, type, data: { object } }) as unknown as Stripe.Event;
    it("a kreditfeltöltés és visszatérítés eseményei csak egyszer módosítanak", async () => {
      const target = {
        ...env,
        STRIPE_SECRET_KEY: "sk_test_fake_local",
        STRIPE_PRICE_CREDITS_SMALL: "price_small",
      };
      await statement(
        env.DB,
        "UPDATE tenants SET stripeCustomerId='cus_a' WHERE id=?",
        a.tenant.id,
      ).run();
      const session = {
        id: "cs_one",
        metadata: { tenantId: a.tenant.id, kind: "credits", credits: "250" },
        payment_status: "paid",
        currency: "huf",
        amount_total: 500000,
        customer: "cus_a",
      };
      vi.stubGlobal(
        "fetch",
        vi.fn(async (input: string | Request) => {
          const url = typeof input === "string" ? input : input.url;
          return Response.json(
            url.includes("line_items")
              ? {
                  object: "list",
                  data: [{ price: { id: "price_small" } }],
                  has_more: false,
                }
              : { object: "list", data: [session], has_more: false },
          );
        }),
      );
      const event = makeEvent("checkout.session.completed", session);
      await processStripe(target, event);
      await processStripe(target, event);
      expect(
        (
          await first<Tenant>(
            env.DB,
            "SELECT * FROM tenants WHERE id=?",
            a.tenant.id,
          )
        )?.purchasedCredits,
      ).toBe(255);
      await statement(
        env.DB,
        "UPDATE tenants SET purchasedCredits=0 WHERE id=?",
        a.tenant.id,
      ).run();
      const refunded = makeEvent("charge.refunded", {
        id: "ch_one",
        payment_intent: "pi_one",
        amount: 500000,
        refunds: {
          data: [{ id: "re_one", status: "succeeded", amount: 500000 }],
        },
      });
      await processStripe(target, refunded);
      await processStripe(target, refunded);
      expect(
        (
          await first<Tenant>(
            env.DB,
            "SELECT * FROM tenants WHERE id=?",
            a.tenant.id,
          )
        )?.creditDebt,
      ).toBe(250);
      await expect(
        reserveAiTask(env, a.tenant.id, "SUMMARY", {}, 2, crypto.randomUUID()),
      ).rejects.toMatchObject({ status: 402 });
    });
    it("azonos ciklus második fizetési eseménye nem tölti újra az elköltött keretet", async () => {
      const start = Math.floor(Date.now() / 1000),
        target = {
          ...env,
          STRIPE_SECRET_KEY: "sk_test_fake_local",
          STRIPE_PRICE_STARTER: "price_starter",
          STRIPE_PRICE_BUSINESS: "price_business",
        };
      await statement(
        env.DB,
        "UPDATE tenants SET stripeCustomerId='cus_a',stripeSubscriptionId='sub_a' WHERE id=?",
        a.tenant.id,
      ).run();
      const sub = {
        id: "sub_a",
        status: "active",
        items: {
          data: [
            {
              price: { id: "price_business" },
              current_period_start: start,
              current_period_end: start + 2592000,
            },
          ],
        },
      };
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => Response.json(sub)),
      );
      const invoice = {
        id: "in_one",
        customer: "cus_a",
        amount_paid: 4999000,
        billing_reason: "subscription_cycle",
        parent: { subscription_details: { subscription: "sub_a" } },
        lines: { data: [{ period: { start } }] },
      };
      await processStripe(target, makeEvent("invoice.paid", invoice));
      expect(
        (
          await first<Tenant>(
            env.DB,
            "SELECT * FROM tenants WHERE id=?",
            a.tenant.id,
          )
        )?.monthlyCredits,
      ).toBe(100);
      await statement(
        env.DB,
        "UPDATE tenants SET monthlyCredits=96 WHERE id=?",
        a.tenant.id,
      ).run();
      await processStripe(
        target,
        makeEvent("invoice.paid", { ...invoice, id: "in_second" }),
      );
      expect(
        (
          await first<Tenant>(
            env.DB,
            "SELECT * FROM tenants WHERE id=?",
            a.tenant.id,
          )
        )?.monthlyCredits,
      ).toBe(96);
      await processStripe(
        target,
        makeEvent("invoice.paid", {
          ...invoice,
          id: "in_old",
          lines: { data: [{ period: { start: start - 2592000 } }] },
        }),
      );
      expect(
        (
          await first<Tenant>(
            env.DB,
            "SELECT * FROM tenants WHERE id=?",
            a.tenant.id,
          )
        )?.monthlyCredits,
      ).toBe(96);
    });
  });

  it("e-mailes belépés, egyszeri beváltás és lejárat", async () => {
    let url = "";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: RequestInit) => {
        const body = JSON.parse(String(init.body)) as { html: string };
        url = body.html.match(/href="([^"]+)"/)![1].replaceAll("&amp;", "&");
        return Response.json({ id: "email-id" });
      }),
    );
    const auth = createAuth(env);
    const requested = await auth.handler(
      new Request(env.APP_URL + "/api/auth/sign-in/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: env.APP_URL },
        body: JSON.stringify({
          email: "new@example.com",
          name: "Új Teszt",
          callbackURL: "/dashboard",
        }),
      }),
    );
    expect(requested.status).toBe(200);
    expect(url).toContain("token=");
    const response = await auth.handler(new Request(url));
    expect(response.status).toBe(302);
    const cookie = response.headers.get("set-cookie");
    expect(cookie).toContain("HttpOnly");
    const second = await auth.handler(new Request(url));
    expect(second.headers.get("location")).toContain("error=");
    const users = await rows(
      env.DB,
      "SELECT * FROM user WHERE email='new@example.com'",
    );
    expect(users).toHaveLength(1);
    await auth.handler(
      new Request(env.APP_URL + "/api/auth/sign-in/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: env.APP_URL },
        body: JSON.stringify({
          email: "expired@example.com",
          callbackURL: "/dashboard",
        }),
      }),
    );
    await statement(
      env.DB,
      "UPDATE verification SET expiresAt=? WHERE identifier LIKE 'magic-link:%'",
      Date.now() - 1000,
    ).run();
    const expired = await auth.handler(new Request(url));
    expect(expired.headers.get("location")).toContain("error=");
  });
});
