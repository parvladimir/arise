"use client";

import { useState } from "react";
import { content } from "@/content";
import { levelFromXp } from "@/core/economy";
import { currentGoal } from "@/core/engine";
import type { GameState } from "@/core/types";
import { activeClassifyQuest, activePromptQuest } from "./nav";
import type { GameApi } from "./useGame";

/** Сколько карточек «ИИ за минуту» в словаре локали. */
export const FACT_COUNT = 14;

function Widget({ title, tone, children, delay }: { title: string; tone: string; children: React.ReactNode; delay: number }) {
  return (
    <section className="desk-widget relative overflow-hidden rounded-2xl border border-white/10 bg-[#0b1226]/70 p-3.5 backdrop-blur-md" style={{ animationDelay: `${delay}ms` }}>
      <span className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-30 blur-2xl" style={{ background: tone }} aria-hidden />
      <h3 className="relative font-mono text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: tone }}>{title}</h3>
      <div className="relative mt-2">{children}</div>
    </section>
  );
}

/** Виджеты рабочего стола: кошелёк и уровень, цель, статус Нейры, сообщения, карточка «ИИ за минуту». */
export function DeskWidgets({ game, state, onGoal, openNeira, openPhone }: { game: GameApi; state: GameState; onGoal: () => void; openNeira: () => void; openPhone: () => void }) {
  const { t } = game;
  const lvl = levelFromXp(state.xp);
  const goal = currentGoal(state, content);
  const task = activePromptQuest(state) ?? activeClassifyQuest(state);
  const plus = state.flags.includes("selfCheck");
  const [fact, setFact] = useState(() => (state.day * 3 + state.lessons.length) % FACT_COUNT);
  const lastIn = [...state.ledger].reverse().find((e) => e.delta > 0);

  return (
    <div className="relative mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Widget title={t("ui.desk.wallet")} tone="#f5b544" delay={150}>
        <p className="font-mono text-3xl font-semibold tabular-nums text-gold">{state.money} ₵</p>
        {lastIn && <p className="mt-0.5 text-xs text-muted">{t("ui.desk.lastIncome", { n: lastIn.delta })}</p>}
        <div className="mt-3 flex items-center justify-between text-xs">
          <span className="font-semibold">{t("ui.level", { level: lvl.level })}</span>
          <span className="tabular-nums text-muted">{lvl.into}/{lvl.need} XP</span>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div className="desk-bar h-full rounded-full bg-gradient-to-r from-ai to-[#a78bfa]" style={{ width: `${Math.round((lvl.into / Math.max(1, lvl.need)) * 100)}%` }} />
        </div>
      </Widget>

      <Widget title={t("ui.goal")} tone="#34d399" delay={230}>
        <p className="line-clamp-4 text-sm leading-snug">{t(goal.textKey)}</p>
        {goal.questId && (
          <button onClick={onGoal} className="mt-3 rounded-lg bg-ok/90 px-3 py-1.5 text-xs font-semibold text-bg hover:brightness-110">{t("ui.go")} →</button>
        )}
      </Widget>

      <Widget title={t("ui.desk.neira")} tone="#2dd4bf" delay={310}>
        <div className="flex items-center gap-2.5">
          <span className={`neira-orb neira-orb-sm ${task ? "desk-busy" : ""}`} aria-hidden />
          <div className="min-w-0">
            <p className="text-sm font-semibold">{task ? t("ui.desk.neiraTask") : t("ui.desk.neiraIdle")}</p>
            {task && <p className="truncate text-xs text-muted">{t(task.titleKey)}</p>}
          </div>
        </div>
        <p className="mt-2 text-xs text-muted">{plus ? t("ui.desk.plusOn") : t("ui.desk.lessons", { n: state.lessons.length, total: content.lessons.length })}</p>
        <button onClick={openNeira} className="mt-2.5 rounded-lg border border-[#2dd4bf]/50 px-3 py-1.5 text-xs font-semibold text-[#2dd4bf] hover:bg-[#2dd4bf]/10">{t("ui.desk.openNeira")}</button>
      </Widget>

      <Widget title={t("ui.desk.fact")} tone="#a78bfa" delay={390}>
        <p key={fact} className="anim-rise text-sm leading-snug">{t(`fact.${fact + 1}`)}</p>
        <div className="mt-2.5 flex items-center gap-2">
          <button onClick={() => setFact((f) => (f + 1) % FACT_COUNT)} className="rounded-lg border border-[#a78bfa]/50 px-3 py-1.5 text-xs font-semibold text-[#c4b5fd] hover:bg-[#a78bfa]/10">{t("ui.desk.nextFact")} ↻</button>
          {state.unread.length > 0 && (
            <button onClick={openPhone} className="ml-auto flex items-center gap-1.5 rounded-lg bg-bad/15 px-2.5 py-1.5 text-xs font-semibold text-bad">
              <span className="menu-live h-1.5 w-1.5 rounded-full bg-bad" aria-hidden /> {t("ui.desk.unread", { n: state.unread.length })}
            </button>
          )}
        </div>
      </Widget>
    </div>
  );
}

export const NEWS_COUNT = 8;

/** Бегущая строка новостей Ривертона про ИИ. */
export function DeskTicker({ game }: { game: GameApi }) {
  const items = Array.from({ length: NEWS_COUNT }, (_, i) => game.t(`news.${i + 1}`));
  const line = items.map((x, i) => (
    <span key={i} className="mx-6 inline-flex items-center gap-2">
      <span className="text-ai" aria-hidden>◆</span> {x}
    </span>
  ));
  return (
    <div className="desk-ticker relative mt-5 overflow-hidden rounded-xl border border-white/10 bg-black/30 py-2 text-xs text-ink/80">
      <span className="absolute inset-y-0 left-0 z-10 flex items-center gap-1.5 bg-bad/90 px-2.5 font-mono text-[10px] font-bold uppercase tracking-widest text-white">
        <span className="menu-live h-1.5 w-1.5 rounded-full bg-white" aria-hidden /> {game.t("ui.desk.news")}
      </span>
      <div className="desk-ticker-track whitespace-nowrap pl-24" aria-label={items.join(". ")}>
        <span aria-hidden>{line}</span>
        <span aria-hidden>{line}</span>
      </div>
    </div>
  );
}
