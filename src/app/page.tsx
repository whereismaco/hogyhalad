"use client";

import React from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Layers,
  Sparkles,
  Truck,
  CheckCircle2,
  Calculator,
  ShieldCheck,
  ArrowRight,
  ExternalLink,
  Bot,
  Star,
  Zap,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] flex flex-col font-sans transition-colors duration-200 selection:bg-blue-500/20 selection:text-blue-600">
      {/* SaaS Fejléc */}
      <header className="border-b border-[var(--border-color)] bg-[var(--bg-surface)]/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-black shadow-md shadow-blue-500/20">
              CF
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-lg tracking-tight text-[var(--text-primary)]">CleanFlow</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60">
                  SaaS
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              <span>Vezérlőpult Megnyitása</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Fő Hero Szekció */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-12 lg:py-20 space-y-16">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Dedikált SaaS szőnyegtisztító & szolgáltató cégeknek</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-[var(--text-primary)] leading-tight">
            A komplett vállalatirányítás szőnyegtisztítóknak.
          </h1>

          <p className="text-base sm:text-lg text-[var(--text-secondary)] leading-relaxed font-normal">
            Árajánlatkészítés másodpercek alatt négyzetméter alapon, sofőr navigáció a helyszínen, érintőképernyős digitális elismervény, és tokenes élő ügyfélkövetés egyetlen modern rendszerben.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href="/dashboard"
              className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-500/25 transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>Belépés a CRM-be (Demo)</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/track/trk-b7e1f489"
              target="_blank"
              className="px-5 py-3 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] text-xs font-bold text-[var(--text-primary)] transition-all flex items-center gap-2"
            >
              <span>Ügyfélkövető Portál Tesztelése</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>

            <Link
              href="/widget/kristaly-szonyeg"
              target="_blank"
              className="px-5 py-3 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] text-xs font-bold text-[var(--text-primary)] transition-all flex items-center gap-2"
            >
              <span>Webes Kalkulátor Widget</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* 6 Kiemelt Funkció Kártya */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* 1. Kalkulátor */}
          <div className="p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-xs space-y-3 hover:border-blue-300 dark:hover:border-blue-800 transition-all">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Calculator className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-[var(--text-primary)]">
              Dinamikus Szőnyegkalkulátor
            </h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Szélesség × hosszúság ($m^2$), anyagtípusok, erős szennyezettségi felárak és választható extra kezelések (atka, ózon, impregnálás).
            </p>
          </div>

          {/* 2. 5 Lépcsős Pipeline */}
          <div className="p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-xs space-y-3 hover:border-blue-300 dark:hover:border-blue-800 transition-all">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-[var(--text-primary)]">
              5 Fő Státusz & Kanban
            </h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Felvételre vár $\rightarrow$ Beérkezett $\rightarrow$ Tisztítás alatt $\rightarrow$ Elkészült $\rightarrow$ Kiszállítva. Nincs elakadt munka és elveszett szőnyeg.
            </p>
          </div>

          {/* 3. Sofőr nézet */}
          <div className="p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-xs space-y-3 hover:border-blue-300 dark:hover:border-blue-800 transition-all">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Truck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-[var(--text-primary)]">
              Sofőr PWA & Útvonal
            </h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Mobilbarát felület a futárnak: napi címek, 1-érintéses Google Maps navigáció és hívásindítás a lépcsőházból.
            </p>
          </div>

          {/* 4. Digitális Aláírás */}
          <div className="p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-xs space-y-3 hover:border-blue-300 dark:hover:border-blue-800 transition-all">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-[var(--text-primary)]">
              Érintőképernyős Aláírás
            </h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              A megrendelő a helyszínen az ujjával aláírja az átvett darabszámot, azonnali digitális elismervény készül fotókkal.
            </p>
          </div>

          {/* 5. Ügyfélkövető Portál */}
          <div className="p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-xs space-y-3 hover:border-blue-300 dark:hover:border-blue-800 transition-all">
            <div className="w-10 h-10 rounded-2xl bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-[var(--text-primary)]">
              Élő Ügyfélkövetés (`/track`)
            </h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Az ügyfél egyedi linken követheti a tisztítási folyamatot. A kiszállítás után automatikus 5 csillagos Google értékelést gyűjt!
            </p>
          </div>

          {/* 6. AI Wallet */}
          <div className="p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-xs space-y-3 hover:border-blue-300 dark:hover:border-blue-800 transition-all">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Bot className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-[var(--text-primary)]">
              Kredit-alapú AI Asszisztens
            </h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              1 kredit $\approx$ 20 Ft alapon működő intelligens segéd: levéltervezők, méretkinyerés az érdeklődésekből és esti vezetői összefoglalók.
            </p>
          </div>
        </div>

        {/* Havidíjas Csomagok Előnézet */}
        <div className="p-8 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-xs space-y-8">
          <div className="text-center space-y-2">
            <span className="text-xs uppercase tracking-wider font-bold text-blue-600">Árazás & Előfizetés</span>
            <h2 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)]">
              Átlátható havidíjak, forgalomhoz igazítva
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Starter */}
            <div className="p-6 rounded-3xl border border-[var(--border-color)] bg-[var(--bg-subtle)]/40 flex flex-col justify-between space-y-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Starter Csomag</span>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-black text-[var(--text-primary)]">29 990 Ft</span>
                  <span className="text-xs text-[var(--text-muted)] font-semibold">/ hó vagy 299 990 Ft / év</span>
                </div>
                <ul className="mt-4 space-y-2 text-xs text-[var(--text-secondary)]">
                  <li>✓ <strong>Max. 200 munka / hó</strong> (300 megkeresés)</li>
                  <li>✓ <strong>1 felhasználói fiók</strong> (Solo vállalkozó)</li>
                  <li>✓ <strong>30 AI Kredit / hó</strong> ajándék bónusz</li>
                  <li>✓ Szőnyegkalkulátor & Sofőr PWA</li>
                  <li>✓ Helyszíni digitális aláírás & PDF bizonylat</li>
                </ul>
              </div>

              <Link
                href="/dashboard"
                className="w-full py-2.5 rounded-xl border border-blue-600 text-blue-600 hover:bg-blue-50 font-bold text-xs text-center transition-colors block"
              >
                Kipróbálás
              </Link>
            </div>

            {/* Business / Flotta */}
            <div className="p-6 rounded-3xl border-2 border-blue-600 bg-blue-50/20 dark:bg-blue-950/20 shadow-lg shadow-blue-500/10 flex flex-col justify-between space-y-4 relative">
              <span className="absolute -top-3 right-6 px-3 py-1 rounded-full bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wider">
                Legnépszerűbb
              </span>

              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Business / Flotta</span>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-black text-[var(--text-primary)]">49 990 Ft</span>
                  <span className="text-xs text-[var(--text-muted)] font-semibold">/ hó vagy 499 990 Ft / év</span>
                </div>
                <ul className="mt-4 space-y-2 text-xs text-[var(--text-secondary)]">
                  <li>✓ <strong>Max. 1 000 munka / hó</strong> (1 500 megkeresés)</li>
                  <li>✓ <strong>5 felhasználói fiók</strong> (Iroda + Sofőrök)</li>
                  <li>✓ <strong>100 AI Kredit / hó</strong> ajándék bónusz</li>
                  <li>✓ Címkiosztás sofőröknek & egyedi nézetek</li>
                  <li>✓ Fejlett, variálható webes kalkulátor widget</li>
                  <li>✓ Számlázz.hu / Billingo integráció</li>
                </ul>
              </div>

              <Link
                href="/dashboard"
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs text-center shadow-md shadow-blue-500/20 transition-all block"
              >
                Flotta Csomag Indítása
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Lábléc */}
      <footer className="border-t border-[var(--border-color)] bg-[var(--bg-surface)] py-8 px-6 text-center text-xs text-[var(--text-muted)]">
        <p className="font-bold text-[var(--text-primary)]">CleanFlow SaaS CRM • 2026</p>
        <p className="mt-1">Kifejezetten szőnyegtisztító és helyszíni szolgáltató vállalkozásokra szabva.</p>
      </footer>
    </div>
  );
}
