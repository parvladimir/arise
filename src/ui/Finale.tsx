"use client";

import { content } from "@/content";
import { starsFor } from "@/core/engine";
import type { GameState } from "@/core/types";
import { Mascot } from "./Mascot";
import { TG_URL } from "./useTaktNews";
import type { GameApi } from "./useGame";

/** Конец версии: итоги, звёзды и приглашение в канал за новыми главами. Показывается один раз. */
export function Finale({ game, state, openDaily }: { game: GameApi; state: GameState; openDaily: () => void }) {
  const { t, dispatch } = game;
  const scored = content.quests.filter((q) => (q.kind === "prompt" || q.kind === "classify") && q.reward.pay && state.quests[q.id]?.status === "done");
  const stars = scored.reduce((n, q) => n + starsFor(state.quests[q.id]!.bestQuality), 0);
  const earned = state.ledger.filter((e) => e.delta > 0).reduce((n, e) => n + e.delta, 0);
  const close = () => dispatch({ type: "seeFinale" });
  const stats = [
    { label: t("ui.finale.stars"), value: `★ ${stars}/${scored.length * 3}`, tone: "text-gold" },
    { label: t("ui.finale.streak"), value: `🔥 ${state.bestStreak ?? 0}`, tone: "text-gold" },
    { label: t("ui.finale.orders"), value: String(scored.length), tone: "text-ai" },
    { label: t("ui.finale.earned"), value: `${earned.toLocaleString("ru-RU")} ₵`, tone: "text-ok" },
  ];
  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-bg/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="finale">
      <div className="act-card anim-rise relative w-full max-w-lg overflow-hidden rounded-3xl border border-ai/40 bg-surface p-6 shadow-2xl shadow-ai/25 sm:p-8">
        <div className="act-glow pointer-events-none absolute inset-0" aria-hidden />
        <div className="relative">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-ok">{t("ui.finale.kicker")}</p>
              <h2 id="finale" className="takt-text mt-2 text-3xl font-black leading-tight sm:text-4xl">{t("ui.finale.title")}</h2>
            </div>
            <Mascot pose="wave" mood="happy" className="pointer-events-none h-20 shrink-0 sm:h-28" />
          </div>
          <p className="mt-3 leading-snug text-muted">{t("ui.finale.text")}</p>
          <dl className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {stats.map((s, i) => (
              <div key={s.label} className="anim-rise rounded-xl border border-line bg-bg/50 p-3 text-center" style={{ animationDelay: `${150 + i * 90}ms` }}>
                <dt className="text-[11px] uppercase tracking-wide text-muted">{s.label}</dt>
                <dd className={`mt-1 whitespace-nowrap font-mono text-lg font-bold ${s.tone}`}>{s.value}</dd>
              </div>
            ))}
          </dl>
          <a
            href={TG_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="menu-cta mt-6 flex w-full items-center justify-center gap-2 rounded-xl px-3 py-3 text-center font-semibold text-white"
          >
            <span className="relative">✈️ {t("ui.finale.channel")}</span>
          </a>
          <p className="mt-4 rounded-xl border border-line bg-bg/40 p-3 text-sm leading-snug text-muted">{t("ui.finale.dailyHint")}</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <button
              onClick={() => {
                close();
                openDaily();
              }}
              className="rounded-xl bg-ai py-2.5 font-semibold text-white shadow-lg shadow-ai/30 hover:brightness-110"
            >
              📅 {t("ui.finale.daily")}
            </button>
            <button onClick={close} className="rounded-xl border border-line py-2.5 font-semibold text-muted hover:bg-surface-2 hover:text-ink">
              {t("ui.finale.later")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
