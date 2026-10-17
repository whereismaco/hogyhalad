import { readFileSync } from "node:fs";
const environment = process.argv[2] || "production";
if (!["staging", "production"].includes(environment))
  throw Error("Environment must be staging or production.");
const web = JSON.parse(readFileSync("wrangler.jsonc", "utf8")),
  background = JSON.parse(readFileSync("wrangler.background.jsonc", "utf8"));
const failures = [];
for (const [name, config] of [
  ["web", web],
  ["background", background],
]) {
  const target = config.env[environment];
  if (
    !target?.d1_databases?.[0]?.database_id ||
    target.d1_databases[0].database_id.startsWith("00000000")
  )
    failures.push(name + ": configure the real D1 database UUID");
  if (!target?.vars?.APP_URL?.startsWith("https://"))
    failures.push(name + ": configure the HTTPS app URL");
}
const required = [
  "BETTER_AUTH_SECRET",
  "DATA_ENCRYPTION_KEY",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "RESEND_API_KEY",
  "RESEND_WEBHOOK_SECRET",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_STARTER",
  "STRIPE_PRICE_BUSINESS",
  "STRIPE_PRICE_CREDITS_SMALL",
  "STRIPE_PRICE_CREDITS_MEDIUM",
  "STRIPE_PRICE_CREDITS_LARGE",
  "OPENAI_API_KEY",
  "TURNSTILE_SECRET_KEY",
  "NEXT_PUBLIC_TURNSTILE_SITE_KEY",
  "INVOICE_PROVIDER",
  "INVOICE_API_KEY",
  "SELLER_TAX_MODE",
  "SELLER_NAME",
  "SELLER_ADDRESS",
  "SELLER_TAX_NUMBER",
];
for (const name of required)
  if (
    !process.env[name] ||
    /placeholder|your[_-]|\.\.\./i.test(process.env[name])
  )
    failures.push(name + ": missing or placeholder");
if (
  process.env.DATA_ENCRYPTION_KEY &&
  Buffer.from(process.env.DATA_ENCRYPTION_KEY, "base64").length !== 32
)
  failures.push(
    "DATA_ENCRYPTION_KEY: must contain 32 random bytes, base64 encoded",
  );
if (
  process.env.BETTER_AUTH_SECRET &&
  process.env.BETTER_AUTH_SECRET.length < 32
)
  failures.push("BETTER_AUTH_SECRET: must have at least 32 characters");
if (!["AAM", "27", "18", "5", "0"].includes(process.env.SELLER_TAX_MODE || ""))
  failures.push("SELLER_TAX_MODE: choose the verified seller tax treatment");
if (
  process.env.INVOICE_PROVIDER === "BILLINGO" &&
  !process.env.INVOICE_BLOCK_ID
)
  failures.push("INVOICE_BLOCK_ID: required for Billingo");
if (process.env.LEGAL_DOCUMENTS_APPROVED !== "true")
  failures.push(
    "LEGAL_DOCUMENTS_APPROVED: finalize the operator details, privacy notice and subscription terms",
  );
if (failures.length) {
  console.error(
    "Release is blocked:\n" +
      [...new Set(failures)].map((f) => " - " + f).join("\n"),
  );
  process.exitCode = 1;
} else
  console.log("Release configuration checks passed. No secret values printed.");
