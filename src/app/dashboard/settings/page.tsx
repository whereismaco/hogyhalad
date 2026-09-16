"use client";

import React, { useState } from "react";
import { Header } from "@/components/Header";
import { initialTenantSettings } from "@/lib/mockData";
import {
  Building2,
  FileText,
  Code2,
  Users,
  Copy,
  Check,
  Globe,
  Star,
  Layers,
  Save,
  CheckCircle2,
} from "lucide-react";

export default function SettingsPage() {
  const [tenant, setTenant] = useState(initialTenantSettings);
  const [copiedCode, setCopiedCode] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const widgetEmbedCode = `<!-- CleanFlow Szőnyegkalkulátor Widget -->
<iframe
  src="https://cleanflow.hu/widget/${tenant.slug}"
  width="100%"
  height="600"
  frameborder="0"
  style="border-radius: 16px; border: 1px solid #e2e8f0;"
></iframe>`;

  const handleCopyWidget = () => {
    navigator.clipboard.writeText(widgetEmbedCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <div>
      <Header
        title="Beállítások & SaaS Bérlői Profil"
        subtitle="Céges alapadatok, számlázási kulcsok, értékelési linkek és beágyazható weboldal widget"
      />

      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <form onSubmit={handleSave} className="space-y-6">
          {/* Céges Alapadatok Kártya */}
          <div className="p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-[var(--border-color)] pb-3">
              <Building2 className="w-5 h-5 text-blue-600" />
              <h2 className="font-bold text-base text-[var(--text-primary)]">
                Vállalkozási Profil & Elérhetőségek
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-[var(--text-secondary)]">Cégnév / Vállalkozás neve</label>
                <input
                  type="text"
                  value={tenant.name}
                  onChange={(e) => setTenant({ ...tenant, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] text-[var(--text-primary)] font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[var(--text-secondary)]">SaaS Azonosító (Slug)</label>
                <input
                  type="text"
                  readOnly
                  value={tenant.slug}
                  className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] text-[var(--text-muted)] font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[var(--text-secondary)]">Hivatalos Email Cím</label>
                <input
                  type="email"
                  value={tenant.email}
                  onChange={(e) => setTenant({ ...tenant, email: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] text-[var(--text-primary)]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[var(--text-secondary)]">Központi Telefonszám</label>
                <input
                  type="text"
                  value={tenant.phone}
                  onChange={(e) => setTenant({ ...tenant, phone: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] text-[var(--text-primary)]"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="font-bold text-[var(--text-secondary)]">Telephely & Cím</label>
                <input
                  type="text"
                  value={tenant.address}
                  onChange={(e) => setTenant({ ...tenant, address: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] text-[var(--text-primary)]"
                />
              </div>
            </div>
          </div>

          {/* Számlázás Integráció Kártya */}
          <div className="p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-[var(--border-color)] pb-3">
              <FileText className="w-5 h-5 text-emerald-600" />
              <div>
                <h2 className="font-bold text-base text-[var(--text-primary)]">
                  Számlázási Integráció (Számlázz.hu / Billingo)
                </h2>
                <p className="text-xs text-[var(--text-muted)]">
                  1-kattintásos számlagenerálás a munkalapról vagy automatikus számlázás kiszállításkor
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-[var(--text-secondary)]">Számlázó Program</label>
                <select
                  value={tenant.invoiceProvider}
                  onChange={(e) => setTenant({ ...tenant, invoiceProvider: e.target.value as any })}
                  className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] text-[var(--text-primary)] font-semibold"
                >
                  <option value="SZAMLAZZ">Számlázz.hu</option>
                  <option value="BILLINGO">Billingo</option>
                  <option value="MANUAL">Kézi PDF feltöltés (Nincs API)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[var(--text-secondary)]">Számlázz.hu / Billingo API Kulcs</label>
                <input
                  type="password"
                  placeholder="pl. szamla_live_xxxxxxxxxx"
                  defaultValue="szamla_live_8392104928"
                  className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] text-[var(--text-primary)] font-mono"
                />
              </div>
            </div>
          </div>

          {/* Értékelésgyűjtés Linkek */}
          <div className="p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-[var(--border-color)] pb-3">
              <Star className="w-5 h-5 text-amber-500" />
              <div>
                <h2 className="font-bold text-base text-[var(--text-primary)]">
                  Google & Facebook Értékelésgyűjtés
                </h2>
                <p className="text-xs text-[var(--text-muted)]">
                  A kiszállított munkák után megjelenik a közvetlen értékelő gomb az ügyfélkövető oldalon
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-[var(--text-secondary)]">Google Cégem Értékelési Link</label>
                <input
                  type="url"
                  placeholder="https://g.page/r/..."
                  value={tenant.googleReviewUrl}
                  onChange={(e) => setTenant({ ...tenant, googleReviewUrl: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] text-[var(--text-primary)]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[var(--text-secondary)]">Facebook Oldal Link</label>
                <input
                  type="url"
                  placeholder="https://facebook.com/..."
                  value={tenant.facebookReviewUrl}
                  onChange={(e) => setTenant({ ...tenant, facebookReviewUrl: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] text-[var(--text-primary)]"
                />
              </div>
            </div>
          </div>

          {/* Weboldalba ágyazható Widget Kód */}
          <div className="p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <div className="flex items-center gap-2">
                <Code2 className="w-5 h-5 text-purple-600" />
                <div>
                  <h2 className="font-bold text-base text-[var(--text-primary)]">
                    Weboldalba Ágyazható Szőnyegkalkulátor Widget
                  </h2>
                  <p className="text-xs text-[var(--text-muted)]">
                    Másold be ezt a kódot a weboldaladba (Wordpress, Wix, Egyedi HTML), hogy azonnal érkezzenek a leadek
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCopyWidget}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold cursor-pointer transition-colors"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? "Másolva!" : "Kód másolása"}</span>
              </button>
            </div>

            <pre className="p-4 rounded-2xl bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto">
              {widgetEmbedCode}
            </pre>
          </div>

          {/* Mentés sáv */}
          <div className="flex items-center justify-end gap-3 pt-2">
            {savedSuccess && (
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>Beállítások sikeresen mentve!</span>
              </span>
            )}

            <button
              type="submit"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 cursor-pointer transition-all"
            >
              <Save className="w-4 h-4" />
              <span>Beállítások Mentése</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
