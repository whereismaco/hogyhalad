"use client";

import React, { useState } from "react";
import { Header } from "@/components/Header";
import { rugPriceCatalog, extrasCatalog } from "@/lib/mockData";
import { Calculator, Check, Plus, Edit2, ShieldAlert, Sparkles, Layers } from "lucide-react";

export default function CalculatorPage() {
  const [catalog, setCatalog] = useState(rugPriceCatalog);
  const [extras, setExtras] = useState(extrasCatalog);

  // Kalkulátor teszt állapota
  const [width, setWidth] = useState(2.0);
  const [length, setLength] = useState(3.0);
  const [selectedType, setSelectedType] = useState(catalog[0]);
  const [heavyDirt, setHeavyDirt] = useState(false);
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  const [minOrderLimit, setMinOrderLimit] = useState(12000); // 12 000 Ft minimum

  const area = Math.round(width * length * 100) / 100;
  const baseCost = Math.round(area * selectedType.unitPrice);
  const dirtCost = heavyDirt ? Math.round(area * 800) : 0;
  const extrasSum = selectedExtras.reduce((sum, id) => {
    const found = extras.find((e) => e.id === id);
    if (!found) return sum;
    return sum + (found.unit.includes("m²") ? Math.round(area * found.unitPrice) : found.unitPrice);
  }, 0);

  const rawTotal = baseCost + dirtCost + extrasSum;
  const finalTotal = Math.max(rawTotal, minOrderLimit);
  const isMinLimitApplied = rawTotal < minOrderLimit;

  return (
    <div>
      <Header
        title="Szőnyeg Kalkulátor & Céges Árlista"
        subtitle="Dinamikus négyzetméter számítás, felárak és testreszabható szolgáltatás katalógus"
      />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Két oszlop: Élő kalkulátor tesztelő + Céges árlista kezelő */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Bal oszlop: Interaktív Tesztelő Kalkulátor (5 oszlop) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-5 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-[var(--border-color)] pb-3">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                  <Calculator className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-base text-[var(--text-primary)]">
                    Kalkulációs Szimulátor
                  </h2>
                  <p className="text-xs text-[var(--text-muted)]">
                    Azonnali árkalkuláció a beállított szabályok alapján
                  </p>
                </div>
              </div>

              {/* Méretek */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-[var(--text-secondary)]">Szélesség (m)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.5"
                    max="10"
                    value={width}
                    onChange={(e) => setWidth(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] text-[var(--text-primary)] font-bold text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[var(--text-secondary)]">Hosszúság (m)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.5"
                    max="15"
                    value={length}
                    onChange={(e) => setLength(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] text-[var(--text-primary)] font-bold text-sm"
                  />
                </div>
              </div>

              {/* Felület kijelző */}
              <div className="p-3 rounded-2xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 flex items-center justify-between text-xs">
                <span className="text-blue-900 dark:text-blue-200 font-medium">Felület:</span>
                <span className="font-black text-sm text-blue-600 dark:text-blue-400">{area} m²</span>
              </div>

              {/* Szőnyeg Típus */}
              <div className="space-y-1 text-xs">
                <label className="font-bold text-[var(--text-secondary)]">Anyag & Típus</label>
                <select
                  value={selectedType.id}
                  onChange={(e) => {
                    const found = catalog.find((c) => c.id === e.target.value);
                    if (found) setSelectedType(found);
                  }}
                  className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] text-[var(--text-primary)] font-semibold"
                >
                  {catalog.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} — {c.unitPrice.toLocaleString("hu-HU")} {c.unit}
                    </option>
                  ))}
                </select>
              </div>

              {/* Szennyezettség */}
              <div className="p-3 rounded-2xl border border-[var(--border-color)] flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-[var(--text-primary)] block">Erős Szennyezettség Felár</span>
                  <span className="text-[11px] text-[var(--text-muted)]">+800 Ft / m² mélymosási pótdíj</span>
                </div>
                <input
                  type="checkbox"
                  checked={heavyDirt}
                  onChange={(e) => setHeavyDirt(e.target.checked)}
                  className="w-5 h-5 accent-blue-600 cursor-pointer"
                />
              </div>

              {/* Választható Extrák */}
              <div className="space-y-2 text-xs">
                <span className="font-bold text-[var(--text-secondary)] block">Kiegészítő kezelések:</span>
                <div className="space-y-1.5">
                  {extras.slice(1).map((ex) => {
                    const isChecked = selectedExtras.includes(ex.id);
                    return (
                      <label
                        key={ex.id}
                        className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer text-xs transition-colors ${
                          isChecked
                            ? "bg-blue-50/60 dark:bg-blue-950/30 border-blue-400"
                            : "bg-[var(--bg-surface)] border-[var(--border-color)]"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedExtras([...selectedExtras, ex.id]);
                              } else {
                                setSelectedExtras(selectedExtras.filter((i) => i !== ex.id));
                              }
                            }}
                            className="w-4 h-4 accent-blue-600"
                          />
                          <span className="font-semibold text-[var(--text-primary)]">{ex.name}</span>
                        </div>
                        <span className="text-[11px] text-[var(--text-muted)] font-mono">
                          +{ex.unitPrice.toLocaleString("hu-HU")} {ex.unit}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Eredmény Panel */}
              <div className="p-4 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-color)] space-y-2">
                <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
                  <span>Alaptisztítás ({area} m²):</span>
                  <span>{baseCost.toLocaleString("hu-HU")} Ft</span>
                </div>

                {heavyDirt && (
                  <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
                    <span>Mélytisztítási felár:</span>
                    <span>+{dirtCost.toLocaleString("hu-HU")} Ft</span>
                  </div>
                )}

                {extrasSum > 0 && (
                  <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
                    <span>Kiegészítő kezelések:</span>
                    <span>+{extrasSum.toLocaleString("hu-HU")} Ft</span>
                  </div>
                )}

                {isMinLimitApplied && (
                  <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-[11px] flex items-center gap-1.5 border border-amber-200 dark:border-amber-800">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>Minimum rendelési díj érvényesítve ({minOrderLimit.toLocaleString("hu-HU")} Ft).</span>
                  </div>
                )}

                <div className="pt-2 border-t border-[var(--border-color)] flex items-baseline justify-between">
                  <span className="font-bold text-xs uppercase tracking-wider text-[var(--text-muted)]">
                    Számított Ár:
                  </span>
                  <span className="font-black text-2xl text-blue-600 dark:text-blue-400">
                    {finalTotal.toLocaleString("hu-HU")} Ft
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Jobb oszlop: Céges Árlista Konfiguráció (7 oszlop) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="p-5 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
                <div>
                  <h3 className="font-bold text-base text-[var(--text-primary)]">
                    Szőnyegtípusok & Alapárak (Ft / m²)
                  </h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    Ezekből az árakból számol a webes kalkulátor widget és az AI ajánlattevő
                  </p>
                </div>

                <button
                  onClick={() => alert("Új szőnyegtípus felvétele.")}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Új Típus</span>
                </button>
              </div>

              <div className="space-y-2 text-xs">
                {catalog.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] flex items-center justify-between hover:border-blue-300 dark:hover:border-blue-800 transition-colors"
                  >
                    <div>
                      <span className="font-bold text-sm text-[var(--text-primary)] block">
                        {item.name}
                      </span>
                      <span className="text-[11px] text-[var(--text-muted)]">{item.description}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-extrabold text-sm text-[var(--text-primary)] font-mono">
                        {item.unitPrice.toLocaleString("hu-HU")} {item.unit}
                      </span>
                      <button
                        onClick={() => alert(`Ár szerkesztése: ${item.name}`)}
                        className="p-1.5 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                        title="Szerkesztés"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Extrák és Felárak listája */}
            <div className="p-5 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
                <div>
                  <h3 className="font-bold text-base text-[var(--text-primary)]">
                    Kiegészítő Kezelések & Szennyezettségi Felárak
                  </h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    Fix vagy m² alapon felszámított opcionális szolgáltatások
                  </p>
                </div>

                <button
                  onClick={() => alert("Új extra szolgáltatás hozzáadása.")}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[var(--border-color)] hover:bg-[var(--bg-subtle)] text-xs font-bold text-[var(--text-primary)]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Új Extra</span>
                </button>
              </div>

              <div className="space-y-2 text-xs">
                {extras.map((ex) => (
                  <div
                    key={ex.id}
                    className="p-3 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold text-[var(--text-primary)] block">{ex.name}</span>
                      <span className="text-[11px] text-[var(--text-muted)]">{ex.description}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-bold text-xs text-[var(--text-primary)] font-mono">
                        {ex.unitPrice.toLocaleString("hu-HU")} {ex.unit}
                      </span>
                      <button
                        onClick={() => alert(`Extra szerkesztése: ${ex.name}`)}
                        className="p-1.5 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                        title="Szerkesztés"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
