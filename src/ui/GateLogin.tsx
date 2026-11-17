"use client";
// Блок «Уже есть доступ?» на промо-странице: вход по почте и паролю или повторная ссылка из бота.

import { useState } from "react";

const ERR: Record<string, string | undefined> = {
  wrongLogin: "Неверная почта или пароль.",
  tooMany: "Слишком много попыток. Подожди 15 минут.",
  network: "Нет связи с сервером. Попробуй ещё раз.",
};

export function GateLogin({ botUrl }: { botUrl: string }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (r.ok) {
        window.location.href = "/";
        return;
      }
      const j = await r.json().catch(() => ({}));
      setErr(ERR[String(j.error)] ?? "Не получилось войти. Обнови страницу и попробуй ещё раз.");
    } catch {
      setErr(ERR.network ?? null);
    }
    setBusy(false);
  }

  return (
    <div className="mx-auto mt-6 max-w-md rounded-2xl border border-cyan-400/30 bg-cyan-400/5 p-4 text-left lg:mx-0">
      <p className="font-bold">🔑 Доступ уже есть?</p>
      <p className="mt-1 text-sm text-muted">
        Напиши боту ещё раз: он пришлёт твою личную ссылку снова, прогресс на месте. Или войди по почте, если заводил аккаунт в игре.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <a
          href={botUrl}
          className="inline-flex min-h-11 items-center rounded-xl border border-white/15 px-4 text-sm font-semibold transition hover:border-white/30"
        >
          ✈ Моя ссылка в боте
        </a>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="inline-flex min-h-11 items-center rounded-xl border border-white/15 px-4 text-sm font-semibold transition hover:border-white/30"
        >
          ✉ Войти по почте
        </button>
      </div>
      {open && (
        <form onSubmit={submit} className="mt-3 grid gap-2">
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="Почта"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="min-h-11 rounded-xl border border-white/15 bg-black/30 px-3 text-base"
          />
          <input
            type="password"
            required
            autoComplete="current-password"
            placeholder="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="min-h-11 rounded-xl border border-white/15 bg-black/30 px-3 text-base"
          />
          {err && <p role="alert" className="text-sm text-bad">{err}</p>}
          <button
            type="submit"
            disabled={busy}
            className="min-h-11 rounded-xl bg-ai px-4 font-bold text-white transition hover:brightness-110 disabled:opacity-60"
          >
            {busy ? "Вхожу…" : "Войти в игру"}
          </button>
        </form>
      )}
    </div>
  );
}
