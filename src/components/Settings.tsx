"use client";
import { useState } from "react";
import Link from "next/link";
import { useApp } from "./AppShell";
import { api, formValues, useRemote } from "@/lib/client";
import type { Stage } from "@/lib/domain";
import { Action, AsyncForm, Field, Notice, PageTitle } from "./ui";
import { TaskList } from "./Office";
const kinds = {
  NEW: "Új",
  RECEIVED: "Átvéve / egyeztetve",
  IN_PROGRESS: "Folyamatban",
  READY: "Elkészült",
  DELIVERY: "Átadás / kiszállítás",
  CLOSED: "Lezárva",
};
const roleNames = {
  OWNER: "Tulajdonos",
  ADMIN: "Adminisztrátor",
  DISPATCHER: "Diszpécser",
  DRIVER: "Sofőr",
  WORKER: "Munkatárs",
};
export function Settings() {
  const { snapshot, refresh, revision } = useApp(),
    t = snapshot.tenant,
    [steps, setSteps] = useState<Stage[]>(() => JSON.parse(t.workflowJson)),
    [apiToken, setApiToken] = useState("");
  const business = t.plan === "BUSINESS",
    owner = snapshot.role === "OWNER";
  const { data: keys, reload: reloadKeys } = useRemote<{
    items: {
      id: string;
      name: string;
      prefix: string;
      revokedAt: number | null;
    }[];
  }>(business && owner ? "api-keys" : null, revision);
  const { data: invites, reload: reloadInvites } = useRemote<{
    invitations: {
      id: string;
      email: string;
      role: string;
      state: string;
      expiresAt: number;
    }[];
  }>(business ? "members" : null, revision);
  const { data: invoices, reload: reloadInvoices } = useRemote<{
    items: {
      id: string;
      sourceId: string;
      state: string;
      number: string | null;
      externalId: string | null;
      jobId: string | null;
    }[];
  }>(owner && business ? "invoices" : null, revision);
  const move = (index: number, direction: number) => {
    const next = [...steps],
      target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setSteps(next);
  };
  return (
    <>
      <PageTitle
        title="Beállítások"
        subtitle="Cégadatok, munkafolyamat, csapat és külső kapcsolatok."
      />
      <section className="panel">
        <h2>Céges profil és működés</h2>
        <AsyncForm
          onSubmit={async (form) => {
            const v = formValues(form);
            await api("settings", "PATCH", {
              ...v,
              minimumAmount: Number(v.minimumAmount),
              workflow: steps,
              autoAiResponse: form.has("autoAiResponse"),
              allowedOrigins: v.allowedOrigins
                .split(/\r?\n/)
                .map((s) => s.trim())
                .filter(Boolean),
            });
            refresh();
          }}
        >
          <div className="grid two">
            <Field name="name" label="Cégnév" required defaultValue={t.name} />
            <Field
              name="email"
              label="Válaszcím / kapcsolattartó e-mail"
              type="email"
              required
              defaultValue={t.email}
            />
            <Field
              name="phone"
              label="Telefon"
              required
              defaultValue={t.phone}
            />
            <Field
              name="taxNumber"
              label="Adószám"
              defaultValue={t.taxNumber}
            />
            <Field name="zip" label="Irányítószám" defaultValue={t.zip} />
            <Field name="city" label="Település" defaultValue={t.city} />
          </div>
          <Field
            name="address"
            label="Utca, házszám"
            defaultValue={t.address}
          />
          <Field
            name="minimumAmount"
            label="Minimum munkadíj (Ft)"
            type="number"
            min={0}
            defaultValue={t.minimumAmount}
          />
          <div className="grid two">
            <Field
              name="googleReviewUrl"
              label="Google értékelési link"
              type="url"
              defaultValue={t.googleReviewUrl}
            />
            <Field
              name="facebookReviewUrl"
              label="Facebook-oldal"
              type="url"
              defaultValue={t.facebookReviewUrl}
            />
          </div>
          <h3>Munkafolyamat</h3>
          <p className="subtle-note">
            A változtatás az új munkákra érvényes. Első lépés: új; utolsó lépés:
            lezárva.
          </p>
          {steps.map((s, i) => (
            <div className="panel" key={s.id}>
              <div className="grid two">
                <Field label={i + 1 + ". lépés neve"}>
                  <input
                    value={s.name}
                    required
                    maxLength={80}
                    onChange={(e) =>
                      setSteps(
                        steps.map((step, n) =>
                          n === i ? { ...step, name: e.target.value } : step,
                        ),
                      )
                    }
                  />
                </Field>
                <Field label="Szerepe a folyamatban">
                  <select
                    value={s.kind}
                    onChange={(e) =>
                      setSteps(
                        steps.map((step, n) =>
                          n === i
                            ? { ...step, kind: e.target.value as Stage["kind"] }
                            : step,
                        ),
                      )
                    }
                  >
                    {Object.entries(kinds).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="actions">
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={s.public}
                    onChange={(e) =>
                      setSteps(
                        steps.map((step, n) =>
                          n === i
                            ? { ...step, public: e.target.checked }
                            : step,
                        ),
                      )
                    }
                  />
                  Ügyfélnek látható
                </label>
                <button
                  type="button"
                  className="btn"
                  aria-label={i + 1 + ". lépés feljebb"}
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                >
                  Feljebb
                </button>
                <button
                  type="button"
                  className="btn"
                  aria-label={i + 1 + ". lépés lejjebb"}
                  disabled={i === steps.length - 1}
                  onClick={() => move(i, 1)}
                >
                  Lejjebb
                </button>
                <button
                  type="button"
                  className="btn danger"
                  disabled={steps.length <= 2}
                  onClick={() => setSteps(steps.filter((_, n) => n !== i))}
                >
                  Eltávolítás
                </button>
              </div>
            </div>
          ))}
          <button
            className="btn"
            type="button"
            disabled={steps.length >= 15}
            onClick={() => {
              const next = [...steps];
              next.splice(next.length - 1, 0, {
                id: "step_" + crypto.randomUUID().slice(0, 8),
                name: "Új lépés",
                kind: "IN_PROGRESS",
                public: true,
              });
              setSteps(next);
            }}
          >
            Lépés hozzáadása
          </button>
          <label className="check-label">
            <input
              type="checkbox"
              name="autoAiResponse"
              defaultChecked={!!t.autoAiResponse}
            />
            AI-választervezet automatikus elküldése
          </label>
          <p className="subtle-note">
            Bekapcsolva a webes megkeresésekre a CRM automatikusan elemzést és
            válaszlevelet készít a kreditkeretből. Alapból kikapcsolt.
          </p>
          <Field label="Beágyazásra engedélyezett weboldalak, soronként egy">
            <textarea
              name="allowedOrigins"
              defaultValue={(JSON.parse(t.allowedOrigins) as string[]).join(
                "\n",
              )}
              placeholder="https://pelda.hu"
            />
          </Field>
        </AsyncForm>
      </section>
      {business && owner && (
        <section className="panel">
          <h2>Számlázó kapcsolat</h2>
          <p className="muted">
            A saját céged számlázófiókja. A kulcs titkosítva tárolódik; mentés
            után nem olvasható vissza.
          </p>
          <AsyncForm
            onSubmit={async (form) => {
              const v = formValues(form);
              await api("integration", "POST", {
                provider: v.provider,
                apiKey: v.apiKey || undefined,
                blockId: v.blockId,
                taxMode: v.taxMode,
                autoIssue: form.has("autoIssue"),
              });
              refresh();
            }}
          >
            <div className="grid two">
              <Field label="Számlázó">
                <select name="provider" defaultValue={t.invoiceProvider}>
                  <option value="MANUAL">Kézi számlázás</option>
                  <option value="SZAMLAZZ">Számlázz.hu</option>
                  <option value="BILLINGO">Billingo</option>
                </select>
              </Field>
              <Field label="Áfakezelés">
                <select name="taxMode" defaultValue={t.invoiceTaxMode} required>
                  <option value="">Válassz a céged adózása szerint</option>
                  <option value="AAM">Alanyi adómentes</option>
                  <option value="27">27% áfa</option>
                  <option value="18">18% áfa</option>
                  <option value="5">5% áfa</option>
                  <option value="0">0% áfa</option>
                </select>
              </Field>
            </div>
            <Field
              label={
                t.invoiceKeyConfigured
                  ? "Új kulcs (üresen a meglévő marad)"
                  : "API-kulcs"
              }
            >
              <input
                name="apiKey"
                type="password"
                autoComplete="new-password"
              />
            </Field>
            <Field
              name="blockId"
              label="Billingo számlatömb azonosító"
              defaultValue={t.invoiceBlockId}
            />
            <label className="check-label">
              <input
                type="checkbox"
                name="autoIssue"
                defaultChecked={!!t.invoiceAutoIssue}
              />
              Számla automatikusan a munka lezárásakor
            </label>
          </AsyncForm>
        </section>
      )}
      {business && (
        <section className="panel">
          <h2>
            Csapat · {snapshot.usage.seats} / {snapshot.usage.limits.seats} hely
          </h2>
          {snapshot.members.map((m) => (
            <div className="panel" key={m.id}>
              <strong>
                {m.name} · {m.email}
              </strong>
              {m.role === "OWNER" ? (
                <p>Tulajdonos</p>
              ) : (
                <AsyncForm
                  onSubmit={async (form) => {
                    await api("members/" + m.id, "PATCH", {
                      active: form.has("active"),
                      role: String(form.get("role")),
                    });
                    refresh();
                  }}
                >
                  <Field label="Szerepkör">
                    <select name="role" defaultValue={m.role}>
                      {Object.entries(roleNames)
                        .filter(([k]) => k !== "OWNER")
                        .map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                    </select>
                  </Field>
                  <label className="check-label">
                    <input
                      type="checkbox"
                      name="active"
                      defaultChecked={!!m.active}
                    />
                    Aktív
                  </label>
                </AsyncForm>
              )}
            </div>
          ))}
          <h3>Meghívás</h3>
          <AsyncForm
            submit="Meghívó küldése"
            onSubmit={async (form) => {
              await api("members", "POST", formValues(form));
              reloadInvites();
              refresh();
            }}
          >
            <Field
              name="email"
              label="Meghívott e-mail-címe"
              type="email"
              required
            />
            <Field label="Szerepkör">
              <select name="role">
                {Object.entries(roleNames)
                  .filter(([k]) => k !== "OWNER")
                  .map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
              </select>
            </Field>
          </AsyncForm>
          {invites?.invitations.map((i) => (
            <div className="list-row" key={i.id}>
              <span>
                {i.email} · {i.role}
              </span>
              <span className="badge">{i.state}</span>
              {i.state === "pending" && (
                <Action
                  onClick={async () => {
                    await api("invitations/" + i.id, "DELETE", {});
                    reloadInvites();
                    refresh();
                  }}
                >
                  Visszavonás
                </Action>
              )}
            </div>
          ))}
        </section>
      )}
      {business && (
        <section className="panel">
          <h2>Weboldalas beágyazás</h2>
          <p>
            Az engedélyezett weboldal saját oldalába illeszthető. A követőoldal
            integrációjához a szerveroldali API használható.
          </p>
          <pre className="pre">
            {'<iframe src="' +
              (typeof window !== "undefined" ? window.location.origin : "") +
              "/widget/" +
              t.slug +
              '" title="Ajánlatkérés" width="100%" height="1100" style="border:0" loading="lazy"></iframe>'}
          </pre>
          <a
            className="btn"
            href={"/widget/" + t.slug}
            target="_blank"
            rel="noreferrer"
          >
            Widget előnézete
          </a>
          <p className="subtle-note">
            A követési API és a Node.js/PHP minták leírása a projekt
            docs/integration.md dokumentumában található.
          </p>
        </section>
      )}
      {business && owner && (
        <section className="panel">
          <h2>Követési API-kulcsok</h2>
          <Notice>
            A titkos kulcs kizárólag a partner szerverére kerülhet. A böngészőbe
            vagy widgetbe ne másold.
          </Notice>
          <AsyncForm
            submit="API-kulcs létrehozása"
            onSubmit={async (form) => {
              const r = await api<{ token: string }>(
                "api-keys",
                "POST",
                formValues(form),
              );
              setApiToken(r.token);
              reloadKeys();
            }}
          >
            <Field label="Kulcs neve" name="name" required />
          </AsyncForm>
          {apiToken && (
            <div>
              <p>A kulcs csak most látható:</p>
              <pre className="pre">{apiToken}</pre>
              <Action onClick={() => navigator.clipboard.writeText(apiToken)}>
                Kulcs másolása
              </Action>
            </div>
          )}
          {keys?.items.map((k) => (
            <div className="list-row" key={k.id}>
              <span>
                {k.name} · {k.prefix}…
              </span>
              {k.revokedAt ? (
                <span className="badge">Visszavonva</span>
              ) : (
                <Action
                  onClick={async () => {
                    await api("api-keys/" + k.id, "DELETE");
                    reloadKeys();
                  }}
                >
                  Visszavonás
                </Action>
              )}
            </div>
          ))}
        </section>
      )}
      {invoices && (
        <section className="panel">
          <h2>Számlázási feladatok</h2>
          {invoices.items.map((i) => (
            <div className="panel" key={i.id}>
              <p>
                {i.sourceId} · {i.state} · {i.number}
              </p>
              {i.state === "needs_review" || i.state === "issuing" ? (
                <>
                  <Notice>
                    Ellenőrizd a számlázóban, elkészült-e a számla. Ezután
                    rögzítsd az eredményt.
                  </Notice>
                  <AsyncForm
                    submit="Ellenőrzés eredményének rögzítése"
                    onSubmit={async (form) => {
                      const v = formValues(form);
                      await api("invoices/" + i.id, "POST", {
                        number: v.number,
                        externalId: v.externalId,
                        exists: form.has("exists"),
                        confirmed: form.has("confirmed"),
                      });
                      reloadInvoices();
                      refresh();
                    }}
                  >
                    <label className="check-label">
                      <input type="checkbox" name="exists" defaultChecked />A
                      számla már elkészült
                    </label>
                    <Field name="number" label="Számlaszám (ha elkészült)" />
                    <Field
                      name="externalId"
                      label="Számlázó azonosítója (ha elkészült)"
                    />
                    <label className="check-label">
                      <input type="checkbox" name="confirmed" required />
                      Az eredményt ellenőriztem a számlázó saját felületén.
                    </label>
                  </AsyncForm>
                </>
              ) : null}
            </div>
          ))}
        </section>
      )}
      <section className="panel">
        <h2>Adatmentés</h2>
        <p>
          Az export saját céged ügyfeleit, munkáit, tételeit, megkereséseit és
          eseményeit tartalmazza.
        </p>
        <Link className="btn" href="/api/crm/export">
          JSON-export letöltése
        </Link>
      </section>
      <TaskList />
    </>
  );
}
