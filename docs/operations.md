# Üzemeltetés

## Jogosultságok

- Tulajdonos: cég, munkák, csapat, előfizetés, integrációs titkok, API-kulcsok, export.
- Adminisztrátor: napi működés, árlista, céges profil, nem adminisztrátor munkatársak kezelése, export; előfizetést és titkos integrációkat nem módosít.
- Diszpécser: ügyfelek, megkeresések, munkalapok, árbecslés, AI, címkiosztás.
- Sofőr és munkatárs: kizárólag saját hozzárendelt munkák, előreléptetés, fotók és aláírásos átadás.

Minden adatlekérés a munkamenetből ellenőrzött cégtagságot használja. A cégválasztó cookie önmagában nem jogosít hozzáférésre. A kapcsolatok összetett tenantId+id idegen kulcsai adatbázisszinten is tiltják a cégek közötti összerendelést. A nyilvános követőoldal külön, szűk adatválaszt használ.

## Előfizetés és kvóták

A számlázási állapotot aláírt Stripe-események és a Stripe aktuális előfizetési rekordja adja. A sikeres visszairányítás nem aktivál hozzáférést. Próba egy tulajdonoshoz egyszer jár, kártyamegadással. Az elveszett webhookokat a Stripe Dashboardból az eredeti eseménnyel újraküldheted.

A havidíj beérkezése frissíti a havi kreditkeretet és a felhasználási időszakot. A munkák/megkeresések számát létrehozási idő szerint számoljuk. Archiválás nem ad vissza kvótát. Minimumdíj és árlista a már rögzített munkák snapshot értékét nem módosítja.

Sikertelen fizetés után 3 nap türelmi idő, utána módosítási tiltás; az export és a meglévő követőlink megmarad. Előfizetés lemondása nem törli automatikusan az adatokat.

## Háttérfeladatok

A tasks outbox és az üzleti módosítások lehetőség szerint egy D1 batch tranzakcióban készülnek. A Cron percenként a Queue-ra adja az esedékes feladatokat. A fogyasztó ötperces kizárólagos lease-t használ. A legfeljebb öt próbálkozás közötti késleltetés növekvő.

A felület megmutatja a feladat állapotát, próbálkozásait és biztonságos hibakódját. Külső szolgáltató teljes hibaválasza és titkos érték nem jelenik meg. A sikertelen AI-művelet egyszer téríti vissza a lefoglalt kreditet; az újrapróbáláshoz új AI-kérést indíts.

E-mail: szolgáltatói idempotency key = feladatazonosító. A sikeres API-küldéstől külön állapot a kézbesítés, visszapattanás és panasz; a Resend aláírt webhookja frissíti ezt.

Számlázás: bizonytalan hálózati eredmény vagy megszakadt számlakiállítás után a feladat ellenőrzést kér. A tulajdonos a számlázóban ellenőrzi, készült-e bizonylat; a Beállításokban rögzíti a számlaszámot/azonosítót, vagy megerősíti, hogy nem készült számla. Csak ezután engedett az új küldés. Az ellenőrzést naplózzuk.

A Stripe nyugta a fizetés igazolása. A HogyHalad magyar számláit a külön üzemeltetői számlázófiók készíti, a Business munkadíjak számláit az adott cég saját fiókja.

## Fájlok és adatok

Az R2 bucket nem publikus. Aláírás, elismervény és számla belső jogosultsággal érhető el. A fotó alapból belső; az iroda kifejezetten teszi láthatóvá a követőoldalon. A követőlink visszavonása a nyilvános fotóelérést is megszünteti.

D1 Time Travel és rendszeres export szükséges. A tenantonkénti JSON-export az alkalmazásból letölthető; ez nem helyettesíti a teljes adatbázis-, fájl- és titokmentést. Az üzemeltető határozza meg és dokumentálja az adatmegőrzési időket. Törlés előtt a számlázási és egyéb megőrzési kötelezettségeket külön kell kezelni.

## Indulás után figyelendő

Cloudflare Worker hibaarány, Queue backlog/DLQ, failed vagy lejárt lease-ű tasks rekordok, sikertelen számlázás, Resend bounce/complaint, Stripe past_due és AI-krediteltérések. A privát követőtokeneket ne küldd analitikai eszközbe.

A GPS és a háttérben működő mobilos helymegosztás későbbi kiadás. A jelenlegi szállítási lista dátumot, hozzárendelést, sorrendet és navigációs linket kezel.
