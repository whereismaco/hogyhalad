"use client";
import Link from "next/link";
import { useState } from "react";
import { useApp } from "./AppShell";
import { navigate, api, formValues, useRemote } from "@/lib/client";
import {
  calculateItem,
  calculateTotal,
  money,
  plans,
  topups,
  type PriceRule,
} from "@/lib/domain";
import {
  Action,
  AsyncForm,
  CustomerFields,
  Dialog,
  Empty,
  Field,
  Loading,
  Notice,
  PageTitle,
} from "./ui";
type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  zip: string;
  city: string;
  taxNumber: string;
  notes: string;
};
type Inquiry = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
  state: string;
  aiSummary: string | null;
  aiDraft: string | null;
  estimatedAmount: number | null;
  jobId: string | null;
};
export function Overview() {
  const { snapshot, refresh } = useApp();
  return (
    <>
      <PageTitle
        title="Áttekintés"
        subtitle="A vállalkozásod aktuális adatai."
        actions={
          <button className="btn" onClick={refresh}>
            Frissítés
          </button>
        }
      />
      <div className="grid four">
        {[
          { name: "Aktív munkák", value: snapshot.counts.active },
          { name: "Rögzített munkák", value: snapshot.counts.total },
          { name: "Fizetett munkadíjak", value: money(snapshot.counts.paid) },
          {
            name: "AI-kredit",
            value:
              snapshot.tenant.monthlyCredits + snapshot.tenant.purchasedCredits,
          },
        ].map((m) => (
          <div className="panel metric" key={m.name}>
            <span>{m.name}</span>
            <strong>{m.value}</strong>
          </div>
        ))}
      </div>
      <div className="grid two">
        <section className="panel">
          <h2>Mai feladatok</h2>
          <p className="muted">
            A dátumhoz és a hozzárendeléshez tartozó átvételek és átadások.
          </p>
          <Link href="/dashboard/dispatch" className="btn">
            Szállítások megnyitása
          </Link>
        </section>
        <section className="panel">
          <h2>{snapshot.usage.limits.name} csomag</h2>
          <p>
            {snapshot.usage.jobs} / {snapshot.usage.limits.jobs} munka ·{" "}
            {snapshot.usage.inquiries} / {snapshot.usage.limits.inquiries}{" "}
            megkeresés
          </p>
          <progress
            value={snapshot.usage.jobs}
            max={snapshot.usage.limits.jobs}
          />
          <p className="subtle-note">
            Az aktuális előfizetési időszakban létrehozott rekordok.
          </p>
        </section>
      </div>
      <TaskList />
    </>
  );
}
export function TaskList() {
  const { snapshot, refresh } = useApp();
  if (!snapshot.tasks.length) return null;
  return (
    <section className="panel">
      <div className="page-title">
        <h2>Háttérfeladatok</h2>
        <button className="btn" onClick={refresh}>
          Frissítés
        </button>
      </div>
      {snapshot.tasks.slice(0, 15).map((t) => (
        <div className="list-row" key={t.id}>
          <div>
            <strong>
              {(
                {
                  EMAIL: "E-mail",
                  JOB_EMAIL: "Állapotértesítés",
                  AI: "AI-művelet",
                  AI_AUTO: "Automatikus AI",
                  PDF: "PDF-dokumentum",
                  INVOICE: "Számlázás",
                  INVOICE_DOCUMENT: "Számla PDF és kézbesítés",
                } as Record<string, string>
              )[t.type] || t.type}
            </strong>
            <p>
              {new Date(t.createdAt).toLocaleString("hu-HU")} · {t.attempts}{" "}
              próbálkozás
            </p>
            {t.lastError && (
              <p className="error-text">
                {(
                  {
                    INVOICE_RECONCILIATION_REQUIRED:
                      "Ellenőrizd az eredményt a számlázóban.",
                    INVOICE_NOT_CONFIGURED:
                      "A számlázó kapcsolat nincs beállítva.",
                    INVOICE_ADDRESS_MISSING:
                      "Hiányosak az ügyfél számlázási adatai.",
                    EMAIL_NOT_CONFIGURED: "Az e-mail-küldés nincs beállítva.",
                    AI_NOT_CONFIGURED: "Az AI-hozzáférés nincs beállítva.",
                    INVOICE_PDF_NOT_READY: "A számlázó még készíti a PDF-et.",
                    TASK_FAILED:
                      "A feladat nem sikerült. Ellenőrizd a beállításokat, majd próbáld újra.",
                  } as Record<string, string>
                )[t.lastError] ||
                  "A külső szolgáltató művelete nem sikerült. Ellenőrizd a kapcsolatot."}
              </p>
            )}
          </div>
          <span className="badge">
            {(
              {
                pending: "Sorban áll",
                processing: "Folyamatban",
                done: "Elkészült",
                failed: "Hibás",
              } as Record<string, string>
            )[t.state] || t.state}
          </span>
          {t.state === "failed" &&
            t.type !== "AI" &&
            snapshot.role === "OWNER" && (
              <Action
                onClick={async () => {
                  await api("tasks/" + t.id, "POST", {});
                  refresh();
                }}
              >
                Újrapróbálás
              </Action>
            )}
        </div>
      ))}
    </section>
  );
}
export function Customers() {
  const { revision, refresh, snapshot } = useApp(),
    [q, setQ] = useState(""),
    [page, setPage] = useState(1),
    [editing, setEditing] = useState<Customer | null | undefined>(undefined);
  const { data, error, reload } = useRemote<{ items: Customer[] }>(
    "customers?q=" + encodeURIComponent(q) + "&page=" + page,
    revision,
  );
  return (
    <>
      <PageTitle
        title="Ügyfelek"
        subtitle="Elérhetőségek, számlázási adatok és megjegyzések."
        actions={
          <button
            className="btn primary"
            disabled={!snapshot.canWrite}
            onClick={() => setEditing(null)}
          >
            Új ügyfél
          </button>
        }
      />
      <Field label="Keresés">
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          placeholder="Név, telefonszám, e-mail"
        />
      </Field>
      {error && <Notice error>{error}</Notice>}
      {!data && !error && <Loading />}
      {data && !data.items.length && (
        <Empty>Nincs megjeleníthető ügyfél.</Empty>
      )}
      {!!data?.items.length && (
        <div className="panel table-wrap">
          <table>
            <thead>
              <tr>
                <th>Ügyfél</th>
                <th>Kapcsolat</th>
                <th>Cím</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((c) => (
                <tr key={c.id}>
                  <td>
                    <strong>{c.name}</strong>
                    <small>{c.taxNumber}</small>
                  </td>
                  <td>
                    <a className="link" href={"tel:" + c.phone}>
                      {c.phone}
                    </a>
                    <small>{c.email}</small>
                  </td>
                  <td>
                    {c.zip} {c.city}
                    <small>{c.address}</small>
                  </td>
                  <td>
                    <button
                      className="btn"
                      disabled={!snapshot.canWrite}
                      onClick={() => setEditing(c)}
                    >
                      Szerkesztés
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="pagination">
        <button
          className="btn"
          disabled={page === 1}
          onClick={() => setPage((p) => p - 1)}
        >
          Előző
        </button>
        <span>{page}. oldal</span>
        <button
          className="btn"
          disabled={(data?.items.length || 0) < 50}
          onClick={() => setPage((p) => p + 1)}
        >
          Következő
        </button>
      </div>
      {editing !== undefined && (
        <Dialog
          title={editing ? "Ügyfél szerkesztése" : "Új ügyfél"}
          onClose={() => setEditing(undefined)}
        >
          <AsyncForm
            onSubmit={async (form) => {
              await api(
                "customers" + (editing ? "/" + editing.id : ""),
                editing ? "PATCH" : "POST",
                formValues(form),
              );
              setEditing(undefined);
              reload();
              refresh();
            }}
          >
            <CustomerFields customer={editing || undefined} />
          </AsyncForm>
        </Dialog>
      )}
    </>
  );
}
export function Inquiries() {
  const { snapshot, revision, refresh } = useApp(),
    [q, setQ] = useState(""),
    [page, setPage] = useState(1),
    [selected, setSelected] = useState<string | null>(null),
    [creating, setCreating] = useState(false),
    [key, setKey] = useState(() => crypto.randomUUID());
  const { data, error, reload } = useRemote<{ items: Inquiry[] }>(
      "inquiries?q=" + encodeURIComponent(q) + "&page=" + page,
      revision,
    ),
    inquiry = data?.items.find((i) => i.id === selected);
  const done = () => {
    reload();
    refresh();
  };
  return (
    <>
      <PageTitle
        title="Megkeresések"
        subtitle="Ajánlatkérésekből követhető munkák."
        actions={
          <button
            className="btn primary"
            disabled={!snapshot.canWrite}
            onClick={() => {
              setKey(crypto.randomUUID());
              setCreating(true);
            }}
          >
            Új megkeresés
          </button>
        }
      />
      <div className="toolbar">
        <Field label="Keresés">
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Név vagy telefon"
          />
        </Field>
        <button className="btn" onClick={done}>
          Frissítés
        </button>
      </div>
      {error && <Notice error>{error}</Notice>}
      {!data && !error && <Loading />}
      {data && !data.items.length && (
        <Empty>
          Még nincs megkeresés. Rögzíts egy telefonos érdeklődést, vagy
          Businessben építsd be a widgetet.
        </Empty>
      )}
      {data?.items.map((i) => (
        <div className="panel" key={i.id}>
          <div className="page-title">
            <div>
              <h2>{i.name}</h2>
              <p className="muted">
                {i.phone} · {i.email}
              </p>
            </div>
            <span className="badge">{i.state}</span>
          </div>
          <p>{i.notes}</p>
          <div className="actions">
            <button className="btn" onClick={() => setSelected(i.id)}>
              Megnyitás
            </button>
            {i.jobId && (
              <Link className="btn" href={"/dashboard/jobs?id=" + i.jobId}>
                Munkalap
              </Link>
            )}
          </div>
        </div>
      ))}
      <div className="pagination">
        <button
          className="btn"
          disabled={page === 1}
          onClick={() => setPage((p) => p - 1)}
        >
          Előző
        </button>
        <span>{page}. oldal</span>
        <button
          className="btn"
          disabled={(data?.items.length || 0) < 50}
          onClick={() => setPage((p) => p + 1)}
        >
          Következő
        </button>
      </div>
      {creating && (
        <Dialog title="Új megkeresés" onClose={() => setCreating(false)}>
          <AsyncForm
            onSubmit={async (form) => {
              await api("inquiries", "POST", {
                ...formValues(form),
                requestKey: key,
              });
              setCreating(false);
              done();
            }}
          >
            <CustomerFields />
            <Field label="Forrás">
              <select name="source">
                <option value="MANUAL">Kézi</option>
                <option value="PHONE">Telefon</option>
                <option value="EMAIL">E-mail</option>
              </select>
            </Field>
          </AsyncForm>
        </Dialog>
      )}
      {inquiry && (
        <Dialog
          title={inquiry.name + " – Megkeresés"}
          onClose={() => setSelected(null)}
        >
          <div className="detail">
            <p>{inquiry.notes}</p>
            <p>{inquiry.address}</p>
            <div className="actions">
              <Action
                disabled={!snapshot.canWrite || !!inquiry.jobId}
                onClick={async () => {
                  const result = await api<{ id: string }>(
                    "inquiries/" + inquiry.id + "/convert",
                    "POST",
                    {},
                  );
                  navigate("/dashboard/jobs?id=" + result.id);
                }}
              >
                Munkává alakítás
              </Action>
              <Action
                disabled={!snapshot.canWrite}
                onClick={async () => {
                  await api("inquiries/" + inquiry.id + "/ai", "POST", {
                    requestKey: key,
                  });
                  setKey(crypto.randomUUID());
                  done();
                }}
              >
                AI-elemzés és választervezet · 1 kredit
              </Action>
              <button className="btn" onClick={done}>
                Frissítés
              </button>
            </div>
            {inquiry.aiSummary && <Notice>{inquiry.aiSummary}</Notice>}
            <AsyncForm
              key={inquiry.aiDraft}
              submit="Ajánlat küldése e-mailben"
              onSubmit={async (form) => {
                await api("inquiries/" + inquiry.id + "/send", "POST", {
                  text: String(form.get("text")),
                  requestKey: key,
                });
                setKey(crypto.randomUUID());
                done();
              }}
            >
              <Field label="Válasz szövege">
                <textarea
                  name="text"
                  defaultValue={inquiry.aiDraft || ""}
                  required
                  rows={10}
                />
              </Field>
              <p className="subtle-note">
                Címzett: {inquiry.email || "Nincs megadva e-mail-cím."}
              </p>
            </AsyncForm>
            <AsyncForm
              submit="Állapot és becsült díj mentése"
              onSubmit={async (form) => {
                const v = formValues(form);
                await api("inquiries/" + inquiry.id, "PATCH", {
                  state: v.state,
                  estimatedAmount: Number(v.estimatedAmount || 0),
                });
                done();
              }}
            >
              <Field label="Állapot">
                <select
                  name="state"
                  defaultValue={
                    inquiry.state === "CONVERTED" ? "NEW" : inquiry.state
                  }
                >
                  <option value="NEW">Új</option>
                  <option value="OFFER_SENT">Ajánlat elküldve</option>
                  <option value="DECLINED">Elutasítva</option>
                  <option value="ARCHIVED">Archivált</option>
                </select>
              </Field>
              <Field
                name="estimatedAmount"
                label="Becsült díj (Ft)"
                type="number"
                min={0}
                defaultValue={inquiry.estimatedAmount || 0}
              />
            </AsyncForm>
          </div>
        </Dialog>
      )}
    </>
  );
}
export function Calculator() {
  const { snapshot, refresh } = useApp(),
    [editing, setEditing] = useState<PriceRule | null | undefined>(undefined),
    [ruleId, setRuleId] = useState(
      snapshot.catalog.find((r) => !r.isExtra && r.active)?.id || "",
    ),
    [width, setWidth] = useState(2),
    [length, setLength] = useState(3),
    [quantity, setQuantity] = useState(1),
    [extras, setExtras] = useState<string[]>([]);
  const selected = snapshot.catalog.find((r) => r.id === ruleId);
  let total = 0,
    error = "";
  try {
    if (selected)
      total = calculateTotal(
        [
          calculateItem(
            { ruleId, width, length, quantity, extras },
            snapshot.catalog,
          ).total,
        ],
        snapshot.tenant.minimumAmount,
      );
  } catch (e) {
    error = (e as Error).message;
  }
  return (
    <>
      <PageTitle
        title="Árlista és kalkulátor"
        subtitle="Ugyanaz a számítás a munkalapon, a widgetben és az árbecslésnél."
      />
      <div className="grid two">
        <section className="panel">
          <h2>Árbecslés</h2>
          <Field label="Szolgáltatás">
            <select
              value={ruleId}
              onChange={(e) => {
                setRuleId(e.target.value);
                setExtras([]);
              }}
            >
              {snapshot.catalog
                .filter((r) => !r.isExtra && r.active)
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
            </select>
          </Field>
          {selected?.unit === "M2" ? (
            <div className="grid two">
              <Field label="Szélesség (m)">
                <input
                  type="number"
                  min="0.01"
                  max="100"
                  step="0.01"
                  value={width}
                  onChange={(e) => setWidth(Number(e.target.value))}
                />
              </Field>
              <Field label="Hosszúság (m)">
                <input
                  type="number"
                  min="0.01"
                  max="100"
                  step="0.01"
                  value={length}
                  onChange={(e) => setLength(Number(e.target.value))}
                />
              </Field>
            </div>
          ) : (
            <Field label="Mennyiség">
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
              />
            </Field>
          )}
          {snapshot.catalog
            .filter((r) => r.isExtra && r.active)
            .map((r) => (
              <label className="check-label" key={r.id}>
                <input
                  type="checkbox"
                  checked={extras.includes(r.id)}
                  onChange={(e) =>
                    setExtras(
                      e.target.checked
                        ? [...extras, r.id]
                        : extras.filter((id) => id !== r.id),
                    )
                  }
                />
                {r.name} · {money(r.unitPrice)}
              </label>
            ))}
          {error ? (
            <Notice error>{error}</Notice>
          ) : (
            <div className="metric">
              <span>Becsült végösszeg</span>
              <strong>{money(total)}</strong>
            </div>
          )}
          <p className="subtle-note">
            Minimumdíj: {money(snapshot.tenant.minimumAmount)}. Az árak
            módosítása a korábbi munkákat nem változtatja meg.
          </p>
        </section>
        <section className="panel">
          <div className="page-title">
            <h2>Szolgáltatások és extrák</h2>
            {["OWNER", "ADMIN"].includes(snapshot.role) && (
              <button
                className="btn"
                disabled={!snapshot.canWrite}
                onClick={() => setEditing(null)}
              >
                Új tétel
              </button>
            )}
          </div>
          {snapshot.catalog.map((r) => (
            <div className="list-row" key={r.id}>
              <div>
                <strong>{r.name}</strong>
                <p>
                  {r.isExtra ? "Extra · " : ""}
                  {money(r.unitPrice)}/{r.unit} ·{" "}
                  {r.active ? "Aktív" : "Inaktív"}
                </p>
              </div>
              {["OWNER", "ADMIN"].includes(snapshot.role) && (
                <button className="btn" onClick={() => setEditing(r)}>
                  Szerkesztés
                </button>
              )}
            </div>
          ))}
        </section>
      </div>
      {editing !== undefined && (
        <Dialog
          title={editing ? "Ár módosítása" : "Új szolgáltatás vagy extra"}
          onClose={() => setEditing(undefined)}
        >
          <AsyncForm
            onSubmit={async (form) => {
              const v = formValues(form);
              await api(
                "catalog" + (editing ? "/" + editing.id : ""),
                editing ? "PATCH" : "POST",
                {
                  name: v.name,
                  unit: v.unit,
                  unitPrice: Number(v.unitPrice),
                  isExtra: form.has("isExtra"),
                  active: form.has("active"),
                },
              );
              setEditing(undefined);
              refresh();
            }}
          >
            <Field
              name="name"
              label="Megnevezés"
              required
              defaultValue={editing?.name}
            />
            <Field label="Egység">
              <select name="unit" defaultValue={editing?.unit || "FIXED"}>
                <option value="M2">m²</option>
                <option value="PIECE">db</option>
                <option value="HOUR">óra</option>
                <option value="FIXED">fix díj</option>
              </select>
            </Field>
            <Field
              name="unitPrice"
              label="Egységár (Ft)"
              type="number"
              min={0}
              required
              defaultValue={editing?.unitPrice || 0}
            />
            <label className="check-label">
              <input
                type="checkbox"
                name="isExtra"
                defaultChecked={editing?.isExtra}
              />
              Extra szolgáltatás
            </label>
            <label className="check-label">
              <input
                type="checkbox"
                name="active"
                defaultChecked={editing?.active ?? true}
              />
              Aktív
            </label>
          </AsyncForm>
        </Dialog>
      )}
    </>
  );
}
export function AiWallet() {
  const { snapshot, refresh, revision } = useApp(),
    [key, setKey] = useState(() => crypto.randomUUID());
  const { data } = useRemote<{
    ledger: {
      description: string;
      monthlyDelta: number;
      purchasedDelta: number;
      createdAt: number;
    }[];
  }>("ai", revision);
  const report = snapshot.tasks.find(
    (t) =>
      t.type === "AI" &&
      t.state === "done" &&
      t.result &&
      "summary" in JSON.parse(t.result),
  );
  return (
    <>
      <PageTitle
        title="AI asszisztens"
        subtitle="Megkereséselemzés, választervezet és vezetői összefoglaló."
      />
      {snapshot.tenant.creditDebt > 0 && (
        <Notice error>
          Visszatérített, már felhasznált kreditek miatt{" "}
          {snapshot.tenant.creditDebt} kredit rendezése szükséges. A feltöltés
          először ezt egyenlíti ki.
        </Notice>
      )}
      <div className="grid three">
        <div className="panel metric">
          <span>Havi keret maradéka</span>
          <strong>{snapshot.tenant.monthlyCredits}</strong>
        </div>
        <div className="panel metric">
          <span>Vásárolt kredit</span>
          <strong>{snapshot.tenant.purchasedCredits}</strong>
        </div>
        <div className="panel">
          <h3>Vezetői összefoglaló</h3>
          <p className="muted">Az elmúlt 24 óra adatai alapján. 2 kredit.</p>
          <Action
            disabled={!snapshot.canWrite}
            onClick={async () => {
              await api("ai", "POST", { requestKey: key });
              setKey(crypto.randomUUID());
              refresh();
            }}
          >
            Összefoglaló készítése
          </Action>
        </div>
      </div>
      {report && (
        <section className="panel">
          <h2>Legutóbbi összefoglaló</h2>
          <div className="pre">{JSON.parse(report.result!).summary}</div>
        </section>
      )}
      {snapshot.role === "OWNER" && (
        <section className="panel">
          <h2>Kreditfeltöltés</h2>
          <div className="grid three">
            {Object.entries(topups).map(([size, p]) => (
              <div className="panel" key={size}>
                <h3>{p.credits} kredit</h3>
                <strong>{money(p.price)}</strong>
                <Action
                  disabled={!snapshot.canWrite}
                  onClick={async () => {
                    const r = await api<{ url: string }>(
                      "billing/topup",
                      "POST",
                      { size },
                    );
                    navigate(r.url);
                  }}
                >
                  Fizetés Stripe-pal
                </Action>
              </div>
            ))}
          </div>
        </section>
      )}
      <TaskList />
      <section className="panel">
        <h2>Kredittörténet</h2>
        {data?.ledger.map((e, i) => (
          <div className="list-row" key={i}>
            <div>
              <strong>{e.description}</strong>
              <p>{new Date(e.createdAt).toLocaleString("hu-HU")}</p>
            </div>
            <strong>
              {e.monthlyDelta + e.purchasedDelta > 0 ? "+" : ""}
              {e.monthlyDelta + e.purchasedDelta}
            </strong>
          </div>
        ))}
      </section>
    </>
  );
}
export function Billing() {
  const { snapshot, refresh, revision } = useApp(),
    t = snapshot.tenant;
  const { data: invoices } = useRemote<{
    items: {
      id: string;
      number: string | null;
      state: string;
      createdAt: number;
      downloadable: number;
    }[];
  }>("billing/invoices", revision);
  return (
    <>
      <PageTitle
        title="Előfizetés"
        subtitle="Próbaidő, kártyaadatok és csomagkezelés."
        actions={
          <button className="btn" onClick={refresh}>
            Állapot frissítése
          </button>
        }
      />
      <section className="panel">
        <h2>
          Előfizetés állapota:{" "}
          {(
            {
              pending: "Még nincs előfizetés",
              trialing: "Próbaidő",
              active: "Aktív",
              past_due: "Sikertelen terhelés",
              canceled: "Lemondva",
              unpaid: "Rendezetlen",
              paused: "Szünetel",
            } as Record<string, string>
          )[t.state] || t.state}
        </h2>
        <p>
          {plans[t.plan].name} · {money(plans[t.plan].price)}/hó, fizetendő
          végösszeg.
        </p>
        {t.trialEnd && (
          <p>
            Próba vége:{" "}
            {new Date(t.trialEnd).toLocaleString("hu-HU", {
              timeZone: "Europe/Budapest",
            })}
          </p>
        )}
        {t.periodEnd && (
          <p>
            Időszak vége:{" "}
            {new Date(t.periodEnd).toLocaleString("hu-HU", {
              timeZone: "Europe/Budapest",
            })}
          </p>
        )}
        {!!t.cancelAtPeriodEnd && (
          <Notice>
            Lemondás rögzítve. A hozzáférés az aktuális időszak végéig él.
          </Notice>
        )}
        {t.pendingPlan && (
          <Notice>
            Következő időszak csomagja: {plans[t.pendingPlan].name}.
          </Notice>
        )}
        {t.stripeCustomerId && (
          <Action
            onClick={async () => {
              const result = await api<{ url: string }>(
                "billing/portal",
                "POST",
                {},
              );
              navigate(result.url);
            }}
          >
            Kártya, számlázási adatok és lemondás
          </Action>
        )}
        <p className="subtle-note">
          Sikeres fizetés után az állapot a Stripe értesítésének feldolgozásakor
          frissül.
        </p>
      </section>
      <div className="grid two">
        {Object.entries(plans).map(([plan, p]) => (
          <section className="panel" key={plan}>
            <h2>{p.name}</h2>
            <p className="pricing-amount">
              {money(p.price)}
              <small>/hó</small>
            </p>
            <p>
              {p.jobs} munka · {p.inquiries} megkeresés · {p.seats} felhasználó
              · {p.credits} AI-kredit
            </p>
            {["pending", "canceled", "incomplete_expired"].includes(t.state) ? (
              <Action
                className="primary"
                onClick={async () => {
                  const result = await api<{ url: string }>(
                    "billing/checkout",
                    "POST",
                    { plan },
                  );
                  navigate(result.url);
                }}
              >
                Előfizetés indítása
              </Action>
            ) : (
              <Action
                disabled={t.plan === plan || t.state !== "active"}
                onClick={async () => {
                  await api("billing/change-plan", "POST", { plan });
                  refresh();
                }}
              >
                Váltás a következő megújuláskor
              </Action>
            )}
            <p className="subtle-note">
              Az első próba 7 napig díjmentes, bankkártya szükséges. Utána{" "}
              {money(p.price)}/hó, ha előtte nem mondod le.
            </p>
          </section>
        ))}
      </div>
      <section className="panel">
        <h2>HogyHalad számlák</h2>
        {invoices?.items.length ? (
          invoices.items.map((i) => (
            <div className="list-row" key={i.id}>
              <div>
                <strong>{i.number || "Számla készül"}</strong>
                <p>
                  {new Date(i.createdAt).toLocaleDateString("hu-HU")} ·{" "}
                  {i.state}
                </p>
              </div>
              {!!i.downloadable && (
                <a
                  className="btn"
                  href={"/api/crm/invoice-files/" + i.id}
                  target="_blank"
                  rel="noreferrer"
                >
                  Számla letöltése
                </a>
              )}
            </div>
          ))
        ) : (
          <p className="muted">Még nincs kiállított HogyHalad számla.</p>
        )}
      </section>
    </>
  );
}
