# Business integráció

## Követés saját weboldalon

A HogyHalad követőlinkje /kovetes/{token}. A /track/{token} kompatibilis átirányítás. A véletlen token hozzáférést ad az adott munka nyilvános adataihoz: bizalmas linkként kezeld.

Saját weboldalas címhez, például https://ugyfel.hu/kovetes/{token}, a partner weboldalának szervere hívja a HogyHalad API-t.

```http
GET /api/v1/tracking/{token}
Authorization: Bearer hh_…
```

Aktív Business előfizetés és érvényes, a céghez tartozó kulcs kell. Más cég tokenjére 404 érkezik. A kulcsot a tulajdonos hozza létre, egyszer látja, és visszavonhatja. A végpont nem ad adminisztrációs vagy munkamódosítási hozzáférést.

Válasz: jobCode, company (name, phone), stages (id, name, kind, public), currentStageId, message, totalAmount (egész Ft), paymentStatus, quickCount, updatedAt (Unix ezredmásodperc), items, events, photos, reviewUrl. Belső jegyzet, címlista, ügyféltelefon és integrációs kulcs nem szerepel.

Hibák: 401 hibás kulcs, 403 nem elérhető Business-jogosultság, 404 hiányzó követés, 429 lekérési korlát. Legfeljebb 300 kérés/perc/cég. Ne cache-eld a választ megosztott CDN-en; a tokeneket hagyd ki az analitikai eseményekből és hozzáférési naplókból.

## Node.js / Express példa

```js
app.get("/kovetes/:token", async (req, res) => {
  if (!/^[A-Za-z0-9_-]{43}$/.test(req.params.token)) {
    return res.status(404).send("A követés nem található.");
  }
  const response = await fetch(
    "https://hogyhalad.hu/api/v1/tracking/" +
      encodeURIComponent(req.params.token),
    {
      headers: { Authorization: "Bearer " + process.env.HOGYHALAD_API_KEY },
      signal: AbortSignal.timeout(10000),
    },
  );
  res.set("Cache-Control", "private, no-store");
  res.set("Referrer-Policy", "no-referrer");
  if (!response.ok)
    return res.status(response.status).send("A követés nem elérhető.");
  // A sablonmotor automatikus HTML-escape funkcióját használd.
  return res.render("kovetes", { tracking: await response.json() });
});
```

## PHP példa

A partner szerverének /kovetes/{token} útvonalát irányítsd erre a kezelőre. Az API-kulcs szerverkörnyezeti változó.

```php
<?php
$token = $routeToken;
if (!preg_match('/^[A-Za-z0-9_-]{43}$/', $token)) {
    http_response_code(404); exit('A követés nem található.');
}
$ch = curl_init('https://hogyhalad.hu/api/v1/tracking/' . rawurlencode($token));
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 10,
    CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . getenv('HOGYHALAD_API_KEY')],
]);
$body = curl_exec($ch);
$status = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
curl_close($ch);
header('Cache-Control: private, no-store');
header('Referrer-Policy: no-referrer');
if ($body === false || $status !== 200) {
    http_response_code($status ?: 502); exit('A követés nem elérhető.');
}
$tracking = json_decode($body, true, 512, JSON_THROW_ON_ERROR);
echo '<h1>' . htmlspecialchars($tracking['company']['name'], ENT_QUOTES, 'UTF-8') . '</h1>';
echo '<p>' . htmlspecialchars($tracking['jobCode'], ENT_QUOTES, 'UTF-8') . '</p>';
foreach ($tracking['stages'] as $step) {
    echo '<p>' . htmlspecialchars($step['name'], ENT_QUOTES, 'UTF-8') . '</p>';
}
```

## Követőnézet egyszerű beágyazása

A partner saját /kovetes/{token} oldala a nyilvános követőnézetet iframe-ben is megjelenítheti. API-kulcs ilyenkor nem kerül a böngészőbe. A token a megrendelő saját bizalmas linkje.

```html
<iframe
  src="https://hogyhalad.hu/kovetes/EGYEDI_TOKEN"
  title="Megrendelés követése"
  width="100%"
  height="1100"
  style="border:0"
></iframe>
```

## Kalkulátor / ajánlatkérő widget

1. A Business cég állítsa be az árlistát és a minimumdíjat.
2. A Beállításokban engedélyezze a saját weboldal originjét, például https://ugyfel.hu.
3. Másolja az iframe-kódot a weboldalába.

```html
<iframe
  src="https://hogyhalad.hu/widget/ceges-azonosito"
  title="Ajánlatkérés"
  width="100%"
  height="1100"
  style="border:0"
  loading="lazy"
></iframe>
```

Az ajánlatkérő frame-ancestors CSP-je a cég domainlistájából készül. A beküldés originellenőrzést, Turnstile-ellenőrzést, honeypotot, sebességkorlátot és szerveroldali kalkulációt használ. A böngészőből küldött végösszeget nem fogadja el. Azonos requestKey nem hoz létre második megkeresést.
