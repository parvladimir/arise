"use client";

import { useEffect, useMemo, useState } from "react";
import { content } from "@/content";
import type { GameEvent, GameState, PromptResult, QuestDef, SlotId } from "@/core/types";
import type { GameApi } from "./useGame";

type PromptQuest = Extract<QuestDef, { kind: "prompt" }>;
type Shown = { questId: string; stage: number; result: PromptResult; pay: number; finished: boolean };

const SLOT_HINT: Partial<Record<SlotId, string>> = {
  examples: "Откроется после покупки «Шпаргалки промптов» в магазине",
};

export function PromptLab({
  game,
  state,
  quest,
  motion,
  onFinished,
}: {
  game: GameApi;
  state: GameState;
  quest: PromptQuest | undefined;
  motion: boolean;
  onFinished: () => void;
}) {
  const { t, dispatch } = game;
  const [shown, setShown] = useState<Shown | null>(null);
  const [selection, setSelection] = useState<Partial<Record<SlotId, string>>>({});
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(1);
  const [tab, setTab] = useState<"prompt" | "answer">("prompt");

  const viewQuest = quest ?? (shown ? (content.quests.find((q) => q.id === shown.questId) as PromptQuest) : undefined);
  const stageIndex = shown && shown.questId === viewQuest?.id ? shown.stage : (viewQuest ? state.quests[viewQuest.id]?.stage ?? 0 : 0);
  const stage = viewQuest?.stages[stageIndex];
  const answerText = useMemo(() => (shown ? shown.result.segments.map((s) => t(s.textKey)).join(" ") : ""), [shown, t]);

  useEffect(() => {
    if (!shown) return;
    if (!motion) return setRevealed(1);
    setRevealed(0);
    const started = performance.now();
    const duration = Math.min(1600, 300 + answerText.length * 6);
    let raf = 0;
    const tick = () => {
      const p = Math.min(1, (performance.now() - started) / duration);
      setRevealed(p);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    // Safari и фоновые вкладки могут притормаживать requestAnimationFrame:
    // таймер гарантирует, что ответ допечатается и интерфейс не зависнет.
    const fallback = window.setTimeout(() => setRevealed(1), duration + 300);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(fallback);
    };
  }, [shown, motion, answerText.length]);

  if (!viewQuest || !stage) {
    return <div className="grid h-full place-items-center p-8 text-center text-muted">{t("ui.neira.noTask")}</div>;
  }

  const slots = stage.slots;
  const missing = stage.required.filter((s) => !selection[s]);
  const done = revealed >= 1;
  const resultForThisStage = shown && shown.questId === viewQuest.id && shown.stage === stageIndex ? shown : null;

  // Пока ответ печатается или принятый результат ещё не закрыт «Дальше», повторная отправка запрещена:
  // иначе двойной клик уходит в следующую стадию.
  const locked = Boolean(shown && (!done || shown.result.passed));

  const submit = () => {
    if (locked) return;
    setError(null);
    if (missing.length) {
      setError(t("ui.neira.required", { slots: missing.map((s) => t(`slot.${s}`)).join(", ") }));
      return;
    }
    const clean = Object.fromEntries(Object.entries(selection).filter(([slot]) => slots.includes(slot as SlotId) && state.slots.includes(slot as SlotId)));
    const events: GameEvent[] = dispatch({ type: "submitPrompt", questId: viewQuest.id, selection: clean });
    const res = events.find((e) => e.type === "promptResult");
    const rej = events.find((e) => e.type === "rejected");
    if (rej && rej.type === "rejected") setError(t(rej.reasonKey));
    if (res && res.type === "promptResult") {
      setShown({ questId: res.questId, stage: res.stage, result: res.result, pay: res.pay, finished: res.finished });
      setTab("answer");
    }
  };

  const next = () => {
    const finished = resultForThisStage?.finished;
    setShown(null);
    setTab("prompt");
    if (finished) {
      setSelection({});
      onFinished();
    }
  };

  const clientNpc = viewQuest.client;
  const r = resultForThisStage?.result;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex gap-1 border-b border-line p-2 lg:hidden" role="tablist">
        {(["prompt", "answer"] as const).map((k) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`flex-1 rounded-md py-2 text-sm font-medium ${tab === k ? "bg-surface-2 text-ink" : "text-muted"}`}>
            {t(k === "prompt" ? "ui.neira.tabPrompt" : "ui.neira.tabAnswer")}
          </button>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        {/* Запрос */}
        <div className={`min-h-0 overflow-y-auto border-line p-4 lg:block lg:border-r ${tab === "prompt" ? "block" : "hidden"}`}>
          <div className="rounded-xl border border-line bg-surface-2/60 p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
              <span className="font-semibold uppercase tracking-wider text-ok">{t("ui.neira.task")}</span>
              {viewQuest.stages.length > 1 && <span>{t("ui.neira.stage", { n: stageIndex + 1, total: viewQuest.stages.length })}</span>}
            </div>
            {clientNpc && <div className="mt-1 text-sm text-muted">{t("ui.neira.client")}: {t(`npc.${clientNpc}`)}</div>}
            <p className="mt-1.5 leading-snug">{t(stage.taskKey)}</p>
          </div>

          <h3 className="mt-5 text-sm font-semibold text-muted">{t("ui.neira.prompt")}</h3>
          <div className="mt-2 space-y-3">
            {slots.map((slot) => {
              const unlocked = state.slots.includes(slot);
              const cards = stage.cards.map((id) => content.cards.find((c) => c.id === id)!).filter((c) => c.slot === slot);
              return (
                <div key={slot}>
                  <div className="mb-1.5 flex items-center gap-2 text-xs">
                    <span className="font-mono uppercase tracking-wider text-ai">{t(`slot.${slot}`)}</span>
                    {stage.required.includes(slot) && <span className="text-muted">обязательно</span>}
                  </div>
                  {!unlocked ? (
                    <div className="rounded-lg border border-dashed border-line px-3 py-2 text-sm text-muted">🔒 {SLOT_HINT[slot] ?? t("ui.laptop.locked")}</div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {cards.map((c) => {
                        const on = selection[slot] === c.id;
                        return (
                          <button
                            key={c.id}
                            aria-pressed={on}
                            onClick={() => setSelection((s) => ({ ...s, [slot]: on ? undefined : c.id }))}
                            className={`rounded-lg border px-3 py-1.5 text-left text-sm transition ${on ? "border-ai bg-ai/20 text-ink shadow-[0_0_0_1px_var(--color-ai)]" : "border-line bg-surface hover:border-ai/60"}`}
                          >
                            {t(c.textKey)}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <h3 className="mt-5 text-sm font-semibold text-muted">{t("ui.neira.criteria")}</h3>
          <ul className="mt-2 space-y-1">
            {stage.criteria.map((c) => {
              const res = r?.criteria.find((x) => x.id === c.id);
              const mark = !res || !done ? "idle" : res.passed ? "ok" : "bad";
              return (
                <li key={c.id} className="flex items-center gap-2 text-sm">
                  <span aria-hidden className={`grid h-5 w-5 place-items-center rounded-full text-xs ${mark === "ok" ? "bg-ok/20 text-ok" : mark === "bad" ? "bg-bad/20 text-bad" : "bg-surface-2 text-muted"}`}>
                    {mark === "ok" ? "✓" : mark === "bad" ? "✕" : "•"}
                  </span>
                  <span className={mark === "bad" ? "text-bad" : ""}>{t(c.labelKey)}</span>
                  {c.hard && <span className="text-xs text-muted">(обязательно)</span>}
                  <span className="sr-only">{mark === "ok" ? "выполнено" : mark === "bad" ? "не выполнено" : ""}</span>
                </li>
              );
            })}
          </ul>

          {error && <p className="mt-3 text-sm text-bad" role="alert">{error}</p>}
          {(!resultForThisStage || !resultForThisStage.result.passed) && (
            <button onClick={submit} disabled={locked} className="mt-5 w-full rounded-xl bg-ai py-3 font-semibold text-white shadow-lg shadow-ai/25 enabled:hover:brightness-110 disabled:opacity-50">
              {t("ui.neira.send")}
            </button>
          )}
        </div>

        {/* Ответ */}
        <div className={`min-h-0 overflow-y-auto p-4 lg:block ${tab === "answer" ? "block" : "hidden"}`}>
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-ok/15 text-ok" aria-hidden>◉</span>
            <h3 className="font-semibold">{t("ui.neira.answer")}</h3>
          </div>

          {!r && <p className="mt-6 text-sm text-muted">{t("ui.neira.waiting")}</p>}

          {r && (
            <div className="mt-4" aria-live="polite">
              <div className="whitespace-pre-line rounded-xl border border-line bg-bg/60 p-4 font-mono text-[15px] leading-relaxed">
                {!done && <span className="sr-only">{t("ui.neira.typing")}</span>}
                <Typed segments={r.segments.map((s) => ({ text: t(s.textKey), invented: s.hallucination }))} progress={revealed} showMarks={done} inventedLabel={t("ui.neira.invented")} />
              </div>
              {done && (
                <div className="anim-rise mt-3 space-y-3">
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <span className="text-muted">{t("ui.neira.chars", { n: r.length })}</span>
                    <span className={`rounded-full px-2.5 py-0.5 font-semibold ${r.passed ? "bg-ok/15 text-ok" : "bg-bad/15 text-bad"}`}>
                      {t("ui.neira.quality", { q: Math.round(r.quality * 100) })} · {t(r.passed ? "ui.neira.passed" : "ui.neira.failed")}
                    </span>
                    {resultForThisStage?.finished && resultForThisStage.pay > 0 && <span className="font-mono font-semibold text-gold">+{resultForThisStage.pay} ₵</span>}
                  </div>
                  {!r.passed && <p className="text-sm text-muted">{t("ui.neira.retry")}</p>}
                  {r.passed && (
                    <button onClick={next} className="w-full rounded-xl bg-ok py-3 font-semibold text-bg hover:brightness-110">
                      {t("ui.neira.next")}
                    </button>
                  )}
                  {!r.passed && (
                    <button onClick={() => setTab("prompt")} className="w-full rounded-xl border border-line py-2.5 text-sm lg:hidden">
                      ← {t("ui.neira.tabPrompt")}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Typed({
  segments,
  progress,
  showMarks,
  inventedLabel,
}: {
  segments: { text: string; invented: boolean }[];
  progress: number;
  showMarks: boolean;
  inventedLabel: string;
}) {
  const total = segments.reduce((n, s) => n + s.text.length + 1, 0);
  let budget = Math.floor(total * progress);
  return (
    <>
      {segments.map((s, i) => {
        const visible = s.text.slice(0, Math.max(0, budget));
        budget -= s.text.length + 1;
        if (!visible) return null;
        return (
          <span key={i}>
            {s.invented && showMarks ? (
              <mark className="rounded bg-gold/20 px-0.5 text-gold underline decoration-gold decoration-wavy underline-offset-4" title={inventedLabel}>
                {visible}
                <span className="ml-1 align-middle font-sans text-[11px] uppercase tracking-wide">({inventedLabel})</span>
              </mark>
            ) : (
              visible
            )}
            {i < segments.length - 1 ? " " : ""}
          </span>
        );
      })}
    </>
  );
}
