import { XMLBuilder } from "fast-xml-parser";
import Decimal from "decimal.js";
import { required, type Env } from "../env";
import { budapestDate } from "../domain";
export interface InvoiceInput {
  sourceId: string;
  name: string;
  email: string;
  address: string;
  zip: string;
  city: string;
  taxNumber: string;
  amount: number;
  description: string;
  paid: boolean;
  taxMode: string;
  provider: string;
  apiKey: string;
  blockId: string;
  paymentMethod?: "CASH" | "CARD_POS" | "TRANSFER";
}
export class UncertainInvoiceError extends Error {}
export async function issueInvoice(
  env: Env,
  input: InvoiceInput,
): Promise<{ id: string; number: string; pdf?: Uint8Array }> {
  void env;
  if (
    !input.zip ||
    !input.city ||
    !input.address ||
    !input.name ||
    !input.taxMode
  )
    throw new Error("INVOICE_ADDRESS_OR_TAX_MISSING");
  if (input.amount <= 0) throw new Error("INVOICE_AMOUNT_INVALID");
  const today = budapestDate(),
    due = input.paid
      ? today
      : budapestDate(new Date(Date.now() + 8 * 86400000));
  if (input.provider === "BILLINGO") {
    const headers = {
      "X-API-KEY": required(input.apiKey, "Billingo"),
      "Content-Type": "application/json",
    };
    const partner = await fetch("https://api.billingo.hu/v3/partners", {
      method: "POST",
      headers,
      signal: AbortSignal.timeout(20000),
      body: JSON.stringify({
        name: input.name,
        address: {
          country_code: "HU",
          post_code: input.zip,
          city: input.city,
          address: input.address,
        },
        emails: input.email ? [input.email] : [],
        taxcode: input.taxNumber || undefined,
        tax_type: input.taxNumber ? "has_tax_number" : "no_tax_number",
      }),
    });
    if (!partner.ok) throw new Error("BILLINGO_PARTNER_REJECTED");
    const partnerData = (await partner.json()) as { id: number };
    let response: Response;
    try {
      response = await fetch("https://api.billingo.hu/v3/documents", {
        method: "POST",
        headers,
        signal: AbortSignal.timeout(25000),
        body: JSON.stringify({
          vendor_id: input.sourceId,
          partner_id: partnerData.id,
          block_id: Number(required(input.blockId, "Billingo számlatömb")),
          type: "invoice",
          fulfillment_date: today,
          due_date: due,
          payment_method:
            input.paymentMethod === "CASH"
              ? "cash"
              : input.paymentMethod === "CARD_POS"
                ? "bankcard"
                : input.paymentMethod === "TRANSFER"
                  ? "wire_transfer"
                  : input.paid
                    ? "online_bankcard"
                    : "wire_transfer",
          language: "hu",
          currency: "HUF",
          conversion_rate: 1,
          electronic: true,
          paid: input.paid,
          comment: "HogyHalad azonosító: " + input.sourceId,
          items: [
            {
              name: input.description,
              unit_price: input.amount,
              unit_price_type: "gross",
              quantity: 1,
              unit: "db",
              vat: input.taxMode === "AAM" ? "AAM" : input.taxMode + "%",
            },
          ],
        }),
      });
    } catch {
      throw new UncertainInvoiceError("BILLINGO_UNKNOWN_RESULT");
    }
    if (!response.ok) {
      if (response.status >= 500)
        throw new UncertainInvoiceError("BILLINGO_UNKNOWN_RESULT");
      throw new Error("BILLINGO_DOCUMENT_REJECTED");
    }
    const document = (await response.json()) as {
      id: number;
      invoice_number: string;
    };
    return { id: String(document.id), number: document.invoice_number };
  }
  if (input.provider === "SZAMLAZZ") {
    const vat = input.taxMode === "AAM" ? 0 : Number(input.taxMode),
      net = new Decimal(input.amount)
        .div(new Decimal(1).plus(new Decimal(vat).div(100)))
        .toDecimalPlaces(2)
        .toNumber();
    const builder = new XMLBuilder({ ignoreAttributes: false, format: false });
    const xml =
      '<?xml version="1.0" encoding="UTF-8"?>' +
      builder.build({
        xmlszamla: {
          "@_xmlns": "http://www.szamlazz.hu/xmlszamla",
          "@_xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
          "@_xsi:schemaLocation":
            "http://www.szamlazz.hu/xmlszamla https://www.szamlazz.hu/szamla/docs/xsds/agent/xmlszamla.xsd",
          beallitasok: {
            felhasznalo: "",
            jelszo: "",
            szamlaagentkulcs: required(input.apiKey, "Számla Agent"),
            eszamla: true,
            szamlaLetoltes: true,
            valaszVerzio: 1,
            szamlaKulsoAzon: input.sourceId,
          },
          fejlec: {
            keltDatum: today,
            teljesitesDatum: today,
            fizetesiHataridoDatum: due,
            fizmod:
              input.paymentMethod === "CASH"
                ? "készpénz"
                : input.paymentMethod === "TRANSFER"
                  ? "átutalás"
                  : input.paid
                    ? "bankkártya"
                    : "átutalás",
            penznem: "HUF",
            szamlaNyelve: "hu",
            megjegyzes: "HogyHalad azonosító: " + input.sourceId,
            fizetve: input.paid,
          },
          elado: {},
          vevo: {
            nev: input.name,
            irsz: input.zip,
            telepules: input.city,
            cim: input.address,
            email: input.email,
            sendEmail: false,
            adoalany: input.taxNumber ? 1 : -1,
            adoszam: input.taxNumber,
          },
          tetelek: {
            tetel: {
              megnevezes: input.description,
              mennyiseg: 1,
              mennyisegiEgyseg: "db",
              nettoEgysegar: net,
              afakulcs: input.taxMode,
              nettoErtek: net,
              afaErtek: new Decimal(input.amount).minus(net).toNumber(),
              bruttoErtek: input.amount,
            },
          },
        },
      });
    const form = new FormData();
    form.set(
      "action-xmlagentxmlfile",
      new Blob([xml], { type: "application/xml" }),
      "invoice.xml",
    );
    let response: Response;
    try {
      response = await fetch("https://www.szamlazz.hu/szamla/", {
        method: "POST",
        body: form,
        signal: AbortSignal.timeout(25000),
      });
    } catch {
      throw new UncertainInvoiceError("SZAMLAZZ_UNKNOWN_RESULT");
    }
    const number = response.headers.get("szlahu_szamlaszam"),
      error = response.headers.get("szlahu_error");
    if (error) throw new Error("SZAMLAZZ_DOCUMENT_REJECTED");
    if (!response.ok || !number)
      throw new UncertainInvoiceError("SZAMLAZZ_UNKNOWN_RESULT");
    const decoded = decodeURIComponent(number);
    return {
      id: decoded,
      number: decoded,
      pdf: new Uint8Array(await response.arrayBuffer()),
    };
  }
  throw new Error("INVOICE_PROVIDER_MISSING");
}
export async function downloadInvoice(
  provider: string,
  apiKey: string,
  externalId: string,
): Promise<Uint8Array> {
  let response: Response;
  if (provider === "BILLINGO") {
    if (!/^\d+$/.test(externalId)) throw new Error("INVOICE_ID_INVALID");
    response = await fetch(
      "https://api.billingo.hu/v3/documents/" + externalId + "/download",
      { headers: { "X-API-KEY": apiKey }, signal: AbortSignal.timeout(20000) },
    );
  } else if (provider === "SZAMLAZZ") {
    const xml = new XMLBuilder({ ignoreAttributes: false }).build({
      xmlszamlapdf: {
        "@_xmlns": "http://www.szamlazz.hu/xmlszamlapdf",
        szamlaagentkulcs: apiKey,
        szamlaszam: externalId,
        valaszVerzio: 1,
      },
    });
    const form = new FormData();
    form.set(
      "action-szamla_agent_pdf",
      new Blob([xml], { type: "application/xml" }),
      "query.xml",
    );
    response = await fetch("https://www.szamlazz.hu/szamla/", {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(20000),
    });
  } else throw new Error("INVOICE_PROVIDER_MISSING");
  if (!response.ok || response.status === 202)
    throw new Error("INVOICE_PDF_NOT_READY");
  const data = new Uint8Array(await response.arrayBuffer());
  if (new TextDecoder().decode(data.slice(0, 5)) !== "%PDF-")
    throw new Error("INVOICE_PDF_INVALID");
  return data;
}
