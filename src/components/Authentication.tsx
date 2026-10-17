"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { navigate, api, formValues, useRemote } from "@/lib/client";
import { AsyncForm, Field, Notice, Loading } from "./ui";
import { templates } from "@/lib/domain";
export function SignIn() {
  const [sent, setSent] = useState(false),
    [google, setGoogle] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    fetch("/api/public/config")
      .then((r) => r.json() as Promise<{ googleEnabled: boolean }>)
      .then((c) => setGoogle(c.googleEnabled))
      .catch(() => setGoogle(false));
  }, []);
  return (
    <main className="standalone">
      <Link href="/" className="brand">
        HogyHalad<span className="brand-dot">.</span>
      </Link>
      <div className="panel auth-card">
        <div>
          <h1>Jó újra itt látni.</h1>
          <p className="muted">
            Jelentkezz be, vagy hozz létre fiókot jelszó nélkül.
          </p>
        </div>
        {google && (
          <button
            className="btn"
            onClick={async () => {
              setError("");
              const result = await authClient.signIn.social({
                provider: "google",
                callbackURL: "/dashboard",
                newUserCallbackURL: "/onboarding",
              });
              if (result.error)
                setError(
                  result.error.message || "A Google-belépés nem sikerült.",
                );
            }}
          >
            Folytatás Google-fiókkal
          </button>
        )}
        {error && <Notice error>{error}</Notice>}
        {sent ? (
          <Notice>
            Elküldtük a belépési linket. Ellenőrizd az e-mailjeidet; a link 15
            percig, egyszer használható.
          </Notice>
        ) : (
          <AsyncForm
            submit="Belépési link küldése"
            onSubmit={async (form) => {
              const email = String(form.get("email"));
              const result = await authClient.signIn.magicLink({
                email,
                name: email.split("@")[0],
                callbackURL: "/dashboard",
                newUserCallbackURL: "/onboarding",
                errorCallbackURL: "/sign-in?error=invalid",
              });
              if (result.error)
                throw new Error(
                  result.error.message || "A belépőlevél nem küldhető.",
                );
              setSent(true);
            }}
          >
            <Field label="E-mail-cím" name="email" type="email" required />
          </AsyncForm>
        )}
        <p className="subtle-note">A belépési linket ne oszd meg másokkal.</p>
      </div>
    </main>
  );
}
export function Onboarding() {
  const { data, error } = useRemote<{
    companies: { id: string; name: string }[];
    user: { email: string };
  }>("companies");
  if (!data)
    return (
      <main className="standalone">
        {error ? <Notice error>{error}</Notice> : <Loading />}
      </main>
    );
  return (
    <main className="standalone">
      <Link href="/" className="brand">
        HogyHalad<span className="brand-dot">.</span>
      </Link>
      <div>
        <h1>A vállalkozásod munkaterülete</h1>
        <p className="muted">
          Az első lépés a cégadatok megadása. A hétnapos próba a Stripe
          kártyamegadás után indul.
        </p>
      </div>
      {data.companies.length > 0 && (
        <div className="panel">
          <h2>Meglévő cégeid</h2>
          {data.companies.map((c) => (
            <button
              key={c.id}
              className="btn"
              onClick={async () => {
                await api("switch-company", "POST", { id: c.id });
                navigate("/dashboard");
              }}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}
      <div className="panel">
        <AsyncForm
          submit="Munkaterület létrehozása"
          onSubmit={async (form) => {
            const values = formValues(form),
              result = await api<{ id: string }>("companies", "POST", values);
            await api("switch-company", "POST", result);
            navigate("/dashboard/billing");
          }}
        >
          <Field name="name" label="Cég vagy vállalkozás neve" required />
          <Field
            name="slug"
            label="Céges azonosító"
            required
            placeholder="pelda-szolgaltato"
          />
          <p className="subtle-note">
            Kisbetűk, számok és kötőjelek. Feladó: azonosító@hogyhalad.hu
          </p>
          <Field
            name="email"
            label="Céges kapcsolattartási e-mail"
            type="email"
            required
            defaultValue={data.user.email}
          />
          <Field name="phone" label="Telefon" type="tel" required />
          <Field name="address" label="Számlázási utca, házszám" required />
          <div className="grid two">
            <Field name="zip" label="Irányítószám" required />
            <Field name="city" label="Település" required />
          </div>
          <Field name="taxNumber" label="Adószám" />
          <Field label="Szolgáltatássablon">
            <select name="template">
              {Object.entries(templates).map(([id, t]) => (
                <option value={id} key={id}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>
        </AsyncForm>
      </div>
    </main>
  );
}
export function Invitation() {
  const [result, setResult] = useState(""),
    [error, setError] = useState("");
  return (
    <main className="standalone">
      <Link href="/" className="brand">
        HogyHalad.
      </Link>
      <h1>Csatlakozás a céghez</h1>
      <p>
        A meghívott e-mail-címmel jelentkezz be, majd fogadd el a meghívást.
      </p>
      <Link className="btn" href="/sign-in">
        Belépés
      </Link>
      <button
        className="btn primary"
        onClick={async () => {
          try {
            const token = new URL(window.location.href).searchParams.get(
              "token",
            );
            const data = await api<{ id: string }>(
              "accept-invitation",
              "POST",
              { token },
            );
            await api("switch-company", "POST", data);
            setResult("Sikeresen csatlakoztál.");
            navigate("/dashboard");
          } catch (err) {
            setError((err as Error).message);
          }
        }}
      >
        Meghívás elfogadása
      </button>
      {result && <Notice>{result}</Notice>}
      {error && <Notice error>{error}</Notice>}
    </main>
  );
}
