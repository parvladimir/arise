"use client";

import { useState } from "react";
import { content } from "@/content";
import { currentGoal } from "@/core/engine";
import { levelFromXp } from "@/core/economy";
import type { GameState } from "@/core/types";
import { Avatar } from "./Avatar";
import type { GameApi } from "./useGame";

export function TopBar({
  game,
  state,
  onGo,
  motion,
  setMotion,
}: {
  game: GameApi;
  state: GameState;
  onGo: () => void;
  motion: boolean;
  setMotion: (v: boolean) => void;
}) {
  const { t } = game;
  const lvl = levelFromXp(state.xp);
  const goal = currentGoal(state, content);
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl 2xl:max-w-[1720px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <Avatar id={state.profile.avatar} size={36} label={state.profile.name} />
          <div className="leading-tight">
            <div className="text-sm font-semibold">{state.profile.name}</div>
            <div className="flex items-center gap-1.5 text-xs text-muted">
              <span>{t("ui.level", { level: lvl.level })}</span>
              <span className="relative h-1.5 w-14 overflow-hidden rounded bg-surface-2" aria-label={`XP ${lvl.into} из ${lvl.need}`}>
                <span className="absolute inset-y-0 left-0 rounded bg-ai" style={{ width: `${(lvl.into / lvl.need) * 100}%` }} />
              </span>
            </div>
          </div>
        </div>

        <div className="font-mono text-lg font-semibold text-gold" aria-label="Кредиты">{state.money} ₵</div>
        <div className="hidden text-sm text-muted sm:block">{t("ui.day", { day: state.day, hour: state.hour })}</div>

        <div className="order-last flex w-full min-w-0 items-center gap-2 rounded-lg border border-line bg-surface px-3 py-1.5 md:order-none md:ml-auto md:w-auto md:max-w-xl">
          <span className="shrink-0 text-xs font-semibold uppercase tracking-wider text-ok">{t("ui.goal")}</span>
          <span className="min-w-0 flex-1 truncate text-sm" title={t(goal.textKey)}>{t(goal.textKey)}</span>
          {goal.questId && (
            <button onClick={onGo} className="shrink-0 rounded-md bg-ai px-2.5 py-1 text-xs font-semibold text-white hover:brightness-110">
              {t("ui.go")}
            </button>
          )}
        </div>

        <div className="relative ml-auto md:ml-0">
          <button onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label={t("ui.settings")} className="rounded-lg border border-line px-2.5 py-1.5 text-sm hover:bg-surface">
            ⚙
          </button>
          {open && (
            <div className="anim-rise absolute right-0 top-11 w-60 rounded-xl border border-line bg-surface p-3 shadow-2xl">
              <button onClick={() => setMotion(!motion)} className="flex w-full justify-between rounded-md px-2 py-2 text-sm hover:bg-surface-2">
                <span>{t("ui.motion")}</span>
                <span className="text-muted">{motion ? t("ui.on") : t("ui.off")}</span>
              </button>
              <button onClick={() => game.setScreen("menu")} className="w-full rounded-md px-2 py-2 text-left text-sm hover:bg-surface-2">
                ← Главное меню
              </button>
              <p className="px-2 pt-2 text-xs text-muted">{t("ui.prototypeNote")}</p>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
