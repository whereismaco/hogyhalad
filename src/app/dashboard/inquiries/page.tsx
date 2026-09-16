"use client";

import React, { useState } from "react";
import { Header } from "@/components/Header";
import { initialInquiries, rugPriceCatalog, extrasCatalog } from "@/lib/mockData";
import { Inquiry } from "@/types/crm";
import {
  Inbox,
  Sparkles,
  Send,
  ArrowRight,
  Calculator,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  Phone,
  Mail,
  MapPin,
  Calendar,
} from "lucide-react";

export default function InquiriesPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>(initialInquiries);
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry>(initialInquiries[0]);
  const [activeTab, setActiveTab] = useState<"ai" | "calculator">("ai");

  // Kalkulátor állapot a jobb oldali panelhez
  const [calcWidth, setCalcWidth] = useState<number>(2.0);
  const [calcLength, setCalcLength] = useState<number>(3.0);
  const [selectedRugType, setSelectedRugType] = useState(rugPriceCatalog[1]); // Shaggy
  const [isHeavySoiling, setIsHeavySoiling] = useState(true);
  const [selectedExtras, setSelectedExtras] = useState<string[]>(["e-3"]); // Atka

  // Számítások
  const area = Math.round(calcWidth * calcLength * 100) / 100;
  const basePrice = Math.round(area * selectedRugType.unitPrice);
  const heavySoilingCost = isHeavySoiling ? Math.round(area * 800) : 0;
  const extrasCost = selectedExtras.reduce((acc, exId) => {
    const found = extrasCatalog.find((e) => e.id === exId);
    return acc + (found ? (found.unit.includes("m²") ? Math.round(area * found.unitPrice) : found.unitPrice) : 0);
  }, 0);
  const calculatedTotal = basePrice + heavySoilingCost + extrasCost;

  const handleConvertJob = () => {
    alert(
      `A megkeresés sikeresen munkává alakítva! Kód: CF-2026-0049. A munka átkerült a 'Felvételre vár' státuszba.`
    );
    setInquiries((prev) =>
      prev.map((i) => (i.id === selectedInquiry.id ? { ...i, status: "CONVERTED" } : i))
    );
  };

  const handleSendDraft = () => {
    alert("Válaszlevél elküldve a megrendelőnek a megadott email címre!");
    setInquiries((prev) =>
      prev.map((i) => (i.id === selectedInquiry.id ? { ...i, status: "OFFER_SENT" } : i))
    );
  };

  return (
    <div>
      <Header
        title="Megkeresések & Ajánlatkérések"
        subtitle="Beérkező leadek, AI méretkinyerés és beépített szőnyegkalkulátor"
      />

      <div className="p-6 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Bal oszlop: Érdeklődések Listája (5 oszlop) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
              Beérkezett Megkeresések ({inquiries.length})
            </span>
            <span className="text-xs text-blue-600 font-semibold">Weboldal & Email</span>
          </div>

          <div className="space-y-3">
            {inquiries.map((inq) => {
              const isSelected = selectedInquiry.id === inq.id;
              return (
                <div
                  key={inq.id}
                  onClick={() => setSelectedInquiry(inq)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2.5 ${
                    isSelected
                      ? "bg-blue-50/50 dark:bg-blue-950/30 border-blue-500 shadow-sm"
                      : "bg-[var(--bg-surface)] border-[var(--border-color)] hover:border-slate-300 dark:hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-[var(--text-primary)]">
                        {inq.customerName}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {inq.source === "WEB_WIDGET" ? "Web Widget" : "Email"}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        inq.status === "NEW"
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                          : inq.status === "OFFER_SENT"
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                          : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                      }`}
                    >
                      {inq.status === "NEW" ? "Új Lead" : inq.status === "OFFER_SENT" ? "Ajánlat Kiküldve" : "Munkává Alakítva"}
                    </span>
                  </div>

                  <p className="text-xs text-[var(--text-secondary)] line-clamp-2">
                    {inq.customerNotes}
                  </p>

                  <div className="pt-2 border-t border-[var(--border-color)] flex items-center justify-between text-xs text-[var(--text-muted)]">
                    <span className="flex items-center gap-1 font-mono">
                      <Clock className="w-3.5 h-3.5" />
                      {inq.createdAt}
                    </span>
                    <span className="font-bold text-[var(--text-primary)]">
                      {inq.estimatedAmount ? `${inq.estimatedAmount.toLocaleString("hu-HU")} Ft` : "Becslésre vár"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Jobb oszlop: Kiválasztott Megkeresés Részletei + AI & Kalkulátor (7 oszlop) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Felső információs kártya */}
          <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-color)] pb-3">
              <div>
                <h2 className="text-base font-bold text-[var(--text-primary)]">
                  {selectedInquiry.customerName}
                </h2>
                <p className="text-xs text-[var(--text-muted)]">
                  Megkeresés forrása: {selectedInquiry.source} • Érkezett: {selectedInquiry.createdAt}
                </p>
              </div>

              {selectedInquiry.status !== "CONVERTED" ? (
                <button
                  onClick={handleConvertJob}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm shadow-blue-500/20 cursor-pointer transition-all shrink-0"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Munkává Alakítás (1 kattintás)</span>
                </button>
              ) : (
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Sikeresen konvertálva</span>
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                <a href={`tel:${selectedInquiry.customerPhone}`} className="hover:underline font-semibold">
                  {selectedInquiry.customerPhone}
                </a>
              </div>
              {selectedInquiry.customerEmail && (
                <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                  <Mail className="w-4 h-4 text-blue-600 shrink-0" />
                  <a href={`mailto:${selectedInquiry.customerEmail}`} className="hover:underline">
                    {selectedInquiry.customerEmail}
                  </a>
                </div>
              )}
              <div className="flex items-center gap-2 text-[var(--text-secondary)] sm:col-span-2">
                <MapPin className="w-4 h-4 text-red-500 shrink-0" />
                <span>{selectedInquiry.customerAddress}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[var(--bg-subtle)] text-xs">
              <span className="font-bold text-[var(--text-secondary)] block mb-1">Ügyfél üzenete / igénye:</span>
              <p className="text-[var(--text-primary)] leading-relaxed italic">
                &quot;{selectedInquiry.customerNotes}&quot;
              </p>
            </div>
          </div>

          {/* Váltófül: AI Asszisztens vs. Szőnyegkalkulátor */}
          <div className="flex items-center gap-2 border-b border-[var(--border-color)] pb-2">
            <button
              onClick={() => setActiveTab("ai")}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "ai"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-color)] hover:bg-[var(--bg-subtle)]"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Elemzés & Választervezet (1 kredit)</span>
            </button>

            <button
              onClick={() => setActiveTab("calculator")}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "calculator"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-color)] hover:bg-[var(--bg-subtle)]"
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Kalkulátor & Pontos Árazás</span>
            </button>
          </div>

          {/* TAB 1: AI Asszisztens */}
          {activeTab === "ai" && (
            <div className="space-y-4">
              {selectedInquiry.aiSummary && (
                <div className="p-4 rounded-2xl bg-purple-50/70 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/50 space-y-2">
                  <div className="flex items-center gap-2 text-purple-900 dark:text-purple-200 font-bold text-xs">
                    <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span>AI Méret- és Foltelemzés (Zéró hallucináció):</span>
                  </div>
                  <p className="text-xs text-purple-950 dark:text-purple-100 leading-relaxed">
                    {selectedInquiry.aiSummary}
                  </p>
                </div>
              )}

              {selectedInquiry.aiDraftReply && (
                <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-xs space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[var(--text-primary)]">
                      Generált Ajánlatkísérő Válaszlevél
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)]">Szerkeszthető tervezet</span>
                  </div>

                  <textarea
                    rows={7}
                    defaultValue={selectedInquiry.aiDraftReply}
                    className="w-full p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] text-[var(--text-primary)] leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 font-sans"
                  />

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[11px] text-[var(--text-muted)]">
                      Költség: 1 AI Kredit levonva
                    </span>

                    <button
                      onClick={handleSendDraft}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold cursor-pointer transition-colors shadow-sm"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Válaszlevél Jóváhagyása & Küldése</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Szőnyegkalkulátor */}
          {activeTab === "calculator" && (
            <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-xs space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-[var(--text-secondary)]">Szélesség (méter)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.5"
                    max="10"
                    value={calcWidth}
                    onChange={(e) => setCalcWidth(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] text-[var(--text-primary)] font-bold text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[var(--text-secondary)]">Hosszúság (méter)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.5"
                    max="15"
                    value={calcLength}
                    onChange={(e) => setCalcLength(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] text-[var(--text-primary)] font-bold text-sm"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 flex items-center justify-between">
                <span className="text-blue-900 dark:text-blue-200 font-medium">Kalkulált felület:</span>
                <span className="font-black text-sm text-blue-700 dark:text-blue-300">{area} m²</span>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[var(--text-secondary)]">Szőnyeg Típus / Anyag</label>
                <select
                  value={selectedRugType.id}
                  onChange={(e) => {
                    const found = rugPriceCatalog.find((r) => r.id === e.target.value);
                    if (found) setSelectedRugType(found);
                  }}
                  className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] text-[var(--text-primary)] font-semibold"
                >
                  {rugPriceCatalog.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} — {r.unitPrice} {r.unit}
                    </option>
                  ))}
                </select>
              </div>

              {/* Szennyezettségi felár kapcsoló */}
              <div className="p-3 rounded-xl border border-[var(--border-color)] flex items-center justify-between">
                <div>
                  <span className="font-bold text-[var(--text-primary)] block">Erős szennyezettségi felár</span>
                  <span className="text-[11px] text-[var(--text-muted)]">+800 Ft / m² mélymosási díj</span>
                </div>
                <input
                  type="checkbox"
                  checked={isHeavySoiling}
                  onChange={(e) => setIsHeavySoiling(e.target.checked)}
                  className="w-5 h-5 rounded text-blue-600 accent-blue-600 cursor-pointer"
                />
              </div>

              {/* Extra kezelések */}
              <div className="space-y-2">
                <span className="font-bold text-[var(--text-secondary)] block">Választható Extrák:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {extrasCatalog.slice(1).map((ex) => {
                    const isChecked = selectedExtras.includes(ex.id);
                    return (
                      <label
                        key={ex.id}
                        className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-colors ${
                          isChecked
                            ? "bg-blue-50/60 dark:bg-blue-950/30 border-blue-400"
                            : "bg-[var(--bg-subtle)] border-[var(--border-color)]"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedExtras([...selectedExtras, ex.id]);
                            } else {
                              setSelectedExtras(selectedExtras.filter((id) => id !== ex.id));
                            }
                          }}
                          className="w-4 h-4 accent-blue-600"
                        />
                        <div className="truncate">
                          <span className="font-semibold block text-[11px] truncate">{ex.name}</span>
                          <span className="text-[10px] text-[var(--text-muted)]">+{ex.unitPrice} {ex.unit}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Kalkuláció Végösszeg */}
              <div className="pt-3 border-t border-[var(--border-color)] flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[var(--text-muted)]">
                    Kalkulált Ajánlati Ár:
                  </span>
                  <p className="text-xl font-black text-blue-600 dark:text-blue-400">
                    {calculatedTotal.toLocaleString("hu-HU")} Ft
                  </p>
                </div>

                <button
                  onClick={() => alert(`Ár hozzáadva a megkereséshez: ${calculatedTotal.toLocaleString("hu-HU")} Ft`)}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer"
                >
                  Ár Alkalmazása
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
