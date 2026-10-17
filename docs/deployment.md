# Cloudflare telepítés

## Erőforrások és környezetek

A webalkalmazás Workersön fut; az adatbázis D1, a fájlok privát R2, a háttérfeldolgozás Queues + külön Worker. Használj Workers Paid csomagot. A staging és production környezet adatbázisa, bucketje, queue-ja és titkai különállók.

Mindkét környezethez hozz létre erőforrásokat. Példa stagingre:

```sh
npx wrangler login
npx wrangler d1 create hogyhalad-staging
npx wrangler r2 bucket create hogyhalad-staging-files
npx wrangler queues create hogyhalad-staging-tasks
npx wrangler queues create hogyhalad-staging-dlq
```

A visszakapott D1 UUID-t írd be mindkét wrangler-konfiguráció staging részébe. Productionben ugyanezek a nevek production végződést kapnak. A nullákkal kezdődő UUID-k helyőrzők, nem telepítési célok.

A web és háttérworker ugyanahhoz a környezeti DB/FILES/TASKS erőforráshoz kapcsolódjon. A domaint és az APP_URL-t mindkét konfigurációban állítsd be. A domaint a Cloudflare Worker Custom Domains felületén kösd a webworkerhez.

## Titkok

A .env.example tartalmazza a teljes változólistát. A titkokat Cloudflare Secretsben tárold. Használható a wrangler secret put interaktív, rejtett értékbevitellel:

```sh
npx wrangler secret put BETTER_AUTH_SECRET --env staging
npx wrangler secret put DATA_ENCRYPTION_KEY --env staging
npx wrangler secret put RESEND_API_KEY --env staging
```

A háttérworker saját titkaihoz add hozzá: --config wrangler.background.jsonc. A megosztott titkoknak — különösen DATA_ENCRYPTION_KEY — egyezniük kell. A titkosítási kulcs 32 véletlen bájt base64 kódolással; a Better Auth titok legalább 32 karakteres. A titkosítási kulcsot külön, biztonságos helyen mentsd: elvesztése esetén a céges integrációs kulcsok és követőlinkek nem fejthetők vissza.

A webworker a belépéshez, Stripe Checkout/Portalhoz, webhook-ellenőrzéshez és Turnstile-hoz szükséges titkokat használja. A háttérworker az e-mail, Stripe, AI és számlázó titkokat is igényli. Az APP_URL, EMAIL_DOMAIN, AUTH_FROM, OPENAI_MODEL és a nyilvános Turnstile site key nem titkos érték; beállíthatók vars alatt.

## Szolgáltatók

Google OAuth webalkalmazás:

- origin: az APP_URL
- callback: APP_URL/api/auth/callback/google
- staginghez és éleshez külön kliens ajánlott.

Stripe:

- két havi, HUF-alapú Price: fizetendő 29 990 és 49 990 Ft;
- a Stripe API HUF-terheléseinek két tizedesjegyes minor unit értéke 2 999 000 és 4 999 000;
- három egyszeri Price: 5 000, 10 000, 20 000 Ft, a megfelelő STRIPE_PRICE_CREDITS_* változókkal;
- a csomagárak tartalmazzák a végösszeget, a Checkout nem ad hozzá további automatikus adót;
- Customer Portal: kártyakezelés, adatok és időszak végi lemondás; a Portalban kapcsold ki a közvetlen csomagváltást, azt a HogyHalad időzíti;
- állíts be próbaidő végi emlékeztetést és sikertelen fizetési értesítéseket;
- webhook: APP_URL/api/stripe/webhook; customer.subscription.created/updated/deleted/trial_will_end, invoice.paid, invoice.payment_failed, checkout.session.completed, checkout.session.async_payment_succeeded, charge.refunded;
- tesztkulcsokhoz teszt Price és webhook secret, éleshez éles értékek.

Resend:

- hitelesítsd az EMAIL_DOMAIN domaint SPF/DKIM rekordokkal; állíts be DMARC-ot;
- a feladó cégenként slug@EMAIL_DOMAIN, a Reply-To a cég saját e-mailje;
- webhook: APP_URL/api/resend/webhook, email.delivered/bounced/complained/failed;
- a belépőlevelek AUTH_FROM címről mennek.

Turnstile:

- engedélyezd a HogyHalad és a tényleges beágyazási domaineket;
- állítsd be a nyilvános site key-t és a titkos ellenőrzőkulcsot;
- a cégnek az alkalmazásban is fel kell vennie az engedélyezett weboldalakat.

OpenAI:

- a felhasználó által később biztosított kulcs; OPENAI_MODEL=gpt-6-luna;
- állíts be projektköltség-korlátot a szolgáltatói oldalon;
- élesítés előtt magyar nyelvű megkereséssel ellenőrizd a strukturált választ.

Számlázás:

- INVOICE_PROVIDER: SZAMLAZZ vagy BILLINGO, saját üzemeltetői API-kulccsal;
- Billingónál INVOICE_BLOCK_ID is kell;
- SELLER_TAX_MODE az ellenőrzött AAM/áfakezelés;
- SELLER_NAME/ADDRESS/TAX_NUMBER az üzemeltető valós adatai;
- a Business cégek saját adózási és számlázóbeállítást adnak meg a felületen;
- a /adatkezeles tájékoztató és az előfizetési szerződési feltételek véglegesítendők a valós üzemeltetői adatokkal.

## Kiadás

```sh
npm ci
npm run lint
npm run typecheck
npm test
npm run build:cloudflare
```

Előbb készíts D1-exportot, majd alkalmazd a verziózott migrációkat:

```sh
npx wrangler d1 export DB --remote --env staging --output staging-before-release.sql
npx wrangler d1 migrations apply DB --remote --env staging
npx wrangler deploy --config wrangler.background.jsonc --env staging
npx opennextjs-cloudflare deploy --env staging
```

Új, üres adatbázisnál nincs előző mentés. A secrets és wrangler-konfiguráció ellenőrzése után a stagingen futtasd végig a docs/verification.md listát. Az npm run check:release -- staging a jelenlegi folyamat környezeti változóit ellenőrzi, nem olvassa vissza a Cloudflare-ben már elhelyezett titkokat. Soha ne kérd le vagy naplózd a titkos értékeket.

Production kiadás ugyanilyen sorrendben, production környezettel. Mintaadatot ne importálj. A GitHub Actions kiadási folyamat csak kézi workflow_dispatch eseményre telepít; PR és push ellenőriz.

## Visszaállítás

1. Worker-kód visszaléptetése az előző verzióra a Cloudflare Deployments felületén.
2. Adatbázishibánál állítsd le a módosító forgalmat és a háttérfeldolgozót. A D1 Time Travelből válaszd ki a kiadás előtti állapotot.
3. Stagingen előbb ellenőrizd a visszaállítást és a megfelelő kódverziót; a visszaállítás óta létrejött külső Stripe- és számlázóeseményeket külön egyeztesd.
4. A kiadások adatbázismódosításai bővítő jellegűek; destruktív migráció előtt külön adatmigráció és mentési ellenőrzés szükséges.

A Time Travel a D1-et védi. Az R2-fájlokhoz külön, ütemezett, titkosított másolat szükséges. Visszaállítási próba nélkül az indulási ellenőrzőlista nem tekinthető teljesítettnek.
