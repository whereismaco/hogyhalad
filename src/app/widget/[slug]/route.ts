import { getEnv } from "@/lib/env";
import { first } from "@/lib/db";
import { canWrite } from "@/lib/domain";
import { escapeHtml } from "@/lib/security";
import type { Tenant } from "@/lib/access";
export async function GET(
  _request: Request,
  route: { params: Promise<{ slug: string }> },
) {
  const env = await getEnv(),
    slug = (await route.params).slug;
  const tenant = await first<Tenant>(
    env.DB,
    "SELECT * FROM tenants WHERE slug=?",
    slug,
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
    return new Response("Az ajánlatkérő nem elérhető.", { status: 404 });
  const ancestors = [
    env.APP_URL,
    ...(JSON.parse(tenant.allowedOrigins) as string[]),
  ].join(" ");
  const html =
    '<!doctype html><html lang="hu"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>' +
    escapeHtml(tenant.name) +
    ' – Ajánlatkérés</title><link rel="stylesheet" href="/embed.css"></head><body><main data-slug="' +
    escapeHtml(slug) +
    '"><h1>' +
    escapeHtml(tenant.name) +
    '</h1><p>Árbecslés és ajánlatkérés</p><form id="widget"><label>Szolgáltatás<select name="ruleId" required></select></label><div id="dimensions"><label>Szélesség (m)<input name="width" type="number" min="0.01" max="100" step="0.01" value="2"></label><label>Hosszúság (m)<input name="length" type="number" min="0.01" max="100" step="0.01" value="3"></label></div><label>Mennyiség<input name="quantity" type="number" min="0.01" max="100000" step="0.01" value="1"></label><div id="extras"></div><p id="estimate"></p><label>Név<input name="name" required maxlength="120" autocomplete="name"></label><label>E-mail<input name="email" type="email" autocomplete="email"></label><label>Telefon<input name="phone" required minlength="6" maxlength="30" type="tel" autocomplete="tel"></label><label>Cím<input name="address" maxlength="300" autocomplete="street-address"></label><label>Megjegyzés<textarea name="notes" maxlength="4000"></textarea></label><input name="website" tabindex="-1" aria-hidden="true" style="position:absolute;left:-9999px"><div id="turnstile"></div><p>Az összeg becslés. A végleges árat a szolgáltató egyezteti.</p><button type="submit">Ajánlatot kérek</button><p id="feedback" role="status" tabindex="-1"></p></form><small>HogyHalad</small></main><script src="/embed.js" defer></script></body></html>';
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Content-Security-Policy":
        "default-src 'self'; script-src 'self' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline'; frame-ancestors " +
        ancestors,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
