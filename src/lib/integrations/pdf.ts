import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import QRCode from "qrcode";
import type { Env } from "../env";
import { first, rows, statement, uid } from "../db";
import { money } from "../domain";
export async function generatePdf(
  env: Env,
  tenantId: string,
  jobId: string,
  handoverId?: string,
  labels = false,
  taskId?: string,
) {
  if (taskId) {
    const prior = await first<{ id: string }>(
      env.DB,
      "SELECT id FROM files WHERE tenantId=? AND taskId=?",
      tenantId,
      taskId,
    );
    if (prior) return { fileId: prior.id };
  }
  const job = await first<{
    jobCode: string;
    customerName: string;
    companyName: string;
    totalAmount: number;
  }>(
    env.DB,
    "SELECT j.jobCode,c.name AS customerName,t.name AS companyName,j.totalAmount FROM jobs j JOIN customers c ON c.tenantId=j.tenantId AND c.id=j.customerId JOIN tenants t ON t.id=j.tenantId WHERE j.tenantId=? AND j.id=?",
    tenantId,
    jobId,
  );
  if (!job) throw new Error("JOB_NOT_FOUND");
  const items = await rows<{
    id: string;
    name: string;
    quantity: number;
    unit: string;
    total: number;
  }>(
    env.DB,
    "SELECT * FROM jobItems WHERE tenantId=? AND jobId=? ORDER BY createdAt",
    tenantId,
    jobId,
  );
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const fontResponse = await fetch(
    env.APP_URL + "/fonts/NotoSans-Regular.ttf",
    { signal: AbortSignal.timeout(15000) },
  );
  if (!fontResponse.ok) throw new Error("PDF_FONT_MISSING");
  const font = await doc.embedFont(await fontResponse.arrayBuffer(), {
    subset: true,
  });
  let page = doc.addPage([595, 842]),
    y = 790;
  const line = (text: string, size = 11) => {
    const chunks: string[] = [];
    let current = "";
    for (const word of text.split(/\s+/u)) {
      const candidate = current ? current + " " + word : word;
      if (font.widthOfTextAtSize(candidate, size) <= 511) {
        current = candidate;
        continue;
      }
      if (current) {
        chunks.push(current);
        current = "";
      }
      for (const char of word) {
        if (font.widthOfTextAtSize(current + char, size) > 511) {
          chunks.push(current);
          current = "";
        }
        current += char;
      }
    }
    if (current || !chunks.length) chunks.push(current);
    for (const chunk of chunks) {
      if (y < 70) {
        page = doc.addPage([595, 842]);
        y = 790;
      }
      page.drawText(chunk, {
        x: 42,
        y,
        size,
        font,
        color: rgb(0.08, 0.14, 0.22),
      });
      y -= size + 10;
    }
  };
  let snapshotItems = items,
    displayAmount = job.totalAmount,
    customerName = job.customerName,
    companyName = job.companyName,
    documentTime = Date.now();
  let handoverKind: string | undefined;
  let signatureKey: string | undefined;
  if (handoverId) {
    const handover = await first<{
      snapshotJson: string;
      kind: string;
      createdAt: number;
      objectKey: string;
    }>(
      env.DB,
      "SELECT h.*,f.objectKey FROM handovers h JOIN files f ON f.tenantId=h.tenantId AND f.id=h.signatureFileId WHERE h.tenantId=? AND h.id=? AND h.jobId=?",
      tenantId,
      handoverId,
      jobId,
    );
    if (!handover) throw new Error("HANDOVER_NOT_FOUND");
    const snapshot = JSON.parse(handover.snapshotJson) as {
      items: typeof items;
      companyName?: string;
      job: { totalAmount: number; customerName?: string };
    };
    snapshotItems = snapshot.items;
    displayAmount = snapshot.job.totalAmount;
    customerName = snapshot.job.customerName ?? job.customerName;
    companyName = snapshot.companyName ?? job.companyName;
    documentTime = handover.createdAt;
    handoverKind = handover.kind;
    signatureKey = handover.objectKey;
  }
  line(companyName, 18);
  line(labels ? "Műhelyi címkék" : "Átadás-átvételi elismervény", 16);
  line(job.jobCode);
  line(customerName);
  line(
    new Date(documentTime).toLocaleString("hu-HU", {
      timeZone: "Europe/Budapest",
    }),
  );
  if (handoverKind) {
    line(
      handoverKind === "PICKUP"
        ? "Átvétel tisztításra / szolgáltatásra"
        : "Átadás az ügyfélnek",
    );
    line(
      "Aláírás időpontja: " +
        new Date(documentTime).toLocaleString("hu-HU", {
          timeZone: "Europe/Budapest",
        }),
    );
  }
  for (const item of snapshotItems) {
    line(
      item.name +
        " – " +
        item.quantity +
        " " +
        item.unit +
        " – " +
        money(item.total),
    );
    if (labels) {
      const png = await QRCode.toDataURL(
        env.APP_URL +
          "/dashboard/jobs?id=" +
          encodeURIComponent(jobId) +
          "&item=" +
          encodeURIComponent(item.id),
        { width: 150, margin: 1 },
      );
      if (y < 200) {
        page = doc.addPage([595, 842]);
        y = 790;
      }
      const qr = await doc.embedPng(png);
      page.drawImage(qr, { x: 42, y: y - 120, width: 120, height: 120 });
      y -= 140;
    }
  }
  if (!snapshotItems.length)
    line("A tételek darabszáma az átvételi munkalapon szerepel.");
  line("Végösszeg: " + money(displayAmount), 14);
  if (signatureKey) {
    const object = await env.FILES.get(signatureKey);
    if (!object) throw new Error("SIGNATURE_NOT_FOUND");
    if (y < 180) {
      page = doc.addPage([595, 842]);
      y = 790;
    }
    const signature = await doc.embedPng(await object.arrayBuffer());
    page.drawImage(signature, { x: 42, y: y - 120, width: 280, height: 110 });
    y -= 150;
    line("Ügyfél aláírása");
  }
  line("Készült a HogyHalad rendszerében.");
  const data = await doc.save(),
    id = taskId || uid(),
    key = tenantId + "/" + jobId + "/" + id + ".pdf",
    filename = job.jobCode + (labels ? "-cimkek" : "-elismerveny") + ".pdf";
  await env.FILES.put(key, data, {
    httpMetadata: { contentType: "application/pdf" },
  });
  await statement(
    env.DB,
    "INSERT INTO files(id,tenantId,jobId,kind,objectKey,filename,mime,size,createdAt,taskId) VALUES(?,?,?,?,?,?,'application/pdf',?,?,?) ON CONFLICT(taskId) WHERE taskId IS NOT NULL DO NOTHING",
    id,
    tenantId,
    jobId,
    labels ? "LABEL" : "RECEIPT",
    key,
    filename,
    data.length,
    Date.now(),
    taskId ?? null,
  ).run();
  return { fileId: id };
}
