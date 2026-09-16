"use client";

import React, { useState, useRef } from "react";
import { Header } from "@/components/Header";
import { initialJobs } from "@/lib/mockData";
import { Job, JobStatus } from "@/types/crm";
import {
  Truck,
  MapPin,
  Phone,
  CheckCircle2,
  PenTool,
  Clock,
  RotateCcw,
  Check,
  X,
  AlertTriangle,
  QrCode,
} from "lucide-react";

export default function DispatchPage() {
  const [jobs, setJobs] = useState<Job[]>(initialJobs);
  const [signingJob, setSigningJob] = useState<Job | null>(null);
  const [signatureSaved, setSignatureSaved] = useState(false);

  // Canvas ref az aláíráshoz
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Csak a mai teendők (Felvételre vár és Elkészült/Kiszállításra vár)
  const todaysJobs = jobs.filter(
    (j) => j.status === "WAITING_PICKUP" || j.status === "COMPLETED"
  );

  // Aláírás canvas kezelés (Egér & Érintőképernyő)
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#0F172A";
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleSaveHandover = () => {
    if (!signingJob) return;
    // Sikeres átvétel / átadás
    const nextStatus: JobStatus = signingJob.status === "WAITING_PICKUP" ? "RECEIVED" : "DELIVERED";
    setJobs((prev) =>
      prev.map((j) => (j.id === signingJob.id ? { ...j, status: nextStatus } : j))
    );
    setSignatureSaved(true);
    setTimeout(() => {
      setSignatureSaved(false);
      setSigningJob(null);
    }, 1500);
  };

  return (
    <div>
      <Header
        title="Mai Szállítások & Sofőr Nézet"
        subtitle="Optimalizált mobilbarát kezelőfelület címre navigálással és digitális aláírással"
      />

      <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-5">
        {/* Sofőr Profil Bar */}
        <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-sm text-[var(--text-primary)]">
                Nagy Zoltán (1-es furgon)
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                Mai feladatok: {todaysJobs.length} cím (1 felvétel, 1 kiszállítás)
              </p>
            </div>
          </div>

          <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            Műszak aktív
          </span>
        </div>

        {/* Napi teendők listája */}
        <div className="space-y-3">
          {todaysJobs.map((job, idx) => {
            const isPickup = job.status === "WAITING_PICKUP";
            const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              `${job.customerCity}, ${job.customerAddress}`
            )}`;

            return (
              <div
                key={job.id}
                className="p-5 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-xs space-y-4 transition-all"
              >
                {/* Fejléc */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold text-xs flex items-center justify-center text-slate-700 dark:text-slate-300">
                      {idx + 1}.
                    </span>
                    <div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border ${
                          isPickup
                            ? "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800"
                        }`}
                      >
                        {isPickup ? "Szőnyeg Felvétel" : "Kiszállítás az Ügyfélnek"}
                      </span>
                      <h3 className="font-bold text-base text-[var(--text-primary)] mt-1">
                        {job.customerName}
                      </h3>
                    </div>
                  </div>

                  <span className="text-xs font-mono font-bold text-[var(--text-muted)]">
                    {job.jobCode}
                  </span>
                </div>

                {/* Cím és megjegyzés */}
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-1.5 text-[var(--text-secondary)] font-medium">
                    <MapPin className="w-4 h-4 text-red-500 shrink-0" />
                    <span>{job.customerAddress}, {job.customerCity}</span>
                  </div>

                  {job.customerNotes && (
                    <p className="text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-2 rounded-xl border border-amber-200 dark:border-amber-900">
                      Megjegyzés: {job.customerNotes}
                    </p>
                  )}
                </div>

                {/* Tétel / darabszám infó */}
                <div className="p-3 rounded-xl bg-[var(--bg-subtle)] flex items-center justify-between text-xs">
                  <span className="text-[var(--text-secondary)]">
                    {isPickup
                      ? `Átveendő: ${job.quickRugCount || "Felmérés helyszínen"} db szőnyeg`
                      : `Átadandó: ${job.items.length} db tisztított szőnyeg`}
                  </span>
                  <span className="font-black text-[var(--text-primary)]">
                    {job.totalAmount > 0 ? `${job.totalAmount.toLocaleString("hu-HU")} Ft` : "Átvétel után"}
                  </span>
                </div>

                {/* Sofőr Műveleti Gombok (Nagy gombok mobilra!) */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[var(--border-color)]">
                  <a
                    href={`tel:${job.customerPhone}`}
                    className="flex flex-col items-center justify-center p-2.5 rounded-2xl border border-[var(--border-color)] hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)] font-semibold text-xs transition-colors"
                  >
                    <Phone className="w-4 h-4 text-emerald-600 mb-1" />
                    <span>Hívás</span>
                  </a>

                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex flex-col items-center justify-center p-2.5 rounded-2xl border border-blue-200 dark:border-blue-900 bg-blue-50/60 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 font-semibold text-xs transition-colors"
                  >
                    <MapPin className="w-4 h-4 text-blue-600 mb-1" />
                    <span>Navigáció</span>
                  </a>

                  <button
                    onClick={() => setSigningJob(job)}
                    className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all shadow-sm cursor-pointer"
                  >
                    <PenTool className="w-4 h-4 mb-1" />
                    <span>{isPickup ? "Átvétel & Aláírás" : "Átadás & Aláírás"}</span>
                  </button>
                </div>
              </div>
            );
          })}

          {todaysJobs.length === 0 && (
            <div className="p-12 rounded-3xl bg-[var(--bg-surface)] border border-dashed border-[var(--border-color)] text-center text-[var(--text-muted)] space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <p className="font-bold text-sm text-[var(--text-primary)]">Minden mai szállítás elvégezve!</p>
              <p className="text-xs">Nincs több nyitott felvétel vagy kiszállítás mára.</p>
            </div>
          )}
        </div>
      </div>

      {/* DIGITÁLIS ALÁÍRÁS & ELISMERVÉNY MODAL */}
      {signingJob && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-[var(--bg-surface)] rounded-3xl border border-[var(--border-color)] shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <div>
                <h3 className="font-bold text-base text-[var(--text-primary)]">
                  {signingJob.status === "WAITING_PICKUP" ? "Átvételi Elismervény" : "Kiszállítási Átadási Bizonylat"}
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  {signingJob.customerName} • {signingJob.jobCode}
                </p>
              </div>

              <button
                onClick={() => setSigningJob(null)}
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Átvételi tételek összefoglalója */}
            <div className="p-3 rounded-2xl bg-[var(--bg-subtle)] text-xs space-y-1">
              <span className="font-bold text-[var(--text-secondary)] block">Átadás-átvétel tárgya:</span>
              <p className="text-[var(--text-primary)]">
                {signingJob.status === "WAITING_PICKUP"
                  ? `Átvéve: ${signingJob.quickRugCount || 1} db szőnyeg tisztításra és elszállításra.`
                  : `Átadva: ${signingJob.items.length || 1} db tiszta szőnyeg. Fizetendő: ${signingJob.totalAmount.toLocaleString("hu-HU")} Ft.`}
              </p>
              <p className="text-[10px] text-[var(--text-muted)]">
                Az aláírással az ügyfél igazolja a tételek darabszámát és az Általános Szerződési Feltételek elfogadását.
              </p>
            </div>

            {/* Aláírási Érintőfelület (Canvas) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                  <PenTool className="w-3.5 h-3.5 text-blue-600" />
                  <span>Ügyfél Aláírása (Érintőképernyőn ujjával):</span>
                </span>
                <button
                  onClick={clearSignature}
                  className="text-xs text-[var(--text-muted)] hover:text-red-500 flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Törlés</span>
                </button>
              </div>

              <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl overflow-hidden bg-white">
                <canvas
                  ref={canvasRef}
                  width={460}
                  height={180}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-44 cursor-crosshair touch-none"
                />
              </div>
            </div>

            {/* Megerősítő gomb */}
            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                onClick={() => setSigningJob(null)}
                className="px-4 py-2.5 rounded-xl border border-[var(--border-color)] text-xs font-semibold text-[var(--text-secondary)]"
              >
                Mégse
              </button>

              <button
                onClick={handleSaveHandover}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 cursor-pointer"
              >
                {signatureSaved ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>Mentve és Leigazolva!</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Átvétel Véglegesítése & Mentés</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
