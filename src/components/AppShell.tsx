"use client";
import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Layers,
  Inbox,
  Truck,
  Calculator,
  Sparkles,
  Settings,
  Users,
  CreditCard,
  Menu,
  X,
  LogOut,
  ArrowUpRight,
} from "lucide-react";
import { navigate, api, useRemote } from "@/lib/client";
import type { Snapshot } from "@/types/app";
import { ThemeToggle } from "./ThemeToggle";
import { Action, Loading, Notice } from "./ui";
const Context = createContext<{
  snapshot: Snapshot;
  refresh: () => void;
  revision: number;
} | null>(null);
export function useApp() {
  const context = useContext(Context);
  if (!context) throw new Error("Az alkalmazás még nem töltődött be.");
  return context;
}
const nav = [
  { name: "Áttekintés", href: "/dashboard", icon: LayoutDashboard },
  { name: "Munkák", href: "/dashboard/jobs", icon: Layers },
  { name: "Ügyfelek", href: "/dashboard/customers", icon: Users, office: true },
  {
    name: "Megkeresések",
    href: "/dashboard/inquiries",
    icon: Inbox,
    office: true,
  },
  { name: "Szállítások", href: "/dashboard/dispatch", icon: Truck },
  {
    name: "Árlista és kalkulátor",
    href: "/dashboard/calculator",
    icon: Calculator,
    office: true,
  },
  {
    name: "AI asszisztens",
    href: "/dashboard/ai",
    icon: Sparkles,
    office: true,
  },
  {
    name: "Előfizetés",
    href: "/dashboard/billing",
    icon: CreditCard,
    owner: true,
  },
  {
    name: "Beállítások",
    href: "/dashboard/settings",
    icon: Settings,
    admin: true,
  },
];
export function AppShell({ children }: { children: ReactNode }) {
  const [revision, setRevision] = useState(0),
    [open, setOpen] = useState(false),
    pathname = usePathname();
  const refresh = useCallback(() => setRevision((r) => r + 1), []),
    { data: snapshot, error } = useRemote<Snapshot>("snapshot", revision);
  if (!snapshot)
    return (
      <main className="standalone">
        <Link href="/" className="brand">
          HogyHalad<span className="brand-dot">.</span>
        </Link>
        {error ? (
          <Notice error>
            {error} <Link href="/onboarding">Cég létrehozása</Link> ·{" "}
            <Link href="/sign-in">Belépés</Link>
          </Notice>
        ) : (
          <Loading />
        )}
      </main>
    );
  const isOffice = ["OWNER", "ADMIN", "DISPATCHER"].includes(snapshot.role);
  return (
    <Context.Provider value={{ snapshot, refresh, revision }}>
      <div className="mobile-bar">
        <Link href="/dashboard" className="brand">
          HogyHalad<span className="brand-dot">.</span>
        </Link>
        <button
          className="icon-btn"
          aria-label="Menü"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>
      {open && (
        <button
          className="sidebar-overlay"
          aria-label="Menü bezárása"
          onClick={() => setOpen(false)}
        />
      )}
      <aside className={"sidebar " + (open ? "is-open" : "")}>
        <Link href="/dashboard" className="brand">
          HogyHalad<span className="brand-dot">.</span>
        </Link>
        <label className="company-switch">
          <span className="eyebrow">Munkaterület</span>
          <select
            aria-label="Cég választása"
            value={snapshot.tenant.id}
            onChange={async (e) => {
              await api("switch-company", "POST", { id: e.target.value });
              navigate("/dashboard");
            }}
          >
            {snapshot.companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <nav aria-label="Főmenü">
          {nav
            .filter(
              (n) =>
                (!n.office || isOffice) &&
                (!n.owner || snapshot.role === "OWNER") &&
                (!n.admin || ["OWNER", "ADMIN"].includes(snapshot.role)),
            )
            .map((n) => (
              <Link
                key={n.href}
                href={n.href}
                aria-current={pathname === n.href ? "page" : undefined}
                className={pathname === n.href ? "active" : ""}
                onClick={() => setOpen(false)}
              >
                <n.icon size={18} />
                {n.name}
              </Link>
            ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="usage">
            <strong>{snapshot.usage.limits.name}</strong>
            <span>
              {snapshot.usage.jobs} / {snapshot.usage.limits.jobs} munka
            </span>
            <progress
              value={snapshot.usage.jobs}
              max={snapshot.usage.limits.jobs}
            />
          </div>
          <div className="profile">
            <div>
              <strong>{snapshot.user.name}</strong>
              <small>{snapshot.user.email}</small>
            </div>
            <ThemeToggle />
          </div>
          <Action
            onClick={async () => {
              const response = await fetch("/api/auth/sign-out", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: "{}",
              });
              if (!response.ok)
                throw new Error("A kijelentkezés nem sikerült.");
              navigate("/sign-in");
            }}
          >
            <LogOut size={16} />
            Kijelentkezés
          </Action>
        </div>
      </aside>
      <main className="workspace">
        <div className="workspace-top">
          <span>{snapshot.tenant.name}</span>
          <span className="badge">{snapshot.role}</span>
        </div>
        {!snapshot.canWrite && (
          <Notice>
            Az adatok olvashatók. A módosításhoz indíts vagy rendezz
            előfizetést.{" "}
            {snapshot.role === "OWNER" && (
              <Link href="/dashboard/billing">
                Előfizetés <ArrowUpRight size={14} />
              </Link>
            )}
          </Notice>
        )}
        <div className="page-content">{children}</div>
      </main>
    </Context.Provider>
  );
}
