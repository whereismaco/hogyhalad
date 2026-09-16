"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import { rugPriceCatalog, extrasCatalog } from "@/lib/mockData";
import { Calculator, CheckCircle2, Phone, Sparkles, Send } from "lucide-react";

export default function EmbeddableWidgetPage() {
  const params = useParams();
  const slug = params?.slug as string;

  // Kalkuláció állapot
  const [width, setWidth] = useState(2.0);
  const [length, setLength] = useState(3.0);
  const [selectedType, setSelectedType] = useState(rugPriceCatalog[0]);
  const [heavyDirt, setHeavyDirt] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Kapcsolat adatok
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  const area = Math.round(width * length * 100) / 100;
  const basePrice = Math.round(area * selectedType.unitPrice);
  const dirtFee = heavyDirt ? Math.round(area * 800) : 0;
  const total = basePrice + dirtFee;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) return;
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-base)] p-4 flex items-center justify-center font-sans">
      <div className="w-full max-w-md bg-[var(--bg-surface)] rounded-3xl border border-[var(--border-color)] shadow-xl p-5 space-y-4">
        {/* Fejléc */}
        <div className="flex items-center gap-2.5 border-b border-[var(--border-color)] pb-3">
          <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
            CF
          </div>
          <div>
            <h2 className="font-bold text-sm text-[var(--text-primary)]">
              Azonnali Szőnyegtisztítás Árbecslő
            </h2>
            <p className="text-[11px] text-[var(--text-muted)]">
              Kalkuláljon és kérjen díjmentes háztól-házig szállítást!
            </p>
          </div>
        </div>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            {/* Méretválasztó */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="font-bold text-[var(--text-secondary)]">Szélesség (m)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.5"
                  max="10"
                  value={width}
                  onChange={(e) => setWidth(parseFloat(e.target.value) || 0)}
                  className="w-full p-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] text-[var(--text-primary)] font-bold"
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
                  className="w-full p-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] text-[var(--text-primary)] font-bold"
                />
              </div>
            </div>

            {/* Szőnyeg típus */}
            <div className="space-y-1">
              <label className="font-bold text-[var(--text-secondary)]">Szőnyeg Anyaga / Típusa</label>
              <select
                value={selectedType.id}
                onChange={(e) => {
                  const found = rugPriceCatalog.find((r) => r.id === e.target.value);
                  if (found) setSelectedType(found);
                }}
                className="w-full p-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] text-[var(--text-primary)] font-semibold"
              >
                {rugPriceCatalog.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.unitPrice} {r.unit})
                  </option>
                ))}
              </select>
            </div>

            {/* Szennyezettség */}
            <label className="p-2.5 rounded-xl border border-[var(--border-color)] flex items-center justify-between cursor-pointer">
              <span className="font-medium text-[var(--text-primary)]">Erősen szennyezett / foltos</span>
              <input
                type="checkbox"
                checked={heavyDirt}
                onChange={(e) => setHeavyDirt(e.target.checked)}
                className="w-4 h-4 accent-blue-600"
              />
            </label>

            {/* Becsült Ár Kijelző */}
            <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-blue-800 dark:text-blue-300">
                  Becsült Végösszeg ({area} m²):
                </span>
                <p className="text-lg font-black text-blue-600 dark:text-blue-400">
                  {total.toLocaleString("hu-HU")} Ft
                </p>
              </div>
              <span className="text-[10px] text-[var(--text-muted)]">Elszállítással együtt</span>
            </div>

            {/* Elérhetőségek a megrendeléshez */}
            <div className="pt-2 border-t border-[var(--border-color)] space-y-2">
              <span className="font-bold text-[var(--text-primary)] block">Kérjen visszahívást / felvételt:</span>
              <input
                type="text"
                required
                placeholder="Az Ön Neve *"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] text-[var(--text-primary)]"
              />
              <input
                type="tel"
                required
                placeholder="Telefonszám *"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full p-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] text-[var(--text-primary)]"
              />
              <input
                type="text"
                placeholder="Cím (város, utca) a felvételhez"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full p-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] text-[var(--text-primary)]"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 cursor-pointer transition-all flex items-center justify-center gap-2"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Megrendelés & Visszahívás Kérése</span>
            </button>
          </form>
        ) : (
          <div className="py-8 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <h3 className="font-bold text-base text-[var(--text-primary)]">
              Köszönjük a megkeresést!
            </h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Munkatársunk hamarosan visszahívja Önt a megadott <strong>{phone}</strong> számon a pontos felvételi idősáv egyeztetéséhez.
            </p>
            <button
              onClick={() => setSubmitted(false)}
              className="px-4 py-2 rounded-xl border border-[var(--border-color)] text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
            >
              Új számítás indítása
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
