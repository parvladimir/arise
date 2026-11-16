"use client";

import { useCallback, useEffect, useState } from "react";
import type { Account } from "./useGame";

export type AccountState = { status: "loading" } | { status: "guest" } | { status: "user"; user: Account };

/** Кто сейчас вошёл в игру. Сессия хранится в httpOnly-куке, сам токен скрипту недоступен. */
export function useAccount() {
  const [account, setAccount] = useState<AccountState>({ status: "loading" });

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json() as Promise<{ user: Account | null }>)
      .then((b) => setAccount(b.user ? { status: "user", user: b.user } : { status: "guest" }))
      .catch(() => setAccount({ status: "guest" }));
  }, []);

  const submit = useCallback(async (mode: "login" | "register", email: string, password: string): Promise<string | null> => {
    try {
      const r = await fetch(`/api/auth/${mode}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const b = (await r.json()) as { user?: Account; error?: string };
      if (b.user) {
        setAccount({ status: "user", user: b.user });
        return null;
      }
      return b.error ?? "network";
    } catch {
      return "network";
    }
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    setAccount({ status: "guest" });
  }, []);

  return { account, submit, logout };
}
