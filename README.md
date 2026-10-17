# HogyHalad

Több céget kiszolgáló szolgáltatói CRM: ügyfelek, megkeresések, munkafolyamatok, követőoldal, mobilos átadás, előfizetés és integrációk.

## Technológia

Next.js 16.4.2 / React 19, Cloudflare Workers + OpenNext 1.20.12, D1 + Drizzle, privát R2, Better Auth, Stripe, Resend, OpenAI. A háttérfeladatokat külön Worker és Queue dolgozza fel.

## Helyi indítás

Node.js 24 szükséges. A projektben rögzített csomagverziókat használd.

```sh
npm ci
node scripts/dev-setup.mjs
npm run db:migrate
npm run dev
```

A fejlesztői alkalmazás címe http://localhost:3000. A titkok helye a Gitből kizárt .dev.vars. A .env.example referencialista; az alkalmazás a Worker-bindingokat használja, a régi .env.local Clerk/Neon-beállításai már nem használatosak. A setup megőrzi a meglévő .dev.vars fájlt.

A Next fejlesztői bindingjai a wrangler.dev.jsonc fájlból érkeznek. Ez ugyanazt a helyi D1/R2 állapotot használja, de nem nyitja meg a buildelt assets mappát, így a fejlesztői szerver nem zárolja az OpenNext kimenetét.

A valódi magic linkhez Resend, a Google-belépéshez OAuth-beállítás szükséges. Nincs fejlesztői belépési kiskapu. A tesztek kizárólag helyi D1-ben hoznak létre külön tesztmunkameneteket.

Opcionális helyi mintaadatok: npm run db:seed. Éles adatbázisba soha ne töltsd fel a seeds könyvtár tartalmát.

## Háttérfeldolgozás helyben

Külön terminálban:

```sh
npm run worker:dev -- --test-scheduled --port 8788
```

A helyi ütemező meghívása: http://localhost:8788/__scheduled. Az outbox sorait a Queue fogyasztó dolgozza fel. A két Worker azonos helyi D1/R2 állapotot használ. A háttérworker APP_URL-je a futó webalkalmazás címe legyen; innen tölti a PDF-hez mellékelt, SIL OFL licencű Noto Sans betűtípust.

## Ellenőrzések

```sh
npm run lint
npm run typecheck
npm test
npm run build:cloudflare
npm run test:e2e
```

Az E2E a valódi helyi Worker-futtatást használja a 8787-es porton. Windows alatt a telepített Chrome-ot; Linux alatt előbb: npx playwright install --with-deps chromium. A helyi tesztmunkamenetek és nyomkövetési fájlok a Gitből kizárt .wrangler és test-results könyvtárakban maradnak.

## Csomagok

Starter: 29 990 Ft/hó; 200 munka, 300 megkeresés, 1 felhasználó, 30 AI-kredit.
Business: 49 990 Ft/hó; 1000 munka, 1500 megkeresés, 5 felhasználó, 100 AI-kredit, csapatmunka, beágyazás, követési API, Számlázz.hu/Billingo.

A havidíjak fizetendő végösszegek. Hétnapos próba kötelező kártyamegadással; automatikus megújulás, Stripe Portalból lemondás. Csomagváltás a következő időszaktól. A munkadíjakat a HogyHalad Stripe-fiókja nem szedi be.

## Dokumentáció

- docs/deployment.md — Cloudflare-erőforrások, titkok, kiadás és visszaállítás
- docs/integration.md — Business API, beágyazás, Node.js és PHP példa
- docs/operations.md — jogosultságok, háttérfeladatok, számlázási hibák és adatkezelés
- docs/verification.md — ellenőrzések és a külső hozzáféréssel végzendő indulási tesztek

A tényleges külső fizetés, levélkézbesítés, OAuth-visszahívás és NAV-os számlázás igazolásához a saját szolgáltatói tesztfiókok szükségesek. A konfigurációs ellenőrzés szándékosan blokkolja a hiányos élesítést.
