"use client";

import React, { useState } from "react";
import { Header } from "@/components/Header";
import { initialJobs, initialInquiries, initialTenantSettings } from "@/lib/mockData";
import { Job, JobStatus } from "@/types/crm";
import {
  TrendingUp,
  Clock,
  CheckCircle2,
  Truck,
  MapPin,
  ExternalLink,
  ChevronRight,
  AlertCircle,
  Sparkles,
  Phone,
  Layers,
  ArrowUpRight,
} from "lucide-react";
import Link from "next/link";

const statusLabels: Record<JobStatus, { label: string; class: string }> = {
  WAITING_PICKUP: { label: "Felvételre vár", class: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800" },
  RECEIVED: { label: "Beérkezett", class: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800" },
  IN_PROGRESS: { label: "Tisztítás alatt", class: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800" },
  COMPLETED: { label: "Elkészült", class: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800" },
  DELIVERED: { label: "Kiszállítva", class: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700" },
  ARCHIVED: { label: "Archivált", class: "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700" },
};

export default function DashboardOverviewPage() {
  const [jobs, setJobs] = useState<Job[]>(initialJobs);
  const tenant = initialTenantSettings;

  // Statisztikák számítása
  const activeJobs = jobs.filter((j) => j.status !== "DELIVERED" && j.status !== "ARCHIVED");
  const completedJobs = jobs.filter((j) => j.status === "COMPLETED");
  const waitingPickup = jobs.filter((j) => j.status === "WAITING_PICKUP");
  const totalRevenue = jobs.reduce((sum, j) => sum + j.totalAmount, 0);

  // Mai szállítások (Felvétel vagy Kiszállítás)
  const todaysDeliveries = jobs.filter(
    (j) => j.status === "WAITING_PICKUP" || j.status === "COMPLETED"
  );

  return (
    <div>
      <Header
        title="Vezérlőpult & Mai Teendők"
        subtitle={`${tenant.name} • ${tenant.plan} Csomag`}
      />

      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Havi Keret Figyelmeztető / Értesítő sáv */}
        <div className="p-4 rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-blue-50/80 dark:from-blue-950/30 dark:via-indigo-950/20 dark:to-blue-950/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-sm shadow-blue-500/30">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-[var(--text-primary)]">
                Havi aktivitás: {tenant.monthlyJobsCount} / {tenant.maxMonthlyJobs} munka felhasználva
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                A 29 990 Ft-os Starter csomagodból még 152 munka rögzíthető ebben a hónapban.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/settings"
            className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline shrink-0"
          >
            <span>Csomag kezelése</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* 4 Fő Statisztikai Kártya */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Aktív Munkák</span>
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-black text-[var(--text-primary)]">{activeJobs.length}</span>
              <span className="text-xs text-blue-600 font-semibold">műhelyben / folyamatban</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Mai Felvételre Vár</span>
              <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400">
                <Truck className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-black text-[var(--text-primary)]">{waitingPickup.length}</span>
              <span className="text-xs text-sky-600 font-semibold">cím ütemezve</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Elkészült (Kiszállításra kész)</span>
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-black text-[var(--text-primary)]">{completedJobs.length}</span>
              <span className="text-xs text-emerald-600 font-semibold">kiszállításra vár</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Heti Forgalom</span>
              <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-black text-[var(--text-primary)]">
                {totalRevenue.toLocaleString("hu-HU")} Ft
              </span>
            </div>
          </div>
        </div>

        {/* Két Oszlop: Mai Szállítások (Sofőrnek) és Új Megkeresések (Irodának) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Bal 2 oszlop: Mai Szállítások Sofőr Gombokkal */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Truck className="w-4 h-4 text-blue-600" />
                  <span>Mai Teendők & Szállítási Lista (Sofőr Nézet)</span>
                </h2>
                <p className="text-xs text-[var(--text-muted)]">
                  Címek, gyors Google Maps útvonaltervezés és helyszíni státuszváltás.
                </p>
              </div>
              <Link
                href="/dashboard/dispatch"
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                <span>Teljes diszpécser nézet</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-3">
              {todaysDeliveries.map((job) => {
                const isPickup = job.status === "WAITING_PICKUP";
                const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  `${job.customerCity}, ${job.customerAddress}`
                )}`;

                return (
                  <div
                    key={job.id}
                    className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-blue-300 dark:hover:border-blue-800"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          isPickup
                            ? "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300"
                            : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                        }`}
                      >
                        {isPickup ? <Truck className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-[var(--text-primary)]">
                            {job.customerName}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              statusLabels[job.status].class
                            }`}
                          >
                            {statusLabels[job.status].label}
                          </span>
                          <span className="text-[11px] text-[var(--text-muted)] font-mono">
                            {job.jobCode}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 text-xs text-[var(--text-secondary)] mt-1">
                          <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                          <span>{job.customerAddress}, {job.customerCity}</span>
                        </div>

                        {job.customerNotes && (
                          <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 italic">
                            &quot;{job.customerNotes}&quot;
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Műveleti gombok */}
                    <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[var(--border-color)]">
                      <a
                        href={`tel:${job.customerPhone}`}
                        className="p-2 rounded-xl border border-[var(--border-color)] hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)]"
                        title="Hívás indítása"
                      >
                        <Phone className="w-4 h-4 text-emerald-600" />
                      </a>

                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 text-xs font-semibold hover:bg-blue-100 transition-colors"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        <span>Útvonal</span>
                      </a>

                      <Link
                        href={`/dashboard/jobs?id=${job.id}`}
                        className="p-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
                        title="Munkalap megnyitása"
                      >
                        <ArrowUpRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Jobb 1 oszlop: Új Érdeklődések (Leadek) AI Előnézettel */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span>Új Érdeklődések (Leadek)</span>
              </h2>
              <Link
                href="/dashboard/inquiries"
                className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline"
              >
                Összes (2)
              </Link>
            </div>

            <div className="space-y-3">
              {initialInquiries.map((inq) => (
                <div
                  key={inq.id}
                  className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-bold text-sm text-[var(--text-primary)]">{inq.customerName}</p>
                      <p className="text-xs text-[var(--text-muted)]">{inq.customerPhone}</p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
                      {inq.source === "WEB_WIDGET" ? "Weboldal Widget" : "Email"}
                    </span>
                  </div>

                  <p className="text-xs text-[var(--text-secondary)] line-clamp-2">
                    {inq.customerNotes}
                  </p>

                  {/* AI Elemzés kártya */}
                  {inq.aiSummary && (
                    <div className="p-2.5 rounded-xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-900/40 text-[11px] text-purple-900 dark:text-purple-200">
                      <div className="flex items-center gap-1 font-semibold text-purple-700 dark:text-purple-300 mb-1">
                        <Sparkles className="w-3 h-3" />
                        <span>AI Tétel-kinyerés:</span>
                      </div>
                      <p className="text-[11px] leading-relaxed">{inq.aiSummary}</p>
                    </div>
                  )}

                  <div className="pt-2 border-t border-[var(--border-color)] flex items-center justify-between">
                    <span className="text-xs font-bold text-[var(--text-primary)]">
                      {inq.estimatedAmount ? `${inq.estimatedAmount.toLocaleString("hu-HU")} Ft` : "Kalkulációra vár"}
                    </span>

                    <Link
                      href="/dashboard/inquiries"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors"
                    >
                      <span>Kezelés</span>
                      <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
