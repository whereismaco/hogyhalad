# Ellenőrzési jegyzék

A helyi üzleti tesztcsomag 25 sikeres tesztet tartalmaz; emellett mind az 5, tényleges Worker-futtatást használó böngészőteszt sikeres. A lint, típusellenőrzés, OpenNext-build és mindkét Worker telepítési próbája (`--dry-run`) is sikeres. A futó alkalmazás függőségeinek `npm audit --omit=dev` vizsgálata nem jelzett sérülékenységet. A fejlesztői lint-eszköz `braces` függőségére kiadott, egyelőre javított npm-verzió nélküli figyelmeztetés megmarad; ez nem része a telepített Workernek.

## Helyben reprodukálható

- npm run lint: nulla hiba és figyelmeztetés.
- npm run typecheck: sikeres típusellenőrzés.
- npm test: SQLite-on futó üzleti, izolációs, kredit- és valódi Better Auth tesztek.
- npm run build:cloudflare: Next.js build és OpenNext Worker-csomag.
- npm run test:e2e: tényleges helyi Worker + Chrome/Chromium. Nem next dev, nem API-mock.
- wrangler deploy --dry-run mindkét Workerre: csomag és bindingok ellenőrzése.

Az automatizált tesztek nem hívnak valódi fizetést, nem küldenek ügyféllevelet és nem állítanak ki éles számlát. A Better Auth tesztben csak a levélkézbesítés helyettesített; a linkkészítés, tokenhash, beváltás és munkamenet-kezelés a tényleges könyvtár.

## Saját külső tesztfiókkal elvégzendő indulási ellenőrzés

- Google OAuth: új és meglévő felhasználó, visszahívás, kijelentkezés.
- Resend: valódi magic link kézbesítés, lejárat, spam mappa, céges feladó és Reply-To.
- Stripe Test Clock: 7 nap próba, időben lemondás, első havidíj, sikertelen terhelés, kártyacsere, 3 nap türelmi idő, csomagváltás.
- Stripe-esemény újraküldése és késleltetett/sorrenden kívüli események; nincs dupla aktiválás vagy kreditjóváírás.
- AI: magyar megkeresésből szerkeszthető, ellenőrzött válasz; hibánál kredit-visszatérítés; automatikus küldés csak bekapcsolva.
- Billingo és Számlázz.hu: a szolgáltatók támogatott tesztmódjában partneradat, adózás, fizetett/fizetendő számla, hiba és bizonytalan eredmény egyeztetése.
- PDF: magyar ő/ű karakterek, többoldalas tételek, mobilos aláírás, QR-címke olvashatósága és helyes dokumentumsnapshot.
- Widget: valódi engedélyezett partnerdomainről, Turnstile-lal; tiltott domainről ne legyen beágyazható.
- Céges API: kulcs-visszavonás, Starter-visszaváltás, idegen token, limit.
- D1 és R2 mentés/visszaállítás stagingen, majd előfizetési és számlázási adatok egyeztetése.

Ezek a külső ellenőrzések csak a szolgáltatói hozzáférések rendelkezésre állása után igazolhatók. Az alkalmazásban nincs éles szolgáltatást utánzó sikeres fallback.
