import {
  test,
  expect,
  type BrowserContext,
  type APIRequestContext,
} from "@playwright/test";
import { readFileSync } from "node:fs";
const base = "http://localhost:8787";
const state = JSON.parse(readFileSync(".wrangler/e2e-state.json", "utf8")) as {
  sessions: Record<
    string,
    {
      name: string;
      value: string;
      domain: string;
      path: string;
      httpOnly: boolean;
      sameSite: "Lax";
      secure: boolean;
    }
  >;
  keyB: string;
};
async function login(context: BrowserContext, who = "a") {
  await context.addCookies([state.sessions[who]]);
}
async function post(request: APIRequestContext, path: string, data: unknown) {
  return request.post("/api/crm/" + path, { headers: { Origin: base }, data });
}
test("minden modul betöltődik és mobilon is elfér", async ({
  page,
  context,
}, testInfo) => {
  await login(context);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const [path, title] of [
    ["/dashboard", "Áttekintés"],
    ["/dashboard/customers", "Ügyfelek"],
    ["/dashboard/inquiries", "Megkeresések"],
    ["/dashboard/calculator", "Árlista és kalkulátor"],
    ["/dashboard/ai", "AI asszisztens"],
    ["/dashboard/billing", "Előfizetés"],
    ["/dashboard/settings", "Beállítások"],
  ]) {
    await page.goto(path);
    await expect(
      page.getByRole("heading", { name: title, level: 1, exact: true }),
    ).toBeVisible();
  }
  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", { name: "Áttekintés", level: 1 }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("dashboard-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dashboard/settings");
  await expect(
    page.getByRole("heading", { name: "Beállítások", level: 1 }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("settings-mobile.png"),
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test("kezdőlap, mobilnézet és védett felület", async ({ page, request }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Az ügyfeled",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("link", { name: /Kipróbálom/ })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/sign-in/);
  expect((await request.get("/api/crm/snapshot")).status()).toBe(401);
  expect((await request.get("/api/public/tracking/ismeretlen")).status()).toBe(
    404,
  );
  expect((await request.get("/api/v1/tracking/valami")).status()).toBe(401);
});
test("munkalap mentése és frissítés utáni megmaradása", async ({
  page,
  context,
}) => {
  await login(context);
  await page.goto("/dashboard/jobs");
  await page.getByRole("button", { name: "Új munka", exact: true }).click();
  const name = "E2E Ügyfél " + Date.now();
  await page.getByLabel("Név *", { exact: true }).fill(name);
  await page.getByLabel("Telefon *", { exact: true }).fill("+36301234567");
  await page.getByLabel("Utca, házszám").fill("Teszt utca 42.");
  await page
    .getByRole("button", { name: "Munka létrehozása", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.getByText(name, { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText(name, { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Menü", exact: true }).click();
  await expect(page.getByRole("navigation", { name: "Főmenü" })).toBeVisible();
});
test("API: cégek, sofőr, fájl, követés és Business-jogosultság elkülönítése", async ({
  browser,
}) => {
  const a = await browser.newContext({ baseURL: base }),
    b = await browser.newContext({ baseURL: base }),
    driver = await browser.newContext({ baseURL: base });
  await login(a);
  await login(b, "b");
  await login(driver, "driver");
  const created = await post(a.request, "jobs", {
    customer: {
      name: "API Ügyfél",
      phone: "+36303334444",
      email: "api@example.test",
      address: "Teszt utca",
      zip: "1111",
      city: "Budapest",
    },
    requestKey: crypto.randomUUID(),
  });
  expect(created.status()).toBe(201);
  const { id } = (await created.json()) as { id: string };
  expect((await b.request.get("/api/crm/jobs/" + id)).status()).toBe(404);
  expect((await driver.request.get("/api/crm/jobs/" + id)).status()).toBe(404);
  expect((await driver.request.get("/api/crm/customers")).status()).toBe(403);
  expect(
    (
      await b.request.post("/api/crm/customers", {
        data: { name: "CSRF", phone: "123456" },
      })
    ).status(),
  ).toBe(403);
  const tracking = await post(a.request, "jobs/" + id + "/tracking", {}),
    { url } = (await tracking.json()) as { url: string },
    token = url.split("/").pop()!;
  const publicData = await a.request.get("/api/public/tracking/" + token);
  expect(publicData.status()).toBe(200);
  const dto = await publicData.json();
  expect(dto).not.toHaveProperty("customerPhone");
  expect(dto).not.toHaveProperty("internalNotes");
  const keys = await post(a.request, "api-keys", { name: "E2E integration" }),
    { token: apiKey } = (await keys.json()) as { token: string };
  expect(
    (
      await a.request.get("/api/v1/tracking/" + token, {
        headers: { Authorization: "Bearer " + apiKey },
      })
    ).status(),
  ).toBe(200);
  expect(
    (
      await b.request.get("/api/v1/tracking/" + token, {
        headers: { Authorization: "Bearer " + state.keyB },
      })
    ).status(),
  ).toBe(403);
  const upload = await a.request.post("/api/crm/jobs/" + id + "/upload", {
    headers: { Origin: base },
    multipart: {
      kind: "PHOTO",
      file: {
        name: "test.png",
        mimeType: "image/png",
        buffer: Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jGqkAAAAASUVORK5CYII=",
          "base64",
        ),
      },
    },
  });
  expect(upload.status()).toBe(201);
  const { id: fileId } = (await upload.json()) as { id: string };
  expect((await b.request.get("/api/crm/files/" + fileId)).status()).toBe(404);
  expect((await a.request.get("/api/crm/files/" + fileId)).status()).toBe(200);
  const signature = await a.request.post("/api/crm/jobs/" + id + "/upload", {
    headers: { Origin: base },
    multipart: {
      kind: "SIGNATURE",
      file: {
        name: "signature.png",
        mimeType: "image/png",
        buffer: Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jGqkAAAAASUVORK5CYII=",
          "base64",
        ),
      },
    },
  });
  expect(signature.status()).toBe(201);
  const signatureFile = (await signature.json()) as { id: string };
  const handover = await post(a.request, "jobs/" + id + "/handover", {
    kind: "PICKUP",
    signatureFileId: signatureFile.id,
    version: 1,
  });
  expect(handover.status()).toBe(200);
  expect(
    (
      (await (await a.request.get("/api/crm/jobs/" + id)).json()) as {
        stageId: string;
      }
    ).stageId,
  ).toBe("received");
  const duplicateHandover = await post(a.request, "jobs/" + id + "/handover", {
    kind: "PICKUP",
    signatureFileId: signatureFile.id,
    version: 1,
  });
  expect(duplicateHandover.status()).toBe(409);
  const publicPage = await a.newPage();
  await publicPage.goto("/kovetes/" + token);
  await expect(publicPage.getByRole("heading", { level: 1 })).toHaveText(
    "Így halad a megrendelésed.",
  );
  await publicPage.close();
  await post(a.request, "jobs/" + id + "/tracking", { revoke: true });
  expect((await a.request.get("/api/public/tracking/" + token)).status()).toBe(
    404,
  );
  await a.close();
  await b.close();
  await driver.close();
});

test("megkeresésből egyszer létrejövő munkalap megőrzi a számlázási címet", async ({
  browser,
}) => {
  const context = await browser.newContext({ baseURL: base });
  await login(context);
  const inquiry = await post(context.request, "inquiries", {
    name: "Ajánlatkérő Cég",
    phone: "+36307778888",
    email: "ajanlat@example.test",
    address: "Minta utca 12.",
    zip: "1117",
    city: "Budapest",
    taxNumber: "12345678-1-43",
    requestKey: crypto.randomUUID(),
  });
  expect(inquiry.status()).toBe(201);
  const { id: inquiryId } = (await inquiry.json()) as { id: string };
  const converted = await post(
    context.request,
    `inquiries/${inquiryId}/convert`,
    {},
  );
  expect(converted.status()).toBe(200);
  const { id: jobId } = (await converted.json()) as { id: string };
  const repeat = await post(
    context.request,
    `inquiries/${inquiryId}/convert`,
    {},
  );
  expect((await repeat.json()).id).toBe(jobId);
  const detail = await context.request.get(`/api/crm/jobs/${jobId}`);
  const data = await detail.json();
  const customers = await context.request.get(
    "/api/crm/customers?q=" + encodeURIComponent("Ajánlatkérő Cég"),
  );
  const { items } = await customers.json();
  expect(
    items.find((customer: { id: string }) => customer.id === data.customerId),
  ).toMatchObject({
    zip: "1117",
    city: "Budapest",
    taxNumber: "12345678-1-43",
  });
  await context.close();
});
