import Link from "next/link";
export default function NotFound() {
  return (
    <main className="standalone">
      <Link href="/" className="brand">
        HogyHalad.
      </Link>
      <h1>Ez az oldal nem található.</h1>
      <p>Ellenőrizd a linket. A követés megszűnhetett vagy a kód hibás.</p>
      <Link href="/" className="btn">
        Vissza a kezdőlapra
      </Link>
    </main>
  );
}
