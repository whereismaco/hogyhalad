import { AppError } from "./domain";
import type { Env } from "./env";
export function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}
export async function hash(value: string) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
    ),
  )
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("");
}
function encryptionKey(env: Env) {
  if (!env.DATA_ENCRYPTION_KEY)
    throw new AppError(503, "Az adattitkosítás nincs beállítva.");
  const bytes = Uint8Array.from(atob(env.DATA_ENCRYPTION_KEY), (c) =>
    c.charCodeAt(0),
  );
  if (bytes.length !== 32)
    throw new AppError(503, "Hibás titkosítási konfiguráció.");
  return crypto.subtle.importKey("raw", bytes, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}
export async function encrypt(env: Env, value: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      await encryptionKey(env),
      new TextEncoder().encode(value),
    ),
  );
  return btoa(String.fromCharCode(...iv, ...encrypted));
}
export async function decrypt(env: Env, value: string) {
  const bytes = Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
  return new TextDecoder().decode(
    await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: bytes.slice(0, 12) },
      await encryptionKey(env),
      bytes.slice(12),
    ),
  );
}
export function assertOrigin(request: Request, env: Env) {
  if (
    !["GET", "HEAD", "OPTIONS"].includes(request.method) &&
    request.headers.get("origin") !== new URL(env.APP_URL).origin
  )
    throw new AppError(403, "Nem engedélyezett kérésforrás.");
}
export function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
}
export async function rateLimit(
  db: D1Database,
  key: string,
  limit: number,
  windowMs = 60000,
) {
  const window = Math.floor(Date.now() / windowMs);
  const result = await db
    .prepare(
      "INSERT INTO throttle (key, window, count, expiresAt) VALUES (?, ?, 1, ?) ON CONFLICT(key, window) DO UPDATE SET count=count+1 RETURNING count",
    )
    .bind(await hash(key), window, Date.now() + windowMs)
    .first<{ count: number }>();
  if ((result?.count ?? limit + 1) > limit)
    throw new AppError(429, "Túl sok kérés. Próbáld újra később.");
}
