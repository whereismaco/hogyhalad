import Link from "next/link";
export const metadata = { title: "Adatkezelési információk" };
export default function Page() {
  return (
    <main className="standalone">
      <Link href="/" className="brand">
        HogyHalad.
      </Link>
      <h1>Adatkezelési információk</h1>
      <p>
        A HogyHalad a szolgáltatók munkáinak kezeléséhez és állapotkövetéséhez
        szükséges adatokat dolgozza fel. A megrendelés adataival kapcsolatos
        megkeresést a követőoldalon feltüntetett szolgáltatónak küldheted.
      </p>
      <p>
        A követőlink birtokában megtekinthető a szolgáltató által közzétett
        munkafolyamat. A linket csak azzal oszd meg, akinek hozzáférést
        szeretnél adni.
      </p>
      <p>
        A teljes, üzemeltetői adatokat és adatfeldolgozási feltételeket
        tartalmazó tájékoztatót az éles indulás előtt kell véglegesíteni.
      </p>
    </main>
  );
}
