"use client";

import { useEffect, useState } from "react";
import { content } from "@/content";
import type { GameState, Toast } from "@/core/types";
import type { GameApi } from "./useGame";

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
      <div className="pointer-events-none fixed right-4 top-20 z-50 flex flex-col items-end gap-2" aria-live="polite">
        {live.map((x) => (
          <div key={x.key} className={`anim-rise rounded-xl border border-line bg-surface/95 px-4 py-2.5 text-sm font-semibold shadow-xl backdrop-blur ${tone(x)}`}>
            {text(x)}
          </div>
        ))}
      </div>
      {milestone && !hold && (
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
