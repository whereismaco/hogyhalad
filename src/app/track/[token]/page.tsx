"use client";

import React from "react";
import { useParams } from "next/navigation";
import { initialJobs, initialTenantSettings } from "@/lib/mockData";
import {
  CheckCircle2,
  Clock,
  Truck,
  Sparkles,
  Phone,
  MapPin,
  Star,
  ExternalLink,
  ShieldCheck,
  Package,
} from "lucide-react";
import { JobStatus } from "@/types/crm";
import { ThemeToggle } from "@/components/ThemeToggle";

const timelineSteps: { key: JobStatus; title: string; desc: string }[] = [
  { key: "WAITING_PICKUP", title: "1. Felvételre Vár", desc: "A sofőr ütemezte a szőnyegek elszállítását." },
  { key: "RECEIVED", title: "2. Beérkezett a Műhelybe", desc: "Állapotfelmérés, mérés és előkezelés megkezdődött." },
  { key: "IN_PROGRESS", title: "3. Tisztítás & Száradás", desc: "Mélymosás, centrifuga és klimatizált szárítókamra." },
  { key: "COMPLETED", title: "4. Elkészült", desc: "Minőségellenőrzés kész, szállításra előkészítve." },
  { key: "DELIVERED", title: "5. Kiszállítva", desc: "Tiszta szőnyegek átadva az Ön otthonában." },
];

const statusIndexMap: Record<JobStatus, number> = {
  WAITING_PICKUP: 0,
  RECEIVED: 1,
  IN_PROGRESS: 2,
  COMPLETED: 3,
  DELIVERED: 4,
  ARCHIVED: 4,
};

export default function CustomerTrackingPage() {
  const params = useParams();
  const token = params?.token as string;

  // Teszt célból megkeressük a tokent vagy fallback job-102
  const job = initialJobs.find((j) => j.trackingToken === token) || initialJobs[1];
  const tenant = initialTenantSettings;

  const currentStepIndex = statusIndexMap[job.status];

  return (
    <div className="min-h-screen bg-[var(--bg-base)] flex flex-col font-sans">
      {/* Céges Fejléc */}
      <header className="border-b border-[var(--border-color)] bg-[var(--bg-surface)] py-4 px-6 sticky top-0 z-30 shadow-xs">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center font-bold text-base shadow-sm">
              CF
            </div>
            <div>
              <h1 className="font-bold text-base text-[var(--text-primary)]">{tenant.name}</h1>
              <p className="text-xs text-[var(--text-muted)]">Élő Szőnyegtisztítási Státuszkövető</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <a
              href={`tel:${tenant.phone}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border-color)] text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">{tenant.phone}</span>
            </a>
          </div>
        </div>
      </header>

      {/* Fő Tartalom */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Ügyfél Üdvözlő & Megrendelés Kártya */}
        <div className="p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border-color)] pb-3">
            <div>
              <span className="text-[11px] font-mono font-bold text-blue-600 dark:text-blue-400">
                Azonosító: {job.jobCode}
              </span>
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                Kedves {job.customerName}!
              </h2>
            </div>

            <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-900 shrink-0">
              {timelineSteps[currentStepIndex].title}
            </span>
          </div>

          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Itt követheti nyomon valós időben szőnyegei tisztítási folyamatát az elszállítástól egészen a visszaszállításig.
          </p>
        </div>

        {/* VIZUÁLIS IDŐVONAL (STEPS) */}
        <div className="p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-xs space-y-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Tisztítási Fázisok
          </h3>

          <div className="relative pl-6 sm:pl-8 space-y-8 before:absolute before:left-2.5 sm:before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
            {timelineSteps.map((step, idx) => {
              const isPast = idx < currentStepIndex;
              const isCurrent = idx === currentStepIndex;

              return (
                <div key={step.key} className="relative group">
                  {/* Pont az idővonalon */}
                  <div
                    className={`absolute -left-6 sm:-left-8 top-0.5 w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                      isPast
                        ? "bg-emerald-500 text-white border-emerald-500"
                        : isCurrent
                        ? "bg-blue-600 text-white border-blue-600 ring-4 ring-blue-100 dark:ring-blue-950 animate-pulse"
                        : "bg-[var(--bg-surface)] text-[var(--text-muted)] border-slate-300 dark:border-slate-700"
                    }`}
                  >
                    {isPast ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
                  </div>

                  <div>
                    <h4
                      className={`text-sm font-bold ${
                        isCurrent
                          ? "text-blue-600 dark:text-blue-400"
                          : isPast
                          ? "text-[var(--text-primary)]"
                          : "text-[var(--text-muted)]"
                      }`}
                    >
                      {step.title}
                    </h4>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      {step.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Felvett Tételek és Összegzés */}
        <div className="p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-xs space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Átvett Tételek & Kalkuláció
          </h3>

          {job.items.length > 0 ? (
            <div className="space-y-3">
              {job.items.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-2xl bg-[var(--bg-subtle)] flex items-center justify-between text-xs"
                >
                  <div>
                    <p className="font-bold text-[var(--text-primary)]">{item.name}</p>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      Méret: {item.width}m × {item.length}m ({item.area} m²)
                    </p>
                    {item.extras.length > 0 && (
                      <p className="text-[10px] text-purple-600 dark:text-purple-400 mt-0.5">
                        Extrák: {item.extras.join(", ")}
                      </p>
                    )}
                  </div>

                  <span className="font-black text-sm text-[var(--text-primary)]">
                    {item.totalPrice.toLocaleString("hu-HU")} Ft
                  </span>
                </div>
              ))}

              <div className="pt-3 border-t border-[var(--border-color)] flex items-baseline justify-between">
                <span className="font-bold text-xs text-[var(--text-secondary)]">Végösszeg (Bruttó):</span>
                <span className="font-black text-xl text-blue-600 dark:text-blue-400">
                  {job.totalAmount.toLocaleString("hu-HU")} Ft
                </span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-[var(--text-muted)]">
              Átvéve: {job.quickRugCount} db szőnyeg. A pontos felmérés és díj a műhelyi beérkezéskor jelenik meg itt.
            </p>
          )}
        </div>

        {/* Google Értékelés Kártya (Ha elkészült vagy kiszállítva) */}
        {(job.status === "COMPLETED" || job.status === "DELIVERED") && (
          <div className="p-6 rounded-3xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 border border-amber-200 dark:border-amber-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-400 text-amber-950 flex items-center justify-center shrink-0 shadow-sm">
                <Star className="w-6 h-6 fill-amber-950 text-amber-950" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-amber-950 dark:text-amber-200">
                  Elégedett a tisztítás minőségével?
                </h4>
                <p className="text-xs text-amber-900/80 dark:text-amber-300/80 mt-0.5">
                  Segítsen munkánkat egy 5 csillagos Google értékeléssel!
                </p>
              </div>
            </div>

            <a
              href={tenant.googleReviewUrl || "https://maps.google.com"}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-md shadow-amber-500/20 transition-all shrink-0 cursor-pointer"
            >
              <span>Értékelés Írása Google-ön</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}
      </main>

      {/* Lábléc */}
      <footer className="border-t border-[var(--border-color)] bg-[var(--bg-surface)] py-4 text-center text-xs text-[var(--text-muted)]">
        <p>© 2026 {tenant.name} • Ügyfélkapcsolat: {tenant.phone}</p>
        <p className="text-[10px] mt-1 text-[var(--text-muted)] opacity-60">Powered by CleanFlow CRM</p>
      </footer>
    </div>
  );
}
