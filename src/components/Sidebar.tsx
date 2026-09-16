"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Layers,
  Inbox,
  Truck,
  Calculator,
  Sparkles,
  Settings,
  ExternalLink,
  Menu,
  X,
  Building2,
  ChevronRight,
} from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { initialTenantSettings } from "@/lib/mockData";

const navItems = [
  { name: "Áttekintés", href: "/dashboard", icon: LayoutDashboard },
  { name: "Munkák & Pipeline", href: "/dashboard/jobs", icon: Layers, badge: "5" },
  { name: "Megkeresések", href: "/dashboard/inquiries", icon: Inbox, badge: "Új (2)" },
  { name: "Mai Szállítások (Sofőr)", href: "/dashboard/dispatch", icon: Truck, highlight: true },
  { name: "Szőnyeg Kalkulátor", href: "/dashboard/calculator", icon: Calculator },
  { name: "AI Asszisztens & Wallet", href: "/dashboard/ai", icon: Sparkles, badge: "28 kr" },
  { name: "Beállítások", href: "/dashboard/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const tenant = initialTenantSettings;

  const usagePercent = Math.round((tenant.monthlyJobsCount / tenant.maxMonthlyJobs) * 100);

  return (
    <>
      {/* Mobil Header Bar */}
      <div className="lg:hidden flex items-center justify-between p-4 border-b border-[var(--border-color)] bg-[var(--bg-surface)] sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shadow-sm">
            CF
          </div>
          <div>
            <span className="font-bold tracking-tight text-slate-900 dark:text-white">CleanFlow</span>
            <span className="text-[10px] ml-1 px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-semibold">CRM</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-lg border border-[var(--border-color)] text-[var(--text-secondary)]"
            aria-label="Menü megnyitása"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Háttér overlay mobilon */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-xs"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Oldalsáv (Desktop & Mobil Drawer) */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-[var(--bg-surface)] border-r border-[var(--border-color)] flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logó & Fejléc */}
        <div className="p-5 border-b border-[var(--border-color)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-black shadow-md shadow-blue-500/20 text-lg">
              CF
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-lg tracking-tight text-[var(--text-primary)]">CleanFlow</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60">
                  SaaS
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)] font-medium">Szőnyeg & Szolgáltató CRM</p>
            </div>
          </div>
          <div className="hidden lg:block">
            <ThemeToggle />
          </div>
        </div>

        {/* Aktív Bérlő (Tenant) Kártya & Csomag Statisztika */}
        <div className="p-4 border-b border-[var(--border-color)] bg-[var(--bg-subtle)]/40">
          <div className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-xs">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <Building2 className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <p className="text-xs font-semibold text-[var(--text-primary)] truncate" title={tenant.name}>
                    {tenant.name}
                  </p>
                  <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">
                    {tenant.plan} Csomag
                  </span>
                </div>
              </div>
            </div>

            {/* Havi munka kvóta csík */}
            <div>
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="text-[var(--text-muted)]">Havi munka keret</span>
                <span className="font-semibold text-[var(--text-primary)]">
                  {tenant.monthlyJobsCount} / {tenant.maxMonthlyJobs}
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    usagePercent > 80 ? "bg-amber-500" : "bg-blue-600"
                  }`}
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Navigációs Linkek */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer group ${
                  isActive
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                      isActive ? "text-white" : item.highlight ? "text-amber-500" : "text-[var(--text-muted)]"
                    }`}
                  />
                  <span>{item.name}</span>
                </div>

                {item.badge && (
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      isActive
                        ? "bg-white/20 text-white"
                        : item.badge.includes("kr")
                        ? "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
                        : "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Alsó Widget & Publikus linkek */}
        <div className="p-3 border-t border-[var(--border-color)] space-y-2">
          {/* AI Wallet gyorslink */}
          <Link
            href="/dashboard/ai"
            className="flex items-center justify-between p-2.5 rounded-xl border border-purple-200 dark:border-purple-900/50 bg-purple-50/50 dark:bg-purple-950/20 text-purple-900 dark:text-purple-200 hover:bg-purple-100/50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span className="text-xs font-semibold">AI Kredit Egyenleg</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs font-bold text-purple-700 dark:text-purple-300">{tenant.aiCredits} kredit</span>
              <ChevronRight className="w-3.5 h-3.5 text-purple-500" />
            </div>
          </Link>

          {/* Publikus Ügyfélkövető teszt link */}
          <Link
            href="/track/trk-b7e1f489"
            target="_blank"
            className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer border border-transparent hover:border-[var(--border-color)]"
          >
            <span className="truncate">Ügyfélkövető nézet (Teszt)</span>
            <ExternalLink className="w-3.5 h-3.5 shrink-0 ml-1" />
          </Link>
        </div>
      </aside>
    </>
  );
}
