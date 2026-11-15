"use client";

import { useState } from "react";
import type { GameApi } from "./useGame";

export function Menu({ game }: { game: GameApi }) {
  const { t, hasSave } = game;
  const [confirm, setConfirm] = useState(false);

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 py-10">
      {/* Свечение — радиальными градиентами, без filter: blur: размытый слой под анимированным
          блоком браузеры обрезают в тёмный прямоугольник вокруг текста. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 33%, rgb(79 140 255 / 0.22), transparent 340px), radial-gradient(circle at 100% 100%, rgb(245 181 68 / 0.10), transparent 260px)",
        }}
      />
      <div className="anim-rise relative w-full max-w-md text-center">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-ok">2026 · прототип</p>
        <h1 className="mt-3 text-5xl font-black tracking-tight sm:text-6xl">
          AI <span className="text-ai">RISE</span>
        </h1>
        <p className="mt-3 text-lg text-muted">{t("ui.subtitle")}</p>

        <div className="mt-10 flex flex-col gap-3">
          {hasSave && (
            <button onClick={game.continueGame} className="rounded-xl bg-ai px-6 py-3.5 text-lg font-semibold text-white shadow-lg shadow-ai/30 transition hover:brightness-110">
              {t("ui.continue")}
            </button>
          )}
          {!confirm ? (
            <button
              onClick={() => (hasSave ? setConfirm(true) : game.setScreen("create"))}
              className={`rounded-xl px-6 py-3.5 text-lg font-semibold transition ${hasSave ? "border border-line bg-surface hover:bg-surface-2" : "bg-ai text-white shadow-lg shadow-ai/30 hover:brightness-110"}`}
            >
              {t("ui.newGame")}
            </button>
          ) : (
            <div className="rounded-xl border border-line bg-surface p-4">
              <p className="text-sm text-muted">{t("ui.resetConfirm")}</p>
              <div className="mt-3 flex justify-center gap-3">
                <button onClick={() => { game.reset(); game.setScreen("create"); }} className="rounded-lg bg-bad/90 px-4 py-2 font-semibold text-white">{t("ui.yes")}</button>
                <button onClick={() => setConfirm(false)} className="rounded-lg border border-line px-4 py-2">{t("ui.no")}</button>
              </div>
            </div>
          )}
        </div>
        <p className="mt-8 text-xs text-muted">{t("ui.prototypeNote")}</p>
      </div>
    </main>
  );
}
