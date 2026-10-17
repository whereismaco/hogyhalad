"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Phone } from "lucide-react";
import { money } from "@/lib/domain";
import type { Tracking } from "@/lib/crm";
import { Notice } from "./ui";
import { ThemeToggle } from "./ThemeToggle";
export function TrackingView({
  initial,
  token,
}: {
  initial: Tracking;
  token: string;
}) {
  const [data, setData] = useState(initial),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const timer = setInterval(() => {
      if (document.hidden) return;
      fetch("/api/public/tracking/" + encodeURIComponent(token), {
        cache: "no-store",
      })
        .then(async (r) => {
          const value = (await r.json()) as Tracking & { error?: string };
          if (!r.ok) throw new Error(value.error);
          if (active) {
            setData(value);
            setError("");
          }
        })
        .catch((e) => {
          if (active) setError(e.message);
        });
    }, 15000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [token]);
  return (
    <div className="tracking">
      <header>
        <div>
          <strong>{data.company.name}</strong>
          <p className="muted">Megrendelés követése</p>
        </div>
        <div className="actions">
          <ThemeToggle />
          <a className="btn" href={"tel:" + data.company.phone}>
            <Phone size={16} />
            <span>Kapcsolat</span>
          </a>
        </div>
      </header>
      <div className="panel">
        <span className="eyebrow">{data.jobCode}</span>
        <h1>Így halad a megrendelésed.</h1>
        <p className="muted">
          Utolsó változás:{" "}
          {new Date(data.updatedAt).toLocaleString("hu-HU", {
            timeZone: "Europe/Budapest",
          })}
        </p>
        {data.message && <Notice>{data.message}</Notice>}
      </div>
      {error && <Notice error>{error}</Notice>}
      <section className="panel">
        <h2>A munka állapota</h2>
        <ol className="timeline">
          {data.stages.map((s) => (
            <li
              key={s.id}
              className={s.id === data.currentStageId ? "current" : ""}
            >
              <strong>{s.name}</strong>
              {data.events
                .filter((e) => (e as { stageId: string }).stageId === s.id)
                .map((event, i) => {
                  const e = event as { message: string; createdAt: number };
                  return (
                    <small key={i}>
                      {new Date(e.createdAt).toLocaleString("hu-HU", {
                        timeZone: "Europe/Budapest",
                      })}
                    </small>
                  );
                })}
            </li>
          ))}
        </ol>
      </section>
      <section className="panel">
        <h2>Tételek és összegzés</h2>
        {data.items.length ? (
          <div className="list">
            {data.items.map((item, i) => {
              const value = item as {
                name: string;
                quantity: number;
                unit: string;
                total: number;
              };
              return (
                <div className="list-row" key={i}>
                  <div>
                    <strong>{value.name}</strong>
                    <p>
                      {value.quantity} {value.unit}
                    </p>
                  </div>
                  <strong>{money(value.total)}</strong>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="muted">
            {data.quickCount ? data.quickCount + " db átvett tétel. " : ""}A
            pontos felmérés és ár később jelenik meg.
          </p>
        )}
        <div className="list-row">
          <strong>Végösszeg</strong>
          <strong>{money(data.totalAmount)}</strong>
        </div>
        <span className="muted">
          {data.paymentStatus === "PAID" ? "Fizetve" : "Fizetésre vár"}
        </span>
      </section>
      {data.photos.length > 0 && (
        <section className="panel">
          <h2>Fotók</h2>
          <div className="tracking-photos">
            {data.photos.map((p) => (
              <a key={p.id} href={p.url} target="_blank" rel="noreferrer">
                {/* User-uploaded private images are served by an authenticated capability endpoint. */}
                <Image
                  unoptimized
                  src={p.url}
                  alt={p.filename}
                  width={220}
                  height={160}
                />
              </a>
            ))}
          </div>
        </section>
      )}
      {data.reviewUrl && (
        <section className="panel">
          <h2>Hogyan sikerült?</h2>
          <p>Örülünk, ha megosztod a tapasztalatodat.</p>
          <a
            className="btn"
            href={data.reviewUrl}
            target="_blank"
            rel="noreferrer"
          >
            Értékelés írása
          </a>
        </section>
      )}
      <footer>Ügyfélkövetés a HogyHaladdal.</footer>
    </div>
  );
}
