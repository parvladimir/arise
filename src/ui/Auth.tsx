"use client";

import { useState } from "react";
import type { GameApi } from "./useGame";

export type AuthSubmit = (mode: "login" | "register", email: string, password: string) => Promise<string | null>;

/** Вход и регистрация по почте и паролю: прогресс игрока хранится в базе, а не в браузере. */
export function AuthForm({ t, submit }: { t: GameApi["t"]; submit: AuthSubmit }) {
  const [mode, setMode] = useState<"register" | "login">("register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="anim-rise mx-auto mt-9 w-full max-w-sm rounded-2xl border border-white/10 bg-surface/80 p-5 text-left shadow-2xl shadow-ai/20 backdrop-blur lg:mx-0"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        const err = await submit(mode, email, password);
        setBusy(false);
        if (err) setError(err);
      }}
    >
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-bg/70 p-1" role="tablist">
        {(["register", "login"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => { setMode(m); setError(null); }}
            className={`rounded-lg py-2 text-sm font-semibold transition ${mode === m ? "bg-ai text-white shadow" : "text-muted hover:text-ink"}`}
          >
            {t(`ui.auth.${m}`)}
          </button>
        ))}
      </div>
      <p className="mt-3 text-sm text-muted">{t(mode === "register" ? "ui.auth.registerHint" : "ui.auth.loginHint")}</p>
      <label className="mt-4 block text-sm text-muted" htmlFor="auth-email">{t("ui.auth.email")}</label>
      <input
        id="auth-email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="mt-1.5 w-full rounded-lg border border-line bg-bg px-3 py-2.5 outline-none focus:border-ai"
      />
      <label className="mt-3 block text-sm text-muted" htmlFor="auth-pass">{t("ui.auth.password")}</label>
      <input
        id="auth-pass"
        type="password"
        autoComplete={mode === "register" ? "new-password" : "current-password"}
        required
        minLength={mode === "register" ? 8 : undefined}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="mt-1.5 w-full rounded-lg border border-line bg-bg px-3 py-2.5 outline-none focus:border-ai"
      />
      {mode === "register" && <p className="mt-1 text-xs text-muted">{t("ui.auth.passwordRule")}</p>}
      {error && <p role="alert" className="mt-3 rounded-lg bg-bad/15 px-3 py-2 text-sm text-bad">{t(`ui.auth.err.${error}`)}</p>}
      <button type="submit" disabled={busy} className="menu-cta mt-4 w-full rounded-xl px-6 py-3.5 text-lg font-semibold text-white disabled:opacity-60">
        <span className="relative">{busy ? "…" : t(mode === "register" ? "ui.auth.registerGo" : "ui.auth.loginGo")} →</span>
      </button>
    </form>
  );
}
