import Link from "next/link";
import { Check, ArrowRight, ClipboardList, Mail, Workflow } from "lucide-react";
import { plans, money } from "@/lib/domain";
import { ThemeToggle } from "@/components/ThemeToggle";
export default function Home() {
  return (
    <div className="landing">
      <nav className="landing-nav">
        <Link href="/" className="brand">
          HogyHalad<span className="brand-dot">.</span>
        </Link>
        <div className="actions">
          <ThemeToggle />
          <Link className="btn" href="/sign-in">
            Belépés
          </Link>
        </div>
      </nav>
      <section className="hero">
        <div>
          <span className="eyebrow">
            Kevesebb visszakérdezés. Átláthatóbb munka.
          </span>
          <h1>
            Az ügyfeled is lássa,
            <br />
            hogy halad.
          </h1>
          <p>
            Munkalapok, ajánlatok és érthető állapotkövetés egy helyen.
            Szőnyegtisztítóknak, autókozmetikáknak és minden szolgáltatónak,
            ahol fontos a folyamat.
          </p>
          <Link href="/sign-in" className="btn primary">
            Kipróbálom 7 napig <ArrowRight size={18} />
          </Link>
          <p className="subtle-note">
            Bankkártya szükséges. Lemondható a próba vége előtt.
          </p>
        </div>
        <div className="panel">
          <div className="actions">
            <span className="badge blue">Ügyfélkövetés</span>
            <span className="muted">Így nézhet ki egy munkafolyamat</span>
          </div>
          <h2>Minden lépés érthető.</h2>
          <ol className="timeline">
            <li>
              <strong>Átvettük</strong>
              <small>A munkalap elkészült.</small>
            </li>
            <li className="current">
              <strong>Folyamatban</strong>
              <small>A szolgáltató dolgozik a megrendeléseden.</small>
            </li>
            <li>
              <strong>Elkészült</strong>
              <small>Értesítünk, amikor átvehető.</small>
            </li>
            <li>
              <strong>Átadva</strong>
              <small>Minden fontos dokumentum egy helyen.</small>
            </li>
          </ol>
        </div>
      </section>
      <section className="section">
        <h2>A háttérben rend. Az ügyfélnek nyugalom.</h2>
        <div className="grid three">
          {[
            {
              icon: ClipboardList,
              title: "Egy munkalap, minden részlet",
              text: "Ügyféladatok, tételek, árak, fotók és átadási dokumentumok.",
            },
            {
              icon: Workflow,
              title: "A saját folyamatod",
              text: "Válassz sablont, majd nevezd át és alakítsd a lépéseket a vállalkozásodhoz.",
            },
            {
              icon: Mail,
              title: "Értesítés a megfelelő pillanatban",
              text: "Az ügyfél követőlinket és e-mailt kap a fontos változásokról.",
            },
          ].map((f) => (
            <div className="panel" key={f.title}>
              <f.icon size={26} />
              <h3>{f.title}</h3>
              <p className="muted">{f.text}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="section" id="arak">
        <div>
          <span className="eyebrow">Előfizetések</span>
          <h2>Válassz a vállalkozásod méretéhez.</h2>
        </div>
        <div className="grid two">
          {Object.entries(plans).map(([key, p]) => (
            <div className="panel" key={key}>
              <div>
                <h3>{p.name}</h3>
                <p className="pricing-amount">
                  {money(p.price)}
                  <small> / hó</small>
                </p>
                <p className="muted">Fizetendő végösszeg</p>
              </div>
              <ul className="price-list">
                <li>
                  {p.jobs.toLocaleString("hu-HU")} munka és{" "}
                  {p.inquiries.toLocaleString("hu-HU")} megkeresés havonta
                </li>
                <li>
                  {p.seats} felhasználó, {p.credits} havi AI-kredit
                </li>
                <li>Ügyfélkövetés, e-mailes értesítés</li>
                <li>Mobilos átvétel, aláírás és PDF</li>
                {key === "BUSINESS" && (
                  <>
                    <li>Csapatmunka és címkiosztás</li>
                    <li>Weboldalas beágyazás és követési API</li>
                    <li>Számlázz.hu és Billingo kapcsolat</li>
                  </>
                )}
              </ul>
              <Link
                href="/sign-in"
                className={"btn " + (key === "BUSINESS" ? "primary" : "")}
              >
                7 napos próba <Check size={16} />
              </Link>
              <p className="subtle-note">
                A próba után {money(p.price)}/hó, ha előtte nem mondod le.
              </p>
            </div>
          ))}
        </div>
      </section>
      <footer>
        <strong>HogyHalad</strong> · Állapotkövetés szolgáltató
        vállalkozásoknak.{" "}
        <Link className="link" href="/adatkezeles">
          Adatkezelés
        </Link>
      </footer>
    </div>
  );
}
