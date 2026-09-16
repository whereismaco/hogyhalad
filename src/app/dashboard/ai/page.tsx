"use client";

import React, { useState } from "react";
import { Header } from "@/components/Header";
import { initialTenantSettings } from "@/lib/mockData";
import {
  Sparkles,
  CreditCard,
  Zap,
  CheckCircle2,
  FileText,
  Clock,
  ShieldCheck,
  Bot,
  RefreshCw,
} from "lucide-react";

export default function AiWalletPage() {
  const [tenant, setTenant] = useState(initialTenantSettings);
  const [credits, setCredits] = useState(tenant.aiCredits);
  const [autoResponse, setAutoResponse] = useState(tenant.autoAiResponse);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [dailyReport, setDailyReport] = useState<string | null>(null);

  const topupPackages = [
    { credits: 250, price: 5000, label: "Kezdő Feltöltés", bonus: "20 Ft / kredit" },
    { credits: 550, price: 10000, label: "Népszerű Csomag", bonus: "+50 Kredit Ajándék (10% bónusz)", popular: true },
    { credits: 1200, price: 20000, label: "Nagyüzemi Csomag", bonus: "+200 Kredit Ajándék (20% bónusz)" },
  ];

  const handleTopup = (pkgCredits: number, price: number) => {
    alert(`Bankkártyás fizetés (Stripe Checkout szimuláció): ${price.toLocaleString("hu-HU")} Ft kifizetve. +${pkgCredits} kredit jóváírva az egyenlegen!`);
    setCredits((prev) => prev + pkgCredits);
  };

  const handleGenerateDailySummary = () => {
    if (credits < 2) {
      alert("Nincs elegendő AI kredited (min. 2 kredit szükséges)!");
      return;
    }
    setGeneratingReport(true);
    setTimeout(() => {
      setCredits((prev) => prev - 2);
      setDailyReport(
        `📊 NAPI VEZETŐI VEZÉRLŐ RIPORT (2026. Szeptember 15.)\n\n` +
        `• Befejezett és kiszállított munkák: 2 db (Összérték: 72 600 Ft)\n` +
        `• Átvett szőnyegek a mai napon: 5 db (~14.5 m² a mosósoron)\n` +
        `• Sofőr teljesítmény: Nagy Zoltán 100%-ban teljesítette a mai címeket, zéró elakadás.\n` +
        `• Beérkezett új ajánlatkérések: 2 db (összesített becsült potenciál: 80 500 Ft).\n` +
        `• Figyelmeztetés: Dr. Varga Tamás perzsaszőnyege száradási fázisban van, holnap délelőttre ütemezve a szállítás.`
      );
      setGeneratingReport(false);
    }, 1200);
  };

  return (
    <div>
      <Header
        title="AI Asszisztens & AI Wallet"
        subtitle="Kredit-alapú intelligens segéd, levéltervezők, méretkinyerés és vezetői összefoglalók"
      />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Egyenleg & Beállítások Kártya */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Bal: Aktuális Egyenleg */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 text-white shadow-xl shadow-purple-500/20 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-bold tracking-wider opacity-80">
                AI Kredit Egyenleg
              </span>
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>

            <div>
              <span className="text-4xl font-black">{credits}</span>
              <span className="text-sm font-semibold opacity-80 ml-2">felhasználható kredit</span>
            </div>

            <p className="text-xs opacity-85 leading-relaxed">
              A {tenant.plan} csomagodhoz havonta 30 kredit bónusz jár. 1 kredit $\approx$ 20 Ft.
            </p>

            <div className="pt-2 border-t border-white/20 flex items-center justify-between text-xs font-medium">
              <span>Levonás: 1 kredit / levél</span>
              <span className="bg-white/20 px-2 py-0.5 rounded-full">Aktív</span>
            </div>
          </div>

          {/* Jobb 2 oszlop: AI Szabályok & Automatikus küldés kapcsoló */}
          <div className="lg:col-span-2 p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-purple-600" />
                <h2 className="font-bold text-base text-[var(--text-primary)]">
                  AI Működési Mód & Biztonság
                </h2>
              </div>
              <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                <ShieldCheck className="w-4 h-4" />
                <span>Zéró Hallucináció Garancia</span>
              </span>
            </div>

            <div className="p-4 rounded-2xl border border-[var(--border-color)] flex items-center justify-between gap-4">
              <div>
                <p className="font-bold text-xs text-[var(--text-primary)]">
                  Automatikus AI válaszküldés a webes megkeresésekre
                </p>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  Ha be van kapcsolva, a rendszer munkaidőn kívül azonnal kiküldi a kalkulált ajánlatot a vevőnek. Ha kikapcsolva, manuális jóváhagyás szükséges.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setAutoResponse(!autoResponse)}
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                  autoResponse ? "bg-purple-600" : "bg-slate-300 dark:bg-slate-700"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform absolute top-0.5 ${
                    autoResponse ? "left-6.5" : "left-0.5"
                  }`}
                />
              </button>
            </div>

            {/* AI Képességek és Költségek Táblázat */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-[var(--bg-subtle)] space-y-1">
                <span className="font-bold text-[var(--text-primary)] block">Megkeresés Elemzés</span>
                <span className="text-[11px] text-[var(--text-muted)]">Méretek, anyagok kinyerése</span>
                <span className="text-purple-600 font-extrabold block pt-1">1 kredit / művelet</span>
              </div>

              <div className="p-3 rounded-2xl bg-[var(--bg-subtle)] space-y-1">
                <span className="font-bold text-[var(--text-primary)] block">Válaszlevél Tervezet</span>
                <span className="text-[11px] text-[var(--text-muted)]">Udvarias ajánlatkísérő email</span>
                <span className="text-purple-600 font-extrabold block pt-1">1 kredit / művelet</span>
              </div>

              <div className="p-3 rounded-2xl bg-[var(--bg-subtle)] space-y-1">
                <span className="font-bold text-[var(--text-primary)] block">Napi Vezetői Riport</span>
                <span className="text-[11px] text-[var(--text-muted)]">Esti dispatch & bevétel elemzés</span>
                <span className="text-purple-600 font-extrabold block pt-1">2 kredit / riport</span>
              </div>
            </div>
          </div>
        </div>

        {/* Napi Vezetői Riport Generátor Teszt */}
        <div className="p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-base text-[var(--text-primary)] flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <span>Napi Vezetői Összefoglaló (AI Riport)</span>
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                Az AI elemzi az aznapi befejezett munkákat, sofőröket, szállításokat és elakadásokat
              </p>
            </div>

            <button
              onClick={handleGenerateDailySummary}
              disabled={generatingReport}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold shadow-sm shadow-purple-500/20 cursor-pointer transition-all shrink-0"
            >
              {generatingReport ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Elemzés folyamatban...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Riport Generálása (2 kredit)</span>
                </>
              )}
            </button>
          </div>

          {dailyReport && (
            <div className="p-4 rounded-2xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/50 text-xs font-mono whitespace-pre-line text-purple-950 dark:text-purple-100 leading-relaxed animate-in fade-in duration-200">
              {dailyReport}
            </div>
          )}
        </div>

        {/* Kredit Feltöltési Csomagok (Stripe ready) */}
        <div className="space-y-4">
          <div>
            <h3 className="font-bold text-base text-[var(--text-primary)]">
              AI Kredit Feltöltés (1 kredit ≈ 20 Ft)
            </h3>
            <p className="text-xs text-[var(--text-muted)]">
              Biztonságos azonnali bankkártyás feltöltés Stripe fizetéssel
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {topupPackages.map((pkg, i) => (
              <div
                key={i}
                className={`p-6 rounded-3xl bg-[var(--bg-surface)] border transition-all flex flex-col justify-between space-y-4 relative ${
                  pkg.popular
                    ? "border-purple-500 shadow-lg shadow-purple-500/10 ring-2 ring-purple-500/20"
                    : "border-[var(--border-color)] shadow-xs hover:border-purple-300"
                }`}
              >
                {pkg.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-purple-600 text-white text-[10px] font-bold uppercase tracking-wider shadow-sm">
                    Legnépszerűbb
                  </span>
                )}

                <div className="space-y-2">
                  <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                    {pkg.label}
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-[var(--text-primary)]">
                      {pkg.credits}
                    </span>
                    <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                      Kredit
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    {pkg.bonus}
                  </p>
                </div>

                <div className="pt-4 border-t border-[var(--border-color)] flex items-center justify-between">
                  <span className="text-lg font-bold text-[var(--text-primary)]">
                    {pkg.price.toLocaleString("hu-HU")} Ft
                  </span>

                  <button
                    onClick={() => handleTopup(pkg.credits, pkg.price)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Feltöltés</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
