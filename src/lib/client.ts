"use client";
import { useCallback, useEffect, useState } from "react";
// A document navigation clears the previous company's in-memory data after a switch or logout.
export function navigate(path: string) {
  window.location.assign(new URL(path, window.location.origin).href);
}
export async function api<T = Record<string, unknown>>(
  path: string,
  method = "GET",
  data?: unknown,
): Promise<T> {
  const response = await fetch("/api/crm/" + path, {
    method,
    headers:
      data instanceof FormData
        ? undefined
        : data === undefined
          ? undefined
          : { "Content-Type": "application/json" },
    body:
      data instanceof FormData
        ? data
        : data === undefined
          ? undefined
          : JSON.stringify(data),
  });
  if (response.status === 401) {
    navigate("/sign-in");
    throw new Error("Jelentkezz be.");
  }
  const result = (await response.json()) as { error?: string };
  if (!response.ok) throw new Error(result.error || "A művelet nem sikerült.");
  return result as T;
}
export function useRemote<T>(path: string | null, revision = 0) {
  const [state, setState] = useState<{
    path: string | null;
    data: T | null;
    error: string;
  }>({ path: null, data: null, error: "" });
  const [nonce, setNonce] = useState(0);
  const reload = useCallback(() => setNonce((n) => n + 1), []);
  useEffect(() => {
    if (!path) return;
    let current = true;
    api<T>(path)
      .then((data) => {
        if (current) setState({ path, data, error: "" });
      })
      .catch((error) => {
        if (current) setState({ path, data: null, error: error.message });
      });
    return () => {
      current = false;
    };
  }, [path, nonce, revision]);
  return {
    data: state.path === path ? state.data : null,
    error: state.path === path ? state.error : "",
    reload,
  };
}
export function formValues(form: FormData) {
  return Object.fromEntries(form.entries()) as Record<string, string>;
}
