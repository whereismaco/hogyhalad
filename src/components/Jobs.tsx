"use client";
import { useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, ExternalLink } from "lucide-react";
import { useApp } from "./AppShell";
import { api, formValues, useRemote } from "@/lib/client";
import { budapestDate, money, type Stage } from "@/lib/domain";
import type { JobRecord } from "@/lib/crm";
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
type JobDetail = JobRecord & {
  items: {
    id: string;
    name: string;
    quantity: number;
    unit: string;
    total: number;
    extrasJson: string;
  }[];
  events: { id: string; message: string; createdAt: number }[];
  files: { id: string; kind: string; filename: string; isPublic: number }[];
};
export function JobsView({ dispatch = false }: { dispatch?: boolean }) {
  const { snapshot, refresh, revision } = useApp(),
    search = useSearchParams();
  const [selected, setSelected] = useState<string | null>(search.get("id")),
    [creating, setCreating] = useState(search.get("new") === "true"),
    [q, setQ] = useState(""),
    [stage, setStage] = useState(""),
    [archived, setArchived] = useState(false),
    [page, setPage] = useState(1),
    [mode, setMode] = useState("table");
  const office = ["OWNER", "ADMIN", "DISPATCHER"].includes(snapshot.role),
    workflow = JSON.parse(snapshot.tenant.workflowJson) as Stage[];
  const path =
    "jobs?q=" +
    encodeURIComponent(q) +
    "&page=" +
    page +
    "&stage=" +
    encodeURIComponent(stage) +
    "&archived=" +
    Number(archived) +
    (dispatch ? "&date=" + budapestDate() : "");
  const { data, error, reload } = useRemote<{
    items: JobRecord[];
    total: number;
    page: number;
  }>(path, revision);
  const done = () => {
    reload();
    refresh();
  };
  return (
    <>
      <PageTitle
        title={dispatch ? "Mai szállítások" : "Munkák"}
        subtitle={
          dispatch
            ? "Átvételek és átadások · " + budapestDate()
            : "Munkalapok, tételek és a szolgáltatás minden lépése."
        }
        actions={
          office && (
            <button
              className="btn primary"
              disabled={!snapshot.canWrite}
              onClick={() => setCreating(true)}
            >
              <Plus size={17} />
              Új munka
            </button>
          )
        }
      />
      {!dispatch && (
        <div className="toolbar">
          <Field label="Keresés">
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Ügyfél, cím vagy munkakód"
            />
          </Field>
          <Field label="Állapot">
            <select
              value={stage}
              onChange={(e) => {
                setStage(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Minden állapot</option>
              {workflow.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <label className="check-label">
            <input
              type="checkbox"
              checked={archived}
              onChange={(e) => {
                setArchived(e.target.checked);
                setPage(1);
              }}
            />
            Archivált
          </label>
          <button
            className="btn"
            onClick={() => setMode(mode === "table" ? "kanban" : "table")}
          >
            {mode === "table" ? "Kanban" : "Táblázat"}
          </button>
        </div>
      )}
      {error && <Notice error>{error}</Notice>}
      {!data && !error && <Loading />}
      {data && !data.items.length && (
        <Empty>
          Még nincs megjeleníthető munka.{" "}
          {office
            ? "Rögzíts egy új munkalapot."
            : "A hozzád rendelt munkák itt jelennek meg."}
        </Empty>
      )}
      {!!data?.items.length &&
        (mode === "kanban" && !dispatch ? (
          <div className="kanban">
            {Array.from(
              new Set([
                ...workflow.map((s) => s.id),
                ...data.items.map((j) => j.stageId),
              ]),
            ).map((id) => (
              <section className="kanban-column" key={id}>
                <h3>{workflow.find((s) => s.id === id)?.name || id}</h3>
                {data.items
                  .filter((j) => j.stageId === id)
                  .map((job) => (
                    <button
                      key={job.id}
                      className="kanban-card"
                      onClick={() => setSelected(job.id)}
                    >
                      <small>{job.jobCode}</small>
                      <strong>{job.customerName}</strong>
                      <span>{money(job.totalAmount)}</span>
                    </button>
                  ))}
              </section>
            ))}
          </div>
        ) : (
          <div className="panel table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Munka / ügyfél</th>
                  <th>Állapot</th>
                  <th>Időpont / cím</th>
                  <th>Összeg</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((job) => (
                  <tr key={job.id}>
                    <td>
                      <button
                        className="link"
                        onClick={() => setSelected(job.id)}
                      >
                        {job.jobCode}
                      </button>
                      <strong style={{ display: "block" }}>
                        {job.customerName}
                      </strong>
                      <small>
                        {job.quickCount ? job.quickCount + " db" : ""}
                      </small>
                    </td>
                    <td>
                      <span className="badge blue">
                        {
                          (JSON.parse(job.workflowJson) as Stage[]).find(
                            (s) => s.id === job.stageId,
                          )?.name
                        }
                      </span>
                    </td>
                    <td>
                      {job.scheduledDate || "Nincs felvételi dátum"}
                      <small>
                        {job.deliveryDate ? "Átadás: " + job.deliveryDate : ""}
                      </small>
                      <small>{job.customerAddress}</small>
                    </td>
                    <td>
                      {money(job.totalAmount)}
                      <small>
                        {job.paymentStatus === "PAID"
                          ? "Fizetve"
                          : "Fizetésre vár"}
                      </small>
                    </td>
                    <td>
                      <button
                        className="btn"
                        onClick={() => setSelected(job.id)}
                      >
                        Megnyitás
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      {data && (
        <div className="pagination">
          <button
            className="btn"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Előző
          </button>
          <span>
            {page}. oldal · {data.total} munka
          </span>
          <button
            className="btn"
            disabled={page * 50 >= data.total}
            onClick={() => setPage((p) => p + 1)}
          >
            Következő
          </button>
        </div>
      )}
      {creating && (
        <Dialog title="Új munka" onClose={() => setCreating(false)}>
          <NewJob
            onDone={() => {
              setCreating(false);
              done();
            }}
          />
        </Dialog>
      )}
      {selected && (
        <Dialog title="Munkalap" onClose={() => setSelected(null)}>
          <JobView id={selected} onDone={done} />
        </Dialog>
      )}
    </>
  );
}
function NewJob({ onDone }: { onDone: () => void }) {
  const { snapshot } = useApp(),
    [key] = useState(() => crypto.randomUUID()),
    [existing, setExisting] = useState(""),
    [customerQuery, setCustomerQuery] = useState("");
  const { data } = useRemote<{
    items: { id: string; name: string; phone: string }[];
  }>("customers?q=" + encodeURIComponent(customerQuery));
  return (
    <AsyncForm
      submit="Munka létrehozása"
      onSubmit={async (form) => {
        const values = formValues(form);
        await api("jobs", "POST", {
          ...(existing ? { customerId: existing } : { customer: values }),
          quickCount: Number(values.quickCount),
          scheduledDate: values.scheduledDate || null,
          deliveryDate: values.deliveryDate || null,
          assignedMemberId: values.assignedMemberId || null,
          requestKey: key,
        });
        onDone();
      }}
    >
      <Field label="Meglévő ügyfél keresése">
        <input
          value={customerQuery}
          onChange={(e) => {
            setCustomerQuery(e.target.value);
            setExisting("");
          }}
          placeholder="Név, telefon vagy e-mail"
        />
      </Field>
      <Field label="Ügyfél">
        <select value={existing} onChange={(e) => setExisting(e.target.value)}>
          <option value="">Új ügyfél</option>
          {data?.items.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} · {c.phone}
            </option>
          ))}
        </select>
      </Field>
      {!existing && <CustomerFields />}
      <div className="grid two">
        <Field
          name="quickCount"
          label="Gyors átvételi darabszám"
          type="number"
          min={0}
          max={10000}
          defaultValue={0}
        />
        <Field label="Hozzárendelt munkatárs">
          <select name="assignedMemberId">
            <option value="">Nincs kijelölve</option>
            {snapshot.members
              .filter((m) => m.active)
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
          </select>
        </Field>
        <Field name="scheduledDate" label="Felvételi nap" type="date" />
        <Field name="deliveryDate" label="Átadás napja" type="date" />
      </div>
    </AsyncForm>
  );
}
function JobView({ id, onDone }: { id: string; onDone: () => void }) {
  const { snapshot, revision } = useApp(),
    { data: job, error, reload } = useRemote<JobDetail>("jobs/" + id, revision),
    [tracking, setTracking] = useState(""),
    [signature, setSignature] = useState<"PICKUP" | "DELIVERY" | null>(null);
  if (!job) return error ? <Notice error>{error}</Notice> : <Loading />;
  const office = ["OWNER", "ADMIN", "DISPATCHER"].includes(snapshot.role),
    stages = JSON.parse(job.workflowJson) as Stage[],
    current = stages.find((s) => s.id === job.stageId);
  const done = () => {
      reload();
      onDone();
    },
    send = async (data: Record<string, unknown>) => {
      await api("jobs/" + id, "PATCH", { version: job.version, ...data });
      done();
    };
  return (
    <div className="detail">
      <div className="grid two">
        <div>
          <span className="eyebrow">{job.jobCode}</span>
          <h2>{job.customerName}</h2>
          <p className="muted">{job.customerAddress}</p>
          <a className="link" href={"tel:" + job.customerPhone}>
            {job.customerPhone}
          </a>
        </div>
        <div>
          <h2>{money(job.totalAmount)}</h2>
          <span className="badge">{current?.name}</span>
          <p className="muted">
            {job.paymentStatus === "PAID" ? "Fizetve" : "Fizetésre vár"}
          </p>
        </div>
      </div>
      {office && snapshot.canWrite && (
        <AsyncForm
          onSubmit={async (form) => {
            const values = formValues(form);
            await send({
              stageId: values.stageId,
              reason: values.reason,
              assignedMemberId: values.assignedMemberId || null,
              scheduledDate: values.scheduledDate || null,
              deliveryDate: values.deliveryDate || null,
              routeOrder: Number(values.routeOrder),
              paymentStatus: values.paymentStatus,
              paymentMethod: values.paymentMethod,
              publicMessage: values.publicMessage,
              internalNotes: values.internalNotes,
            });
          }}
        >
          <div className="grid two">
            <Field label="Állapot">
              <select name="stageId" defaultValue={job.stageId}>
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field name="reason" label="Visszaléptetés indoklása" />
            <Field label="Munkatárs">
              <select
                name="assignedMemberId"
                defaultValue={job.assignedMemberId || ""}
              >
                <option value="">Nincs kijelölve</option>
                {snapshot.members
                  .filter((m) => m.active)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
              </select>
            </Field>
            <Field
              name="routeOrder"
              label="Cím sorszáma"
              type="number"
              min={0}
              defaultValue={job.routeOrder}
            />
            <Field
              name="scheduledDate"
              label="Felvételi nap"
              type="date"
              defaultValue={job.scheduledDate || ""}
            />
            <Field
              name="deliveryDate"
              label="Átadás napja"
              type="date"
              defaultValue={job.deliveryDate || ""}
            />
            <Field label="Fizetés">
              <select name="paymentStatus" defaultValue={job.paymentStatus}>
                <option value="PENDING">Fizetésre vár</option>
                <option value="PAID">Fizetve</option>
              </select>
            </Field>
            <Field label="Fizetési mód">
              <select name="paymentMethod" defaultValue={job.paymentMethod}>
                <option value="CASH">Készpénz</option>
                <option value="CARD_POS">Bankkártyaterminál</option>
                <option value="TRANSFER">Átutalás</option>
              </select>
            </Field>
          </div>
          <Field label="Ügyfélnek látható üzenet">
            <textarea name="publicMessage" defaultValue={job.publicMessage} />
          </Field>
          <Field label="Belső megjegyzés">
            <textarea name="internalNotes" defaultValue={job.internalNotes} />
          </Field>
        </AsyncForm>
      )}
      {!office &&
        snapshot.canWrite &&
        stages.findIndex((s) => s.id === job.stageId) < stages.length - 1 && (
          <Action
            onClick={() =>
              send({
                stageId:
                  stages[stages.findIndex((s) => s.id === job.stageId) + 1].id,
              })
            }
          >
            Következő lépés
          </Action>
        )}
      <section className="panel">
        <h3>Tételek</h3>
        {job.items.length ? (
          <div className="list">
            {job.items.map((item) => (
              <div className="list-row" key={item.id}>
                <div>
                  <strong>{item.name}</strong>
                  <p>
                    {item.quantity} {item.unit}
                  </p>
                  {JSON.parse(item.extrasJson).map(
                    (e: { name: string }, i: number) => (
                      <small key={i}>{e.name} </small>
                    ),
                  )}
                </div>
                <div className="actions">
                  <strong>{money(item.total)}</strong>
                  {office && (
                    <Action
                      disabled={!snapshot.canWrite}
                      onClick={async () => {
                        await api("jobs/" + id + "/remove-item", "POST", {
                          itemId: item.id,
                          version: job.version,
                        });
                        done();
                      }}
                    >
                      Eltávolítás
                    </Action>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">Még nincs felmért tétel.</p>
        )}
        {office && snapshot.canWrite && <ItemForm job={job} onDone={done} />}
      </section>
      <section className="panel">
        <h3>Átvétel és átadás</h3>
        <div className="actions">
          <a
            className="btn"
            href={
              "https://www.google.com/maps/search/?api=1&query=" +
              encodeURIComponent(job.customerAddress)
            }
            target="_blank"
            rel="noreferrer"
          >
            Navigáció <ExternalLink size={15} />
          </a>
          {snapshot.canWrite && (
            <>
              <button
                className="btn"
                disabled={current?.kind !== "NEW"}
                onClick={() => setSignature("PICKUP")}
              >
                Átvétel aláírással
              </button>
              <button
                className="btn"
                disabled={!["READY", "DELIVERY"].includes(current?.kind || "")}
                onClick={() => setSignature("DELIVERY")}
              >
                Átadás aláírással
              </button>
            </>
          )}
        </div>
        {signature && (
          <Signature
            job={job}
            kind={signature}
            onDone={() => {
              setSignature(null);
              done();
            }}
            onCancel={() => setSignature(null)}
          />
        )}
      </section>
      {office && (
        <section className="panel">
          <h3>Ügyfélkövetés</h3>
          <div className="actions">
            <Action
              disabled={!snapshot.canWrite}
              onClick={async () => {
                const r = await api<{ url: string }>(
                  "jobs/" + id + "/tracking",
                  "POST",
                  {},
                );
                setTracking(r.url);
              }}
            >
              Követőlink megjelenítése
            </Action>
            <Action
              disabled={!snapshot.canWrite}
              onClick={async () => {
                const r = await api<{ url: string }>(
                  "jobs/" + id + "/tracking",
                  "POST",
                  { rotate: true },
                );
                setTracking(r.url);
              }}
            >
              Új link
            </Action>
            <Action
              disabled={!snapshot.canWrite}
              onClick={async () => {
                await api("jobs/" + id + "/tracking", "POST", { revoke: true });
                setTracking("");
              }}
            >
              Link visszavonása
            </Action>
          </div>
          {tracking && (
            <div className="actions">
              <a
                className="link"
                href={tracking}
                target="_blank"
                rel="noreferrer"
              >
                {tracking}
              </a>
              <Action onClick={() => navigator.clipboard.writeText(tracking)}>
                Másolás
              </Action>
            </div>
          )}
        </section>
      )}
      <section className="panel">
        <h3>Fotók és dokumentumok</h3>
        {snapshot.canWrite && (
          <AsyncForm
            submit="Fotó feltöltése"
            onSubmit={async (form) => {
              form.set("kind", "PHOTO");
              await api("jobs/" + id + "/upload", "POST", form);
              done();
            }}
          >
            <Field label="PNG, JPG vagy WebP, legfeljebb 10 MB">
              <input
                type="file"
                name="file"
                accept="image/png,image/jpeg,image/webp"
                required
              />
            </Field>
          </AsyncForm>
        )}
        {job.files.map((f) => (
          <div className="list-row" key={f.id}>
            <a
              href={"/api/crm/files/" + f.id}
              target="_blank"
              rel="noreferrer"
              className="link"
            >
              {f.filename} ({f.kind})
            </a>
            {office && f.kind === "PHOTO" && (
              <Action
                disabled={!snapshot.canWrite}
                onClick={async () => {
                  await api("files/" + f.id, "PATCH", {
                    isPublic: !f.isPublic,
                  });
                  done();
                }}
              >
                {f.isPublic
                  ? "Ügyfél elől elrejtés"
                  : "Ügyfélnek láthatóvá tesz"}
              </Action>
            )}
          </div>
        ))}
        {office && (
          <div className="actions">
            <Action
              disabled={!snapshot.canWrite}
              onClick={async () => {
                await api("jobs/" + id + "/labels", "POST", {});
                done();
              }}
            >
              QR-címkék készítése
            </Action>
            {snapshot.tenant.plan === "BUSINESS" &&
              ["OWNER", "ADMIN"].includes(snapshot.role) && (
                <Action
                  disabled={!snapshot.canWrite}
                  onClick={async () => {
                    await api("jobs/" + id + "/invoice", "POST", {});
                    done();
                  }}
                >
                  Számla kiállítása
                </Action>
              )}
          </div>
        )}
        <p className="subtle-note">
          A dokumentumok háttérben készülnek. Elkészültük után frissítsd a
          munkalapot.
        </p>
        <button className="btn" onClick={done}>
          Frissítés
        </button>
      </section>
      <section className="panel">
        <h3>Előzmények</h3>
        {job.events.map((e) => (
          <p key={e.id}>
            <small className="muted">
              {new Date(e.createdAt).toLocaleString("hu-HU")} ·{" "}
            </small>
            {e.message}
          </p>
        ))}
      </section>
      {office && (
        <Action
          disabled={!snapshot.canWrite}
          onClick={() => send({ archived: !job.archived })}
        >
          {job.archived ? "Archiválás visszavonása" : "Archiválás"}
        </Action>
      )}
    </div>
  );
}
function ItemForm({ job, onDone }: { job: JobDetail; onDone: () => void }) {
  const { snapshot } = useApp(),
    rules = snapshot.catalog.filter((r) => !r.isExtra && r.active),
    [ruleId, setRuleId] = useState(rules[0]?.id || "");
  if (!rules.length)
    return <Notice>Először adj meg szolgáltatásokat az árlistában.</Notice>;
  return (
    <AsyncForm
      submit="Tétel hozzáadása"
      onSubmit={async (form) => {
        const values = formValues(form);
        await api("jobs/" + job.id + "/items", "POST", {
          version: job.version,
          ruleId,
          quantity: Number(values.quantity || 1),
          ...(snapshot.catalog.find((r) => r.id === ruleId)?.unit === "M2"
            ? { width: Number(values.width), length: Number(values.length) }
            : {}),
          extras: form.getAll("extras"),
        });
        onDone();
      }}
    >
      <Field label="Szolgáltatás">
        <select value={ruleId} onChange={(e) => setRuleId(e.target.value)}>
          {rules.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name} · {money(r.unitPrice)}/{r.unit}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid two">
        {snapshot.catalog.find((r) => r.id === ruleId)?.unit === "M2" ? (
          <>
            <Field
              name="width"
              label="Szélesség (m)"
              type="number"
              step="0.01"
              min={0.01}
              max={100}
              required
            />
            <Field
              name="length"
              label="Hosszúság (m)"
              type="number"
              step="0.01"
              min={0.01}
              max={100}
              required
            />
          </>
        ) : (
          <Field
            name="quantity"
            label="Mennyiség"
            type="number"
            step="0.01"
            min={0.01}
            defaultValue={1}
          />
        )}
      </div>
      {snapshot.catalog
        .filter((r) => r.isExtra && r.active)
        .map((r) => (
          <label className="check-label" key={r.id}>
            <input type="checkbox" name="extras" value={r.id} />
            {r.name} · {money(r.unitPrice)}
          </label>
        ))}
    </AsyncForm>
  );
}
function Signature({
  job,
  kind,
  onDone,
  onCancel,
}: {
  job: JobDetail;
  kind: "PICKUP" | "DELIVERY";
  onDone: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null),
    drawing = useRef(false),
    [signed, setSigned] = useState(false);
  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget,
      rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) * canvas.width) / rect.width,
      y: ((e.clientY - rect.top) * canvas.height) / rect.height,
    };
  };
  return (
    <div className="form">
      <p>
        Az ügyfél aláírásával igazolja az alább szereplő{" "}
        {kind === "PICKUP" ? "átvételt" : "átadást"}.
      </p>
      <p>
        {job.jobCode} · {job.quickCount || job.items.length} tétel ·{" "}
        {money(job.totalAmount)}
      </p>
      <canvas
        ref={ref}
        className="signature"
        width={920}
        height={360}
        aria-label="Ügyfél aláírása"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          drawing.current = true;
          const p = point(e),
            ctx = e.currentTarget.getContext("2d")!;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
        }}
        onPointerMove={(e) => {
          if (!drawing.current) return;
          const p = point(e),
            ctx = e.currentTarget.getContext("2d")!;
          ctx.strokeStyle = "#14243a";
          ctx.lineWidth = 4;
          ctx.lineCap = "round";
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
          setSigned(true);
        }}
        onPointerUp={() => (drawing.current = false)}
        onPointerCancel={() => (drawing.current = false)}
      />
      <div className="actions">
        <button
          className="btn"
          onClick={() => {
            const canvas = ref.current!;
            canvas
              .getContext("2d")!
              .clearRect(0, 0, canvas.width, canvas.height);
            setSigned(false);
          }}
        >
          Törlés
        </button>
        <button className="btn" onClick={onCancel}>
          Mégse
        </button>
        <Action
          disabled={!signed}
          className="primary"
          onClick={async () => {
            const blob = await new Promise<Blob | null>((resolve) =>
              ref.current!.toBlob(resolve, "image/png"),
            );
            if (!blob) throw new Error("Az aláírás nem menthető.");
            const form = new FormData();
            form.set("file", blob, "alairas.png");
            form.set("kind", "SIGNATURE");
            const file = await api<{ id: string }>(
              "jobs/" + job.id + "/upload",
              "POST",
              form,
            );
            await api("jobs/" + job.id + "/handover", "POST", {
              signatureFileId: file.id,
              kind,
              version: job.version,
            });
            onDone();
          }}
        >
          Aláírás és {kind === "PICKUP" ? "átvétel" : "átadás"} mentése
        </Action>
      </div>
    </div>
  );
}
