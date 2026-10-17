"use client";
import {
  createContext,
  useContext,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from "react";
type Theme = "light" | "dark";
const ThemeContext = createContext<{
  theme: Theme;
  toggleTheme: () => void;
} | null>(null);
function subscribe(callback: () => void) {
  window.addEventListener("hh-theme", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("hh-theme", callback);
    window.removeEventListener("storage", callback);
  };
}
function read(): Theme {
  try {
    return localStorage.getItem("hogyhalad-theme") === "dark"
      ? "dark"
      : "light";
  } catch {
    return "light";
  }
}
export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(subscribe, read, () => "light" as Theme);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);
  const toggleTheme = () => {
    try {
      localStorage.setItem(
        "hogyhalad-theme",
        theme === "light" ? "dark" : "light",
      );
      window.dispatchEvent(new Event("hh-theme"));
    } catch {
      /* Storage disabled: the current page remains usable. */
    }
  };
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("ThemeProvider szükséges.");
  return value;
}
