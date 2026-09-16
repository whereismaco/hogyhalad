"use client";

import React, { useState } from "react";
import { Header } from "@/components/Header";
import { initialJobs } from "@/lib/mockData";
import { Job, JobStatus, RugItem, PickupMode } from "@/types/crm";
import {
  Layers,
  LayoutGrid,
  List,
  Plus,
  ArrowRight,
  CheckCircle2,
  Clock,
  Truck,
  ExternalLink,
  Copy,
  Check,
  X,
  Phone,
  MapPin,
  FileText,
  DollarSign,
  QrCode,
  Tag,
} from "lucide-react";
import Link from "next/link";

const columns: { id: JobStatus; title: string; color: string }[] = [
  { id: "WAITING_PICKUP", title: "1. Felvételre vár", color: "border-sky-500 text-sky-700 dark:text-sky-400 bg-sky-50/50 dark:bg-sky-950/20" },
  { id: "RECEIVED", title: "2. Beérkezett", color: "border-amber-500 text-amber-700 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/20" },
  { id: "IN_PROGRESS", title: "3. Tisztítás alatt", color: "border-purple-500 text-purple-700 dark:text-purple-400 bg-purple-50/50 dark:bg-purple-950/20" },
  { id: "COMPLETED", title: "4. Elkészült", color: "border-emerald-500 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20" },
  { id: "DELIVERED", title: "5. Kiszállítva", color: "border-slate-400 text-slate-700 dark:text-slate-400 bg-slate-100/50 dark:bg-slate-900/40" },
];

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>(initialJobs);
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);
  const [newJobModalOpen, setNewJobModalOpen] = useState(false);

  // Új munka form állapot
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newCustomerAddress, setNewCustomerAddress] = useState("");
  const [newPickupMode, setNewPickupMode] = useState<PickupMode>("QUICK_COUNT");
  const [newRugCount, setNewRugCount] = useState(2);

  // Státusz léptetése
  const handleNextStatus = (jobId: string, currentStatus: JobStatus) => {
    const statusOrder: JobStatus[] = [
      "WAITING_PICKUP",
      "RECEIVED",
      "IN_PROGRESS",
      "COMPLETED",
      "DELIVERED",
    ];
    const currentIndex = statusOrder.indexOf(currentStatus);
    if (currentIndex < statusOrder.length - 1) {
      const nextStatus = statusOrder[currentIndex + 1];
      setJobs((prev) =>
        prev.map((j) => (j.id === jobId ? { ...j, status: nextStatus } : j))
      );
      if (selectedJob && selectedJob.id === jobId) {
        setSelectedJob((prev) => (prev ? { ...prev, status: nextStatus } : null));
      }
    }
  };

  const handleCopyTrackingLink = (token: string) => {
    const url = `${window.location.origin}/track/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const handleCreateJob = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName || !newCustomerPhone || !newCustomerAddress) return;

    const newCode = `CF-2026-00${jobs.length + 49}`;
    const newJob: Job = {
      id: `job-${Date.now()}`,
      jobCode: newCode,
      status: "WAITING_PICKUP",
      pickupMode: newPickupMode,
      quickRugCount: newPickupMode === "QUICK_COUNT" ? newRugCount : 0,
      customerId: `cust-${Date.now()}`,
      customerName: newCustomerName,
      customerPhone: newCustomerPhone,
      customerAddress: newCustomerAddress,
      customerCity: "Budapest",
      scheduledPickup: "Holnap 10:00",
      assignedDriver: "Nagy Zoltán (1-es furgon)",
      items: [],
      totalAmount: 0,
      paymentMethod: "CASH",
      paymentStatus: "PENDING",
      trackingToken: `trk-${Math.random().toString(36).substring(2, 10)}`,
      createdAt: new Date().toISOString().slice(0, 16).replace("T", " "),
    };

    setJobs([newJob, ...jobs]);
    setNewJobModalOpen(false);
    // Reset form
    setNewCustomerName("");
    setNewCustomerPhone("");
    setNewCustomerAddress("");
  };

  return (
    <div>
      <Header
        title="Munkák Kezelése & Folyamatok"
        subtitle="5 lépcsős munkafolyamat, Kanban tábla és részletes munkalapok"
      />

      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Felső vezérlősáv */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode("kanban")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                viewMode === "kanban"
                  ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                  : "bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-color)] hover:bg-[var(--bg-subtle)]"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Kanban Tábla</span>
            </button>

            <button
              onClick={() => setViewMode("table")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                viewMode === "table"
                  ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                  : "bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-color)] hover:bg-[var(--bg-subtle)]"
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Táblázat Nézet</span>
            </button>
          </div>

          <button
            onClick={() => setNewJobModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm shadow-blue-500/20 cursor-pointer transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Új Munka Felvétele</span>
          </button>
        </div>

        {/* KANBAN TÁBLA NÉZET */}
        {viewMode === "kanban" && (
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4 overflow-x-auto pb-4">
            {columns.map((col) => {
              const colJobs = jobs.filter((j) => j.status === col.id);
              return (
                <div
                  key={col.id}
                  className="rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-xs flex flex-col min-h-[500px]"
                >
                  {/* Oszlop fejléc */}
                  <div className={`p-3.5 rounded-t-2xl border-b border-[var(--border-color)] flex items-center justify-between ${col.color}`}>
                    <span className="font-bold text-xs uppercase tracking-wider">{col.title}</span>
                    <span className="text-xs font-black px-2 py-0.5 rounded-full bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-color)]">
                      {colJobs.length}
                    </span>
                  </div>

                  {/* Kártyák */}
                  <div className="p-3 space-y-3 flex-1 overflow-y-auto">
                    {colJobs.map((job) => (
                      <div
                        key={job.id}
                        onClick={() => setSelectedJob(job)}
                        className="p-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-xs hover:border-blue-400 dark:hover:border-blue-700 hover:shadow-md transition-all cursor-pointer space-y-2.5 group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                            {job.jobCode}
                          </span>
                          <span className="text-[10px] text-[var(--text-muted)] font-medium">
                            {job.pickupMode === "QUICK_COUNT" ? `${job.quickRugCount} db szőnyeg` : `${job.items.length} tétel`}
                          </span>
                        </div>

                        <div>
                          <p className="font-bold text-sm text-[var(--text-primary)] leading-tight">
                            {job.customerName}
                          </p>
                          <p className="text-xs text-[var(--text-secondary)] mt-0.5 truncate">
                            {job.customerAddress}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-[var(--border-color)] flex items-center justify-between">
                          <span className="text-xs font-extrabold text-[var(--text-primary)]">
                            {job.totalAmount > 0 ? `${job.totalAmount.toLocaleString("hu-HU")} Ft` : "Felmérésre vár"}
                          </span>

                          {col.id !== "DELIVERED" && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleNextStatus(job.id, job.status);
                              }}
                              className="p-1.5 rounded-lg bg-[var(--bg-subtle)] hover:bg-blue-600 hover:text-white text-[var(--text-muted)] transition-colors"
                              title="Léptetés a következő állapotba"
                            >
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}

                    {colJobs.length === 0 && (
                      <div className="h-32 flex items-center justify-center text-xs text-[var(--text-muted)] border border-dashed border-[var(--border-color)] rounded-xl">
                        Nincs elem ebben a fázisban
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TÁBLÁZAT NÉZET */}
        {viewMode === "table" && (
          <div className="rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[var(--bg-subtle)] border-b border-[var(--border-color)] text-[var(--text-muted)] uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="p-4">Kód</th>
                    <th className="p-4">Ügyfél</th>
                    <th className="p-4">Cím</th>
                    <th className="p-4">Állapot</th>
                    <th className="p-4">Tételek</th>
                    <th className="p-4">Összeg</th>
                    <th className="p-4 text-right">Művelet</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {jobs.map((job) => (
                    <tr
                      key={job.id}
                      onClick={() => setSelectedJob(job)}
                      className="hover:bg-[var(--bg-subtle)]/50 transition-colors cursor-pointer"
                    >
                      <td className="p-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                        {job.jobCode}
                      </td>
                      <td className="p-4">
                        <p className="font-bold text-[var(--text-primary)]">{job.customerName}</p>
                        <p className="text-[11px] text-[var(--text-muted)]">{job.customerPhone}</p>
                      </td>
                      <td className="p-4 text-[var(--text-secondary)]">
                        {job.customerAddress}
                      </td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold border bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300">
                          {job.status}
                        </span>
                      </td>
                      <td className="p-4 text-[var(--text-secondary)]">
                        {job.pickupMode === "QUICK_COUNT" ? `${job.quickRugCount} db (Gyors)` : `${job.items.length} db mért tétel`}
                      </td>
                      <td className="p-4 font-bold text-[var(--text-primary)]">
                        {job.totalAmount > 0 ? `${job.totalAmount.toLocaleString("hu-HU")} Ft` : "—"}
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedJob(job);
                          }}
                          className="px-2.5 py-1 rounded-lg border border-[var(--border-color)] hover:bg-blue-50 text-blue-600 font-semibold text-xs"
                        >
                          Megnyitás
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* RÉSZLETES MUNKALAP MODAL */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-3xl max-h-[90vh] bg-[var(--bg-surface)] rounded-3xl border border-[var(--border-color)] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Fejléc */}
            <div className="p-5 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-subtle)]/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold">
                  CF
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-lg text-[var(--text-primary)]">
                      {selectedJob.customerName}
                    </h2>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                      {selectedJob.jobCode}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">
                    Létrehozva: {selectedJob.createdAt} • Sofőr: {selectedJob.assignedDriver || "Nincs kijelölve"}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedJob(null)}
                className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tartalom */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {/* Státusz léptető sáv */}
              <div className="p-4 rounded-2xl bg-[var(--bg-subtle)]/60 border border-[var(--border-color)] flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--text-muted)]">Jelenlegi állapot:</span>
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-600 text-white">
                    {selectedJob.status}
                  </span>
                </div>

                {selectedJob.status !== "DELIVERED" && (
                  <button
                    onClick={() => handleNextStatus(selectedJob.id, selectedJob.status)}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer transition-colors shadow-sm"
                  >
                    <span>Következő állapotba léptetés</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Ügyfél & Cím & Követő Link adatok */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] space-y-2">
                  <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                    Ügyfél & Cím
                  </span>
                  <p className="font-bold text-sm text-[var(--text-primary)]">{selectedJob.customerName}</p>
                  <p className="text-[var(--text-secondary)] flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{selectedJob.customerPhone}</span>
                  </p>
                  <p className="text-[var(--text-secondary)] flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-red-500" />
                    <span>{selectedJob.customerAddress}, {selectedJob.customerCity}</span>
                  </p>
                </div>

                {/* Ügyfélkövető link & Bizonylat doboz */}
                <div className="p-4 rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/40 dark:bg-blue-950/20 space-y-3">
                  <span className="text-[11px] font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider">
                    Publikus Ügyfélkövető Link
                  </span>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    Ezen a linken az ügyfél élőben látja a tisztítás fázisait és a képeket:
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={typeof window !== "undefined" ? `${window.location.origin}/track/${selectedJob.trackingToken}` : ""}
                      className="flex-1 px-3 py-1.5 text-[11px] rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-900 text-[var(--text-primary)] font-mono"
                    />
                    <button
                      onClick={() => handleCopyTrackingLink(selectedJob.trackingToken)}
                      className="p-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer"
                      title="Link másolása"
                    >
                      {copiedToken ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <Link
                      href={`/track/${selectedJob.trackingToken}`}
                      target="_blank"
                      className="p-2 rounded-xl border border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-950"
                      title="Megnyitás új lapon"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>

              {/* Szőnyegek & Tételek Listája */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-[var(--text-primary)]">
                    Felmért Szőnyegek & Tételek ({selectedJob.items.length} db)
                  </h3>
                  <button
                    onClick={() => alert("Tétel felvétele funkció megnyitása.")}
                    className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Új Szőnyeg Hozzáadása</span>
                  </button>
                </div>

                {selectedJob.items.length > 0 ? (
                  <div className="space-y-2">
                    {selectedJob.items.map((item) => (
                      <div
                        key={item.id}
                        className="p-3.5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[var(--text-primary)]">{item.name}</span>
                            {item.tagQrCode && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-[var(--border-color)]">
                                <QrCode className="w-3 h-3 text-blue-600" />
                                <span>{item.tagQrCode}</span>
                              </span>
                            )}
                          </div>

                          <p className="text-[11px] text-[var(--text-muted)]">
                            Méret: {item.width}m × {item.length}m = <strong className="text-[var(--text-secondary)]">{item.area} m²</strong> • Alapár: {item.basePricePerM2} Ft/m²
                          </p>

                          {item.extras.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap pt-1">
                              {item.extras.map((ex, i) => (
                                <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                  + {ex}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="text-right shrink-0">
                          <p className="font-black text-sm text-[var(--text-primary)]">
                            {item.totalPrice.toLocaleString("hu-HU")} Ft
                          </p>
                          <span className="text-[10px] text-emerald-600 font-semibold">Aktív</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 rounded-2xl border border-dashed border-[var(--border-color)] text-center text-[var(--text-muted)]">
                    {selectedJob.pickupMode === "QUICK_COUNT"
                      ? `Átvételkor rögzített gyors darabszám: ${selectedJob.quickRugCount} db szőnyeg. A pontos mérés a műhelyben történik.`
                      : "Még nincsenek rögzített tételek."}
                  </div>
                )}
              </div>

              {/* Végösszeg & Számla Gombok */}
              <div className="p-4 rounded-2xl bg-[var(--bg-subtle)]/80 border border-[var(--border-color)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">
                    Fizetendő Végösszeg
                  </span>
                  <p className="text-xl font-black text-[var(--text-primary)]">
                    {selectedJob.totalAmount > 0 ? `${selectedJob.totalAmount.toLocaleString("hu-HU")} Ft` : "Pontosítás alatt"}
                  </p>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    Fizetési mód: {selectedJob.paymentMethod} • Státusz: {selectedJob.paymentStatus}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => alert(`Számlázz.hu API hívás szimulálása: Számla kiállítva a(z) ${selectedJob.jobCode} munkához!`)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] text-xs font-bold text-[var(--text-primary)] cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                    <span>Számla Kiállítása</span>
                  </button>

                  <button
                    onClick={() => alert("Nyomtatható A4 átvételi elismervény és QR címkék generálása.")}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Címkék & Elismervény</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ÚJ MUNKA MODAL */}
      {newJobModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-[var(--bg-surface)] rounded-3xl border border-[var(--border-color)] shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <h2 className="font-bold text-base text-[var(--text-primary)]">Új Munka Rögzítése</h2>
              <button
                onClick={() => setNewJobModalOpen(false)}
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateJob} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-[var(--text-secondary)]">Ügyfél Neve *</label>
                <input
                  type="text"
                  required
                  placeholder="pl. Kiss János"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] text-[var(--text-primary)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-[var(--text-secondary)]">Telefonszám *</label>
                  <input
                    type="text"
                    required
                    placeholder="+36 30 123 4567"
                    value={newCustomerPhone}
                    onChange={(e) => setNewCustomerPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] text-[var(--text-primary)]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[var(--text-secondary)]">Átvétel Módja</label>
                  <select
                    value={newPickupMode}
                    onChange={(e) => setNewPickupMode(e.target.value as PickupMode)}
                    className="w-full px-3 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] text-[var(--text-primary)]"
                  >
                    <option value="QUICK_COUNT">Gyors darabszámos átvétel</option>
                    <option value="FIELD_MEASURED">Helyszíni mért & kalkulált</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[var(--text-secondary)]">Felvételi Cím *</label>
                <input
                  type="text"
                  required
                  placeholder="pl. 1114 Budapest, Bocskai út 22. 2/8"
                  value={newCustomerAddress}
                  onChange={(e) => setNewCustomerAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] text-[var(--text-primary)]"
                />
              </div>

              {newPickupMode === "QUICK_COUNT" && (
                <div className="space-y-1">
                  <label className="font-bold text-[var(--text-secondary)]">Átvett Szőnyegek Darabszáma</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={newRugCount}
                    onChange={(e) => setNewRugCount(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] text-[var(--text-primary)]"
                  />
                </div>
              )}

              <div className="pt-3 border-t border-[var(--border-color)] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setNewJobModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[var(--border-color)] text-[var(--text-secondary)] font-semibold"
                >
                  Mégse
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold"
                >
                  Munka Létrehozása
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
