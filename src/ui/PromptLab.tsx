"use client";

import { useEffect, useMemo, useState } from "react";
import { content } from "@/content";
import type { GameEvent, GameState, PromptResult, QuestDef, SlotId } from "@/core/types";
import { matches, runPrompt } from "@/core/promptSim";
import { PromptPreview, Takeaway } from "./Learn";
import { FreeformInput } from "./Freeform";
import { analyzeFreeform } from "@/core/freeform";
import { ruMatch } from "@/content/locales/ru.match";
import type { GameApi } from "./useGame";

const NPC_COLOR: Record<string, string> = { boris: "#fb923c", vera: "#f472b6", editor: "#38bdf8", anna: "#f5b544", dima: "#4f8cff", sergey: "#f87171", olga: "#a78bfa", alex: "#34d399", nick: "#f472b6" };

type PromptQuest = Extract<QuestDef, { kind: "prompt" }>;
type Shown = { questId: string; stage: number; result: PromptResult; pay: number; finished: boolean; sel: Partial<Record<SlotId, string>> };
type Phase = "thinking" | "streaming" | "done";

const THINK_STEPS = ["ui.neira.think1", "ui.neira.think2", "ui.neira.think3"] as const;

/** Делим текст на «токены»: слово вместе с пробелом после него — так печатают настоящие модели. */
function tokenize(text: string): string[] {
  return text.match(/\S+\s*/g) ?? [];
}

const SLOT_HINT: Partial<Record<SlotId, string>> = {
  examples: "Откроется после покупки «Шпаргалки промптов» в магазине",
};

export function PromptLab({
  game,
  state,
  quest,
  motion,
  onFinished,
  onLesson,
}: {
  game: GameApi;
  state: GameState;
  quest: PromptQuest | undefined;
  motion: boolean;
  onFinished: () => void;
  onLesson?: () => void;
}) {
  const { t, dispatch } = game;
  const [shown, setShown] = useState<Shown | null>(null);
  const [picked, setSelection] = useState<Partial<Record<SlotId, string>>>({});
  const [mode, setMode] = useState<"cards" | "free">("cards");
  const [freeText, setFreeText] = useState("");
  // «Нейра Плюс»: предварительная оценка запроса без траты попытки.
  const [pre, setPre] = useState<{ key: string; result: PromptResult } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("done");
  const [thinkStep, setThinkStep] = useState(0);
  const [shownTokens, setShownTokens] = useState(0);
  const [tab, setTab] = useState<"prompt" | "answer">("prompt");

  const viewQuest = quest ?? (shown ? (content.quests.find((q) => q.id === shown.questId) as PromptQuest) : undefined);
  const stageIndex = shown && shown.questId === viewQuest?.id ? shown.stage : (viewQuest ? state.quests[viewQuest.id]?.stage ?? 0 : 0);
  const stage = viewQuest?.stages[stageIndex];
  const tokenized = useMemo(
    () => (shown ? shown.result.segments.map((seg) => ({ tokens: tokenize(t(seg.textKey)), invented: seg.hallucination })) : []),
    [shown, t],
  );
  const totalTokens = tokenized.reduce((n, s) => n + s.tokens.length, 0);

  // Ответ «живой»: Нейра сначала думает, потом печатает слово за словом с паузами на знаках препинания.
  // Только setTimeout (не requestAnimationFrame): Safari и фоновые вкладки не должны «застревать» на середине.
  useEffect(() => {
    if (!shown) return;
    if (!motion) {
      setPhase("done");
      setShownTokens(Number.MAX_SAFE_INTEGER);
      return;
    }
    const all = tokenized.flatMap((s) => s.tokens);
    const timers: number[] = [];
    let cancelled = false;
    setPhase("thinking");
    setThinkStep(0);
    setShownTokens(0);
    const later = (ms: number, fn: () => void) => timers.push(window.setTimeout(() => !cancelled && fn(), ms));
    later(650, () => setThinkStep(1));
    later(1300, () => setThinkStep(2));
    later(1950, () => {
      setPhase("streaming");
      let i = 0;
      const step = () => {
        i += 1;
        setShownTokens(i);
        if (i >= all.length) return setPhase("done");
        const tok = all[i - 1] ?? "";
        const pause = /[.!?…]\s*$/.test(tok) ? 260 : /[,:;—]\s*$/.test(tok) ? 120 : 0;
        later(34 + Math.min(tok.length, 10) * 6 + pause, step);
      };
      step();
    });
    return () => {
      cancelled = true;
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [shown, motion, tokenized]);

  const skip = () => {
    if (phase === "done") return;
    setPhase("done");
    setShownTokens(totalTokens);
  };

  if (!viewQuest || !stage) {
    return <div className="grid h-full place-items-center p-8 text-center text-muted">{t("ui.neira.noTask")}</div>;
  }

  const slots = stage.slots;
  // В режиме «своими словами» выбор карточек выводится из текста — дальше всё как обычно.
  const selection =
    mode === "free" ? analyzeFreeform(freeText, stage, (id) => content.cards.find((c) => c.id === id)?.slot, ruMatch, state.slots) : picked;
  const missing = stage.required.filter((s) => !selection[s]);
  const done = phase === "done";
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
    const events: GameEvent[] = dispatch({ type: "submitPrompt", questId: viewQuest.id, selection: clean, freeform: mode === "free" });
    const res = events.find((e) => e.type === "promptResult");
    const rej = events.find((e) => e.type === "rejected");
    if (rej && rej.type === "rejected") setError(t(rej.reasonKey));
    if (res && res.type === "promptResult") {
      setShown({ questId: res.questId, stage: res.stage, result: res.result, pay: res.pay, finished: res.finished, sel: clean });
      setTab("answer");
    }
  };

  const next = () => {
    const finished = resultForThisStage?.finished;
    setShown(null);
    setTab("prompt");
    if (finished) {
      setSelection({});
      setFreeText("");
      onFinished();
    }
  };

  const clientNpc = viewQuest.client;
  // Живая реакция заказчика на конкретный ответ: «Профессор всё сказал верно. Мама не поняла ни слова».
  const reactions = resultForThisStage ? (stage.reactions ?? []).filter((re) => matches(re.when, resultForThisStage.sel)) : [];
  const totalWeight = stage.criteria.reduce((n, c) => n + c.weight, 0) || 1;
  const r = resultForThisStage?.result;
  const selKey = JSON.stringify(selection) + stageIndex;
  const preResult = pre && pre.key === selKey && !(resultForThisStage?.result.passed) ? pre.result : null;
  const precheck = () => {
    const clean = Object.fromEntries(Object.entries(selection).filter(([slot]) => slots.includes(slot as SlotId) && state.slots.includes(slot as SlotId)));
    setPre({ key: selKey, result: runPrompt(stage, clean, t, state.quests[viewQuest.id]?.selections ?? {}) });
  };
  // Для проваленной «правдивости» объясняем: что именно выдумано и из-за какой карточки
  const usedSelection = resultForThisStage ? (state.quests[viewQuest.id]?.selections?.[stageIndex] ?? selection) : selection;
  const inventions = (r?.segments ?? [])
    .filter((s) => s.hallucination)
    .map((s) => {
      const variant = stage.segments.find((g) => g.id === s.id)?.variants.find((v) => v.textKey === s.textKey);
      const causes = Object.entries(variant?.when ?? {}).map(([slot, allowed]) => {
        const picked = usedSelection[slot as SlotId];
        if (picked && allowed.includes(picked)) {
          const card = content.cards.find((c) => c.id === picked);
          return t("ui.neira.causeCard", { card: card ? t(card.textKey) : picked });
        }
        return t("ui.neira.causeMissing", { slot: t(`slot.${slot}`) });
      });
      return { text: t(s.textKey), causes };
    });

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
              <span className="flex items-center gap-2">
                {viewQuest.stages.length > 1 && <span>{t("ui.neira.stage", { n: stageIndex + 1, total: viewQuest.stages.length })}</span>}
                {onLesson && (
                  <button onClick={onLesson} className="rounded-md border border-ok/40 px-2 py-0.5 font-semibold text-ok hover:bg-ok/10">📘 {t("ui.lesson.open")}</button>
                )}
              </span>
            </div>
            {clientNpc && <div className="mt-1 text-sm text-muted">{t("ui.neira.client")}: {t(`npc.${clientNpc}`)}</div>}
            <p className="mt-1.5 leading-snug">{t(stage.taskKey)}</p>
          </div>

          <div className="mt-5 flex items-center gap-2">
            <h3 className="text-sm font-semibold text-muted">{t("ui.neira.prompt")}</h3>
            <div className="ml-auto flex rounded-lg border border-line bg-surface p-0.5 text-xs" role="tablist">
              {(["cards", "free"] as const).map((m) => (
                <button
                  key={m}
                  role="tab"
                  aria-selected={mode === m}
                  onClick={() => setMode(m)}
                  className={`rounded-md px-2.5 py-1 font-semibold transition ${mode === m ? "bg-ai text-white" : "text-muted hover:text-ink"}`}
                >
                  {m === "cards" ? `▦ ${t("ui.free.cards")}` : `✍ ${t("ui.free.own")}`}
                </button>
              ))}
            </div>
          </div>
          {mode === "free" ? (
            <FreeformInput game={game} state={state} stage={stage} text={freeText} setText={setFreeText} selection={selection} />
          ) : (
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
          )}

          {mode === "cards" && <div className="mt-5">
            <PromptPreview game={game} slots={slots.filter((s) => state.slots.includes(s))} selection={resultForThisStage ? resultForThisStage.sel : selection} />
          </div>}

          <h3 className="mt-5 text-sm font-semibold text-muted">{t("ui.neira.criteria")}</h3>
          <ul className="mt-2 space-y-1">
            {stage.criteria.map((c) => {
              const res = (preResult ?? r)?.criteria.find((x) => x.id === c.id);
              // Критерий, который зависит только от ещё закрытых слотов, честно показываем закрытым, а не проваленным
              const needsLocked = c.kind === "cards" && Object.keys(c.when).every((s) => !state.slots.includes(s as SlotId));
              const mark = needsLocked ? "lock" : !res || (!preResult && !done) ? "idle" : res.passed ? "ok" : "bad";
              const share = Math.round((c.weight / totalWeight) * 100);
              return (
                <li key={c.id} className="flex items-start gap-2 text-sm leading-5">
                  <span aria-hidden className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-xs ${mark === "ok" ? "bg-ok/20 text-ok" : mark === "bad" ? "bg-bad/20 text-bad" : "bg-surface-2 text-muted"}`}>
                    {mark === "ok" ? "✓" : mark === "bad" ? "✕" : mark === "lock" ? "🔒" : "•"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={mark === "bad" ? "text-bad" : mark === "lock" ? "text-muted" : ""}>{t(c.labelKey)}</span>
                    {c.hard && <span className="ml-1.5 text-xs text-muted">({t("ui.neira.required2")})</span>}
                    {mark === "lock" && <span className="ml-1.5 text-xs text-muted">({t("ui.neira.critLocked")})</span>}
                    {mark === "bad" && c.kind === "noHallucination" && inventions.map((inv, i) => (
                      <span key={i} className="mt-0.5 block text-xs text-muted">
                        {t("ui.neira.invention", { text: inv.text })}{inv.causes.length > 0 ? ` ${inv.causes.join(", ")}.` : "."}{inv.causes.length === 0 && c.hintKey ? ` ${t(c.hintKey)}` : ""}
                      </span>
                    ))}
                  </span>
                  {share > 0 && <span className={`shrink-0 font-mono text-xs ${mark === "ok" ? "text-ok" : "text-muted"}`} title={t("ui.neira.critWeight")}>+{share}%</span>}
                  <span className="sr-only">{mark === "ok" ? "выполнено" : mark === "bad" ? "не выполнено" : ""}</span>
                </li>
              );
            })}
          </ul>

          {error && <p className="mt-3 text-sm text-bad" role="alert">{error}</p>}
          {state.flags.includes("selfCheck") && (!resultForThisStage || !resultForThisStage.result.passed) && (
            <div className="mt-5">
              <button onClick={precheck} disabled={locked} className="w-full rounded-xl border border-ok/50 bg-ok/5 py-2.5 text-sm font-semibold text-ok hover:bg-ok/10 disabled:opacity-50">
                {t("ui.neira.precheck")}
              </button>
              {preResult && (
                <p className="mt-1.5 text-center text-xs text-muted">
                  {t("ui.neira.quality", { q: Math.round(preResult.quality * 100) })} · {t(preResult.passed ? "ui.neira.passed" : "ui.neira.failed")} · {t("ui.neira.precheckNote")}
                </p>
              )}
            </div>
          )}
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
              {phase === "thinking" ? (
                <Thinking step={thinkStep} t={t} cards={Object.values(resultForThisStage?.sel ?? {}).filter(Boolean).map((id) => {
                  const card = content.cards.find((c) => c.id === id);
                  return card ? t(card.textKey) : String(id);
                })} />
              ) : (
                <button
                  type="button"
                  onClick={skip}
                  disabled={done}
                  aria-label={done ? undefined : t("ui.neira.skip")}
                  className={`neira-answer relative block w-full whitespace-pre-line rounded-xl border p-4 text-left font-mono text-[15px] leading-relaxed transition-colors ${done ? "cursor-text border-line bg-bg/60" : "cursor-pointer border-ai/40 bg-bg/70"}`}
                >
                  {!done && <span className="sr-only">{t("ui.neira.typing")}</span>}
                  <Typed segments={tokenized} count={shownTokens} streaming={phase === "streaming"} showMarks={done} inventedLabel={t("ui.neira.invented")} />
                </button>
              )}
              {phase === "streaming" && <p className="mt-2 text-xs text-muted">{t("ui.neira.skipHint")}</p>}
              {done && (
                <div className="anim-rise mt-3 space-y-3">
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <span className="text-muted">{t("ui.neira.chars", { n: r.length })}</span>
                    <span className={`rounded-full px-2.5 py-0.5 font-semibold ${r.passed ? "bg-ok/15 text-ok" : "bg-bad/15 text-bad"}`}>
                      {t("ui.neira.quality", { q: Math.round(r.quality * 100) })} · {t(r.passed ? "ui.neira.passed" : "ui.neira.failed")}
                    </span>
                    {resultForThisStage?.finished && resultForThisStage.pay > 0 && <span className="font-mono font-semibold text-gold">+{resultForThisStage.pay} ₵</span>}
                  </div>
                  {reactions.length > 0 && (
                    <ul className="space-y-2" aria-label={t("ui.neira.reactions")}>
                      {reactions.map((re) => (
                        <li key={re.textKey} className="anim-rise flex items-start gap-2.5 rounded-xl border border-line bg-surface-2/60 p-3">
                          <span aria-hidden className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold text-bg" style={{ background: NPC_COLOR[re.from] ?? "#8ea3c7" }}>
                            {t(`npc.${re.from}`).slice(0, 1)}
                          </span>
                          <span className="min-w-0 text-sm leading-snug">
                            <span className="block text-xs font-semibold text-muted">{t(`npc.${re.from}`)}</span>
                            «{t(re.textKey)}»
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {!r.passed && r.criteria.some((c) => c.hard && !c.passed) && <p className="text-sm text-bad">{t("ui.neira.hardFailed")}</p>}
                  {!r.passed && <p className="text-sm text-muted">{t("ui.neira.retry")}</p>}
                  {r.passed && resultForThisStage?.finished && (
                    <>
                      <Takeaway game={game} questId={viewQuest.id} />
                      <p className="text-xs text-muted">💡 {t("ui.prompt.tryReal")}</p>
                    </>
                  )}
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

function Thinking({ step, cards, t }: { step: number; cards: string[]; t: GameApi["t"] }) {
  return (
    <div className="neira-think rounded-xl border border-ai/40 bg-bg/70 p-4" role="status">
      <div className="flex items-center gap-3">
        <span className="neira-orb" aria-hidden />
        <div className="min-w-0">
          <p className="font-semibold text-ink">
            {t(THINK_STEPS[step] ?? THINK_STEPS[0])}
            <span className="neira-dots" aria-hidden><i>.</i><i>.</i><i>.</i></span>
          </p>
          <p className="text-xs text-muted">{t("ui.neira.thinking")}</p>
        </div>
      </div>
      {cards.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label={t("ui.neira.considering")}>
          {cards.map((c, i) => (
            <li key={c} className="neira-chip rounded-md border border-ai/30 bg-ai/10 px-2 py-0.5 text-xs text-ai" style={{ animationDelay: `${i * 160}ms` }}>
              {c}
            </li>
          ))}
        </ul>
      )}
      <div className="neira-scan mt-3 h-1 overflow-hidden rounded bg-surface-2" aria-hidden><span /></div>
    </div>
  );
}

function Typed({
  segments,
  count,
  streaming,
  showMarks,
  inventedLabel,
}: {
  segments: { tokens: string[]; invented: boolean }[];
  count: number;
  streaming: boolean;
  showMarks: boolean;
  inventedLabel: string;
}) {
  let budget = count;
  const out = segments.map((s, i) => {
    const take = Math.max(0, Math.min(s.tokens.length, budget));
    budget -= s.tokens.length;
    if (take === 0) return null;
    const visible = s.tokens.slice(0, take).join("").trimEnd();
    const isLast = take === s.tokens.length && i < segments.length - 1;
    if (showMarks && !s.invented && take === s.tokens.length && isTable(visible)) return <TextTable key={i} text={visible} />;
    return (
      <span key={i}>
        {s.invented && showMarks ? (
          <mark className="anim-rise rounded bg-gold/20 px-0.5 text-gold underline decoration-gold decoration-wavy underline-offset-4" title={inventedLabel}>
            {visible}
            <span className="ml-1 align-middle font-sans text-[11px] uppercase tracking-wide">({inventedLabel})</span>
          </mark>
        ) : (
          <span className={streaming ? "neira-token" : undefined}>{visible}</span>
        )}
        {isLast ? " " : ""}
      </span>
    );
  });
  return (
    <>
      {out}
      {streaming && <span className="neira-cursor" aria-hidden />}
    </>
  );
}

/** Ответ-таблица («День | Время | …») после печати показывается настоящей таблицей. */
function isTable(text: string) {
  const lines = text.split("\n");
  return lines.length >= 3 && lines.every((l) => l.includes(" | "));
}

function TextTable({ text }: { text: string }) {
  const [head, ...rows] = text.split("\n").map((l) => l.split("|").map((c) => c.trim()));
  return (
    <span className="anim-rise -mx-1 my-1 block overflow-x-auto">
      <table className="w-full border-separate border-spacing-0 font-sans text-[13px] leading-snug">
        <thead>
          <tr>{head!.map((h, i) => <th key={i} className="border-b border-ai/40 px-1.5 pb-1.5 text-left font-mono text-[11px] uppercase tracking-wide text-ai">{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="odd:bg-surface-2/40">
              {r.map((c, j) => <td key={j} className={`px-1.5 py-1.5 align-top ${c.includes("(") ? "text-gold" : ""}`}>{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </span>
  );
}
