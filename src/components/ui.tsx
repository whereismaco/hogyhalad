"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
export function Notice({
  children,
  error = false,
}: {
  children: ReactNode;
  error?: boolean;
}) {
  return (
    <div
      className={error ? "notice error" : "notice"}
      role={error ? "alert" : "status"}
    >
      {children}
    </div>
  );
}
export function Loading() {
  return (
    <p className="muted" role="status">
      Betöltés…
    </p>
  );
}
export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}
export function PageTitle({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="page-title">
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
      </div>
      {actions && <div className="actions">{actions}</div>}
    </header>
  );
}
export function Field({
  label,
  name,
  type = "text",
  required = false,
  defaultValue,
  children,
  ...props
}: {
  label: string;
  name?: string;
  type?: string;
  required?: boolean;
  defaultValue?: string | number;
  children?: ReactNode;
  min?: number;
  max?: number;
  step?: string;
  placeholder?: string;
  readOnly?: boolean;
}) {
  return (
    <label className="field">
      <span>
        {label}
        {required ? " *" : ""}
      </span>
      {children || (
        <input
          name={name}
          type={type}
          defaultValue={defaultValue}
          required={required}
          {...props}
        />
      )}
    </label>
  );
}
export function AsyncForm({
  children,
  onSubmit,
  submit = "Mentés",
  className = "",
}: {
  children: ReactNode;
  onSubmit: (data: FormData) => Promise<void>;
  submit?: string;
  className?: string;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState(false);
  return (
    <form
      className={"form " + className}
      onSubmit={async (e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        setBusy(true);
        setError("");
        setSuccess(false);
        try {
          await onSubmit(data);
          setSuccess(true);
        } catch (err) {
          setError(
            err instanceof Error ? err.message : "Nem sikerült a mentés.",
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <fieldset disabled={busy}>{children}</fieldset>
      {error && <Notice error>{error}</Notice>}
      {success && <Notice>A kérés rögzítve.</Notice>}
      <button className="btn primary" disabled={busy} type="submit">
        {busy ? "Folyamatban…" : submit}
      </button>
    </form>
  );
}
export function Action({
  children,
  onClick,
  disabled = false,
  className = "",
}: {
  children: ReactNode;
  onClick: () => Promise<unknown>;
  disabled?: boolean;
  className?: string;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <span className="action-wrap">
      <button
        className={"btn " + className}
        disabled={busy || disabled}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            await onClick();
          } catch (err) {
            setError(
              err instanceof Error ? err.message : "A művelet nem sikerült.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Folyamatban…" : children}
      </button>
      {error && (
        <small role="alert" className="error-text">
          {error}
        </small>
      )}
    </span>
  );
}
export function Dialog({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="dialog-head">
        <h2>{title}</h2>
        <button className="icon-btn" aria-label="Bezárás" onClick={onClose}>
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function CustomerFields({
  customer,
}: {
  customer?: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    zip?: string;
    city?: string;
    taxNumber?: string;
    notes?: string;
  };
}) {
  return (
    <>
      <Field name="name" label="Név" required defaultValue={customer?.name} />
      <div className="grid two">
        <Field
          name="email"
          label="E-mail"
          type="email"
          defaultValue={customer?.email}
        />
        <Field
          name="phone"
          label="Telefon"
          required
          defaultValue={customer?.phone}
        />
      </div>
      <div className="grid two">
        <Field name="zip" label="Irányítószám" defaultValue={customer?.zip} />
        <Field name="city" label="Település" defaultValue={customer?.city} />
      </div>
      <Field
        name="address"
        label="Utca, házszám"
        defaultValue={customer?.address}
      />
      <Field
        name="taxNumber"
        label="Adószám (céges számlázáshoz)"
        defaultValue={customer?.taxNumber}
      />
      <Field label="Megjegyzés">
        <textarea
          name="notes"
          maxLength={4000}
          defaultValue={customer?.notes}
        />
      </Field>
    </>
  );
}
