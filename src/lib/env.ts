import { getCloudflareContext } from "@opennextjs/cloudflare";
export interface Env {
  DB: D1Database;
  FILES: R2Bucket;
  TASKS: Queue<{ id: string }>;
  APP_URL: string;
  EMAIL_DOMAIN: string;
  AUTH_FROM: string;
  BETTER_AUTH_SECRET: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  RESEND_API_KEY?: string;
  RESEND_WEBHOOK_SECRET?: string;
  DATA_ENCRYPTION_KEY: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_PRICE_STARTER?: string;
  STRIPE_PRICE_BUSINESS?: string;
  STRIPE_PRICE_CREDITS_SMALL?: string;
  STRIPE_PRICE_CREDITS_MEDIUM?: string;
  STRIPE_PRICE_CREDITS_LARGE?: string;
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
  TURNSTILE_SECRET_KEY?: string;
  NEXT_PUBLIC_TURNSTILE_SITE_KEY?: string;
  INVOICE_PROVIDER?: string;
  INVOICE_API_KEY?: string;
  INVOICE_BLOCK_ID?: string;
  SELLER_TAX_MODE?: string;
  SELLER_NAME?: string;
  SELLER_ADDRESS?: string;
  SELLER_TAX_NUMBER?: string;
  PDF_FONT_URL?: string;
  ENVIRONMENT: string;
}
export async function getEnv(): Promise<Env> {
  return (await getCloudflareContext({ async: true })).env as unknown as Env;
}
export function required(value: string | undefined, label: string): string {
  if (!value || /placeholder|your[_-]|\.\.\./i.test(value))
    throw new Error(label + " nincs beállítva.");
  return value;
}
