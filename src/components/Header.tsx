"use client";

import React from "react";
import { Search, Plus, Bell, User } from "lucide-react";
import Link from "next/link";

interface HeaderProps {
  title?: string;
  subtitle?: string;
  onNewJobClick?: () => void;
}

export function Header({ title, subtitle, onNewJobClick }: HeaderProps) {
  return (
    <header className="px-6 py-4 border-b border-[var(--border-color)] bg-[var(--bg-surface)] flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-30">
      <div>
        {title && <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">{title}</h1>}
        {subtitle && <p className="text-xs text-[var(--text-muted)] mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {/* Keresőmező */}
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Keresés (név, cím, kód)..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)]/60 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>

        {/* Gyors gombok */}
        <Link
          href="/dashboard/calculator"
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border-color)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
        >
          Kalkulátor
        </Link>

        <Link
          href="/dashboard/jobs?new=true"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm shadow-blue-500/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Új Munka</span>
        </Link>

        {/* Értesítés & Felhasználó */}
        <div className="flex items-center gap-2 pl-2 border-l border-[var(--border-color)]">
          <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 border border-[var(--border-color)] flex items-center justify-center text-slate-700 dark:text-slate-300 font-semibold text-xs">
            NZ
          </div>
        </div>
      </div>
    </header>
  );
}
