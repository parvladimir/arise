"use client";

import { useEffect, useState } from "react";
import { content } from "@/content";
import type { GameState, Toast } from "@/core/types";
import type { GameApi } from "./useGame";
import { Mascot } from "./Mascot";

type Live = Toast & { key: number };
let counter = 0;

export function Toasts({ game, state, hold = false }: { game: GameApi; state: GameState; hold?: boolean }) {
  const { t, dispatch } = game;
  const [live, setLive] = useState<Live[]>([]);
  const [milestone, setMilestone] = useState<string | null>(null);

  useEffect(() => {
    if (state.toasts.length === 0) return;
    const incoming = state.toasts;
    dispatch({ type: "clearToasts" });
    const m = incoming.find((x) => x.kind === "milestone");
    if (m && m.kind === "milestone") setMilestone(m.textKey);
    const items = incoming.filter((x) => x.kind !== "milestone").map((x) => ({ ...x, key: ++counter }));
    setLive((l) => [...l, ...items]);
    for (const it of items) setTimeout(() => setLive((l) => l.filter((x) => x.key !== it.key)), 3200);
  }, [state.toasts, dispatch]);

  const text = (x: Toast) => {
    switch (x.kind) {
      case "money": return t("ui.toast.money", { n: x.amount });
      case "xp": return t("ui.toast.xp", { n: x.amount });
      case "achievement": return t("ui.toast.achievement", { name: t(`ach.${x.id}`) });
      case "skill": return t("ui.toast.skill", { name: t(content.skills.find((s) => s.id === x.skill)?.nameKey ?? x.skill), level: x.level });
      case "unlock": return t("ui.toast.unlock", { name: t(`app.${x.app}`) });
      default: return "";
    }
  };
  const tone = (x: Toast) => (x.kind === "money" ? "text-gold" : x.kind === "xp" ? "text-ai" : x.kind === "achievement" ? "text-gold" : "text-ok");

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 lg:bottom-8" aria-live="polite">
        {live.map((x) => (
          <div key={x.key} className={`anim-rise rounded-xl border border-line bg-surface/95 px-4 py-2.5 text-sm font-semibold shadow-xl backdrop-blur ${tone(x)}`}>
            {text(x)}
          </div>
        ))}
      </div>
      {milestone === "milestone.actEnd" && !hold && <ActEnd game={game} state={state} onClose={() => setMilestone(null)} />}
      {milestone && milestone !== "milestone.actEnd" && !hold && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-bg/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="milestone">
          <div className="anim-rise w-full max-w-md rounded-2xl border border-ai/40 bg-surface p-7 text-center shadow-2xl shadow-ai/20">
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-ok">AI RISE</p>
            <h2 id="milestone" className="mt-3 text-2xl font-bold leading-snug">{t(milestone)}</h2>
            <button autoFocus onClick={() => setMilestone(null)} className="mt-6 rounded-xl bg-ai px-6 py-3 font-semibold text-white hover:brightness-110">
              {t("ui.neira.next")}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/** Итог первого акта: что заработано, какие решения приняты и что ждёт дальше. */
function ActEnd({ game, state, onClose }: { game: GameApi; state: GameState; onClose: () => void }) {
  const { t } = game;
  const earned = state.ledger.filter((e) => e.delta > 0).reduce((n, e) => n + e.delta, 0);
  const done = Object.values(state.quests).filter((q) => q.status === "done").length;
  const has = (f: string) => state.flags.includes(f);
  const choices = [
    has("declinedVolna") ? "ui.act.choiceAnna" : has("tookBoth") ? "ui.act.choiceBoth" : has("tookVolna") ? "ui.act.choiceVolna" : null,
    has("leakedData") ? "ui.act.choiceLeak" : has("careful") ? "ui.act.choiceCareful" : null,
  ].filter(Boolean) as string[];
  const stats = [
    { label: t("ui.act.earned"), value: `${earned} ₵`, tone: "text-gold" },
    { label: t("ui.act.quests"), value: String(done), tone: "text-ai" },
    { label: t("ui.act.rep"), value: String(state.rep), tone: "text-ok" },
    { label: "XP", value: String(state.xp), tone: "text-ai" },
  ];
  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-bg/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="act-end">
      <div className="act-card anim-rise relative w-full max-w-lg overflow-hidden rounded-3xl border border-ai/40 bg-surface p-6 shadow-2xl shadow-ai/25 sm:p-8">
        <div className="act-glow pointer-events-none absolute inset-0" aria-hidden />
        <Mascot pose="cheer" mood="happy" className="pointer-events-none absolute -right-3 top-2 h-24 opacity-95 sm:h-32" />
        <div className="relative">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-ok">{t("ui.act.kicker")}</p>
          <h2 id="act-end" className="mt-2 text-3xl font-black leading-tight sm:text-4xl">{t("ui.act.title")}</h2>
          <p className="mt-2 text-muted">{t("milestone.actEnd")}</p>
          <dl className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {stats.map((s, i) => (
              <div key={s.label} className="anim-rise rounded-xl border border-line bg-bg/50 p-3 text-center" style={{ animationDelay: `${150 + i * 90}ms` }}>
                <dt className="text-[11px] uppercase tracking-wide text-muted">{s.label}</dt>
                <dd className={`mt-1 font-mono text-xl font-bold ${s.tone}`}>{s.value}</dd>
              </div>
            ))}
          </dl>
          {choices.length > 0 && (
            <div className="mt-5">
              <h3 className="text-sm font-semibold text-muted">{t("ui.act.choices")}</h3>
              <ul className="mt-2 space-y-1.5 text-sm">
                {choices.map((c) => <li key={c} className="flex gap-2"><span className="text-ai">◆</span>{t(c)}</li>)}
              </ul>
            </div>
          )}
          {state.achievements.length > 0 && (
            <div className="mt-5">
              <h3 className="text-sm font-semibold text-muted">{t("ui.journal.achievements")}</h3>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {state.achievements.map((a) => <li key={a} className="rounded-full border border-gold/40 bg-gold/10 px-2.5 py-1 text-xs font-semibold text-gold">★ {t(`ach.${a}`)}</li>)}
              </ul>
            </div>
          )}
          <p className="mt-5 rounded-xl border border-line bg-bg/40 p-3 text-sm leading-snug text-muted">{t("ui.act.next")}</p>
          <button onClick={onClose} className="mt-6 w-full rounded-xl bg-ai py-3 font-semibold text-white shadow-lg shadow-ai/30 hover:brightness-110">
            {t("ui.act.stay")}
          </button>
        </div>
      </div>
    </div>
  );
}
