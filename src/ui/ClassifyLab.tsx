"use client";

import { useEffect, useRef, useState } from "react";
import type { QuestDef } from "@/core/types";
import { Takeaway } from "./Learn";
import type { GameApi } from "./useGame";
import { MascotHead } from "./Mascot";
import { RewardSlot } from "./Toasts";

type ClassifyQuest = Extract<QuestDef, { kind: "classify" }>;
type Result = { questId: string; quality: number; passed: boolean; wrong: string[]; pay: number; shortcut?: boolean };

// Цвет каждого варианта ответа: «есть в источнике» и «оставить» — зелёные, сомнительные — жёлтые, опасные — красные.
const OPTION_TONE: Record<string, string> = {
  source: "ok",
  keep: "ok",
  contra: "bad",
  remove: "bad",
  missing: "gold",
  mask: "ai",
};

const toneClasses = (tone: string, on: boolean) => {
  if (!on) return "border-line bg-surface text-muted hover:border-ai/50 hover:text-ink";
  switch (tone) {
    case "ok": return "border-ok bg-ok/15 text-ok shadow-[0_0_14px_-4px_var(--color-ok)]";
    case "bad": return "border-bad bg-bad/15 text-bad shadow-[0_0_14px_-4px_var(--color-bad)]";
    case "gold": return "border-gold bg-gold/15 text-gold shadow-[0_0_14px_-4px_var(--color-gold)]";
    default: return "border-ai bg-ai/15 text-ai shadow-[0_0_14px_-4px_var(--color-ai)]";
  }
};

/** Мини-игры «Факт-чек» и «Скрой личное»: каждому пункту — один из трёх ответов. */
export function ClassifyLab({ game, quest, onFinished, onLesson, onPassed }: { game: GameApi; quest: ClassifyQuest; onFinished: () => void; onLesson?: () => void; onPassed?: () => void }) {
  const { t, dispatch } = game;
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fails, setFails] = useState(0);
  // Режим на время: таймер стартует по кнопке, по нулю ответы сдаются сами.
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [timedOut, setTimedOut] = useState(false);
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const timed = Boolean(quest.timer);
  const running = timed && startedAt !== null && !result?.passed;
  const remaining = timed && startedAt !== null ? Math.max(0, Math.ceil(quest.timer! - (now - startedAt) / 1000)) : quest.timer ?? 0;

  const privacy = quest.game === "privacy";
  const hunt = quest.game === "hunt";
  const left = hunt ? 0 : quest.items.filter((i) => !answers[i.id]).length;
  const marked = quest.items.filter((i) => answers[i.id] === "bug").length;
  const finished = Boolean(result?.passed);
  // После двух неудач подсвечиваем, где именно ошибка, чтобы игрок не застрял.
  const revealWrong = finished || fails >= 2;

  const submit = () => {
    setError(null);
    // В «Найди ошибку» отмечают только ошибки: всё неотмеченное считается «верно».
    const sent = hunt ? Object.fromEntries(quest.items.map((i) => [i.id, answersRef.current[i.id] ?? "ok"])) : answersRef.current;
    const events = dispatch({ type: "submitClassify", questId: quest.id, answers: sent });
    const rej = events.find((e) => e.type === "rejected");
    if (rej && rej.type === "rejected") return setError(t(rej.reasonKey));
    const res = events.find((e) => e.type === "classifyResult");
    if (res && res.type === "classifyResult") {
      if (res.passed) onPassed?.();
      setResult(res);
      if (!res.passed) setFails((n) => n + 1);
      if (timed) setStartedAt(null);
    }
  };
  const submitRef = useRef(submit);
  submitRef.current = submit;

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [running]);
  useEffect(() => {
    if (running && remaining === 0) {
      setTimedOut(true);
      submitRef.current();
    }
  }, [running, remaining]);

  const start = () => {
    setResult(null);
    setTimedOut(false);
    setAnswers({});
    const t0 = Date.now();
    setNow(t0);
    setStartedAt(t0);
  };

  const shortcut = () => {
    const events = dispatch({ type: "takeShortcut", questId: quest.id });
    const res = events.find((e) => e.type === "classifyResult");
    if (res && res.type === "classifyResult") {
      onPassed?.();
      setResult({ ...res, shortcut: true });
    }
  };

  const maskLabel = (itemTextKey: string) => `{${t(itemTextKey).split(" ")[0]!.toUpperCase()}}`;

  return (
    <div className="h-full min-h-0 overflow-y-auto" data-reward-anchor={finished ? "" : undefined}>
      <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* Задача */}
        <div className="rounded-xl border border-line bg-surface-2/60 p-3.5 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-semibold uppercase tracking-wider text-ok">{t(privacy ? "ui.check.privacy" : hunt ? "ui.check.hunt" : quest.game === "spot" ? "ui.check.spot" : "ui.check.factcheck")}</span>
            <span className="flex items-center gap-2">
              {quest.client && <span className="text-muted">{t("ui.neira.client")}: {t(`npc.${quest.client}`)}</span>}
              {onLesson && <button onClick={onLesson} className="rounded-md border border-ok/40 px-2 py-0.5 font-semibold text-ok hover:bg-ok/10">📘 {t("ui.lesson.open")}</button>}
            </span>
          </div>
          <p className="mt-1.5 leading-snug">{t(quest.introKey)}</p>
        </div>

        {/* Источник */}
        <section className="check-source relative overflow-hidden rounded-xl border border-line bg-bg/60 p-4" aria-label={t("ui.check.source")}>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">{t(privacy ? "ui.check.preview" : hunt ? "ui.hunt.data" : "ui.check.article")}</p>
          <h3 className="mt-1 font-semibold leading-snug">{t(quest.sourceTitleKey)}</h3>
          {privacy ? (
            <PrivacyTable quest={quest} answers={answers} t={t} maskLabel={maskLabel} />
          ) : (
            <ol className="mt-3 space-y-3">
              {quest.sourceKeys.map((k, i) => (
                <li key={k} className="anim-rise flex gap-3 text-[15px] leading-relaxed" style={{ animationDelay: `${i * 90}ms` }}>
                  <span className="mt-0.5 shrink-0 font-mono text-xs text-ai/80">¶{i + 1}</span>
                  <span>{t(k)}</span>
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* Пункты */}
        <section aria-label={t(privacy ? "ui.check.fields" : "ui.check.summary")}>
          <div className="flex items-center gap-2">
            <MascotHead className="h-7 w-7" />
            <h3 className="font-semibold">{t(privacy ? "ui.check.fields" : hunt ? "ui.hunt.answer" : "ui.check.summary")}</h3>
            {!finished && <span className="ml-auto text-xs text-muted">{hunt ? t("ui.hunt.marked", { n: marked }) : left > 0 ? t("ui.check.left", { n: left }) : t("ui.check.ready")}</span>}
          </div>
          {timed && !result?.passed && (
            <div className="mt-3 rounded-xl border border-gold/40 bg-gold/5 p-3">
              {running ? (
                <div>
                  <div className="flex items-center justify-between text-sm font-semibold">
                    <span className="text-gold">⏱ {t("ui.check.timeLeft", { n: remaining })}</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full rounded-full bg-gold transition-[width] duration-300" style={{ width: `${(remaining / quest.timer!) * 100}%` }} />
                  </div>
                </div>
              ) : !result?.passed ? (
                <div className="text-sm">
                  {timedOut && <p className="mb-2 font-semibold text-bad">{t("ui.check.timeUp")}</p>}
                  <p className="text-muted">{t("ui.check.timerHint", { n: quest.timer! })}</p>
                  <button onClick={start} className="menu-cta mt-3 w-full rounded-xl py-2.5 font-semibold text-white">
                    <span className="relative">⏱ {t("ui.check.start")}</span>
                  </button>
                </div>
              ) : null}
            </div>
          )}
          {hunt && (!timed || running || result) && (
            <HuntText quest={quest} answers={answers} result={result} reveal={Boolean(revealWrong && result && !result.shortcut)} locked={finished || (timed && !running)} t={t}
              toggle={(id) => setAnswers((a) => ({ ...a, [id]: a[id] === "bug" ? "" : "bug" }))} />
          )}
          {!hunt && (!timed || running || result) && <ul className="mt-3 space-y-2.5">
            {quest.items.map((item, i) => {
              const picked = answers[item.id];
              const wrong = result && result.wrong.includes(item.id);
              const showMark = revealWrong && result && !result.shortcut;
              return (
                <li
                  key={item.id}
                  className={`anim-rise rounded-xl border p-3 transition-colors ${showMark ? (wrong ? "border-bad/60 bg-bad/5" : "border-ok/40 bg-ok/5") : "border-line bg-surface-2/50"}`}
                  style={{ animationDelay: `${i * 70}ms` }}
                >
                  <div className="flex items-start gap-2">
                    {showMark && <span aria-hidden className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-xs ${wrong ? "bg-bad/20 text-bad" : "bg-ok/20 text-ok"}`}>{wrong ? "✕" : "✓"}</span>}
                    <p className="text-[15px] leading-snug">{privacy ? <span className="font-semibold">{t(item.textKey)}</span> : t(item.textKey)}</p>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-1.5" role="radiogroup" aria-label={t(item.textKey)}>
                    {quest.options.map((o) => {
                      const on = picked === o.id;
                      return (
                        <button
                          key={o.id}
                          role="radio"
                          aria-checked={on}
                          disabled={finished}
                          onClick={() => setAnswers((a) => ({ ...a, [item.id]: o.id }))}
                          className={`rounded-lg border px-2 py-1.5 text-xs font-semibold leading-tight transition sm:text-[13px] ${toneClasses(OPTION_TONE[o.id] ?? "ai", on)} disabled:cursor-default`}
                        >
                          {t(o.labelKey)}
                        </button>
                      );
                    })}
                  </div>
                  {showMark && item.explainKey && (
                    <p className={`mt-2 text-xs leading-snug ${wrong ? "text-bad" : "text-muted"}`}>
                      {wrong && <span className="font-semibold">{t("ui.check.right", { answer: t(quest.options.find((o) => o.id === item.answer)!.labelKey) })} </span>}
                      {t(item.explainKey)}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>}

          {error && <p className="mt-3 text-sm text-bad" role="alert">{error}</p>}

          {result && (
            <div className={`anim-rise mt-4 rounded-xl border p-3.5 ${result.passed ? "border-ok/40 bg-ok/10" : "border-bad/40 bg-bad/10"}`} aria-live="polite">
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className={`rounded-full px-2.5 py-0.5 font-semibold ${result.passed ? "bg-ok/15 text-ok" : "bg-bad/15 text-bad"}`}>
                  {result.shortcut ? t("ui.check.shortcutDone") : t("ui.check.result", { q: Math.round(result.quality * 100) })} · {t(result.passed ? "ui.neira.passed" : "ui.neira.failed")}
                </span>
              </div>
              {result.passed && <RewardSlot />}
              {!result.passed && <p className="mt-2 text-sm">{t("ui.check.mistakes", { n: result.wrong.length })} {fails >= 2 ? t("ui.check.hintShown") : ""}</p>}
              {result.passed && !result.shortcut && result.wrong.length > 0 && <p className="mt-2 text-sm text-muted">{t("ui.check.passedWithMisses", { n: result.wrong.length })}</p>}
              {result.passed && !result.shortcut && result.wrong.length === 0 && <p className="mt-2 text-sm text-ok">{t("ui.check.perfect")}</p>}
              {result.shortcut && <p className="mt-2 text-sm text-muted">{t("ui.check.shortcutAfter")}</p>}
            </div>
          )}

          {!finished ? (
            (!timed || running) && <div className="mt-4 space-y-2">
              <button onClick={submit} className="w-full rounded-xl bg-ai py-3 font-semibold text-white shadow-lg shadow-ai/25 hover:brightness-110">
                {t(privacy ? "ui.check.submitPrivacy" : "ui.check.submit")}
              </button>
              {quest.shortcut && (
                <button onClick={shortcut} className="w-full rounded-xl border border-gold/50 bg-gold/5 py-2.5 text-sm text-gold hover:bg-gold/10">
                  ⚡ {t(quest.shortcut.labelKey)}
                  <span className="block text-xs font-normal text-muted">{t("ui.check.shortcutHint")}</span>
                </button>
              )}
            </div>
          ) : (
            <>
            {!result?.shortcut && <div className="mt-4"><Takeaway game={game} questId={quest.id} /></div>}
            <button onClick={onFinished} className="mt-4 w-full rounded-xl bg-ok py-3 font-semibold text-bg hover:brightness-110">
              {t("ui.neira.next")}
            </button>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

/** Ответ ИИ сплошным текстом: каждая фраза — кнопка, тап помечает её как ошибку. */
function HuntText({
  quest,
  answers,
  result,
  reveal,
  locked,
  toggle,
  t,
}: {
  quest: ClassifyQuest;
  answers: Record<string, string>;
  result: Result | null;
  reveal: boolean;
  locked: boolean;
  toggle: (id: string) => void;
  t: GameApi["t"];
}) {
  const explained = reveal ? quest.items.filter((i) => i.answer === "bug" || answers[i.id] === "bug") : [];
  return (
    <div className="mt-3">
      {!reveal && <p className="mb-2 text-xs leading-snug text-muted">{t("ui.hunt.hint")}</p>}
      <div className="rounded-xl border border-ai/30 bg-surface-2/50 p-3.5 text-[15px] leading-[1.9]">
        {quest.items.map((item) => {
          const on = answers[item.id] === "bug";
          const isBug = item.answer === "bug";
          let cls = on ? "bg-bad/20 text-bad ring-1 ring-bad/60" : "hover:bg-ai/10";
          if (reveal) cls = isBug ? (on ? "bg-ok/20 text-ok ring-1 ring-ok/60" : "bg-bad/20 text-bad ring-1 ring-bad/60 underline decoration-wavy") : on ? "bg-gold/15 text-gold line-through" : "";
          return (
            <button
              key={item.id}
              type="button"
              disabled={locked || reveal}
              aria-pressed={on}
              onClick={() => toggle(item.id)}
              className={`inline rounded px-0.5 text-left transition-colors disabled:cursor-default ${cls}`}
            >
              {t(item.textKey)}
            </button>
          );
        })}
      </div>
      {explained.length > 0 && result && (
        <ul className="mt-3 space-y-2">
          {explained.map((item) => {
            const on = answers[item.id] === "bug";
            const isBug = item.answer === "bug";
            const label = isBug ? (on ? "ui.hunt.found" : "ui.hunt.missed") : "ui.hunt.falseAlarm";
            const tone = isBug && on ? "border-ok/40 bg-ok/5 text-ok" : isBug ? "border-bad/50 bg-bad/5 text-bad" : "border-gold/40 bg-gold/5 text-gold";
            return (
              <li key={item.id} className={`rounded-lg border p-2.5 text-xs leading-snug ${tone}`}>
                <span className="font-semibold">{t(label)}:</span> <span className="text-ink">«{t(item.textKey).trim()}»</span>
                {item.explainKey && <span className="mt-1 block text-muted">{t(item.explainKey)}</span>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Таблица клиентов: прямо на ней видно, что получит ТАКТ ИИ — метка, исходное значение или пропуск. */
function PrivacyTable({
  quest,
  answers,
  t,
  maskLabel,
}: {
  quest: ClassifyQuest;
  answers: Record<string, string>;
  t: GameApi["t"];
  maskLabel: (k: string) => string;
}) {
  const [head, ...rows] = quest.sourceKeys.map((k) => t(k).split("|").map((c) => c.trim()));
  return (
    <div className="mt-3 -mx-1 overflow-x-auto">
      <table className="w-full border-separate border-spacing-0 text-left text-[12px] leading-snug sm:text-[13px]">
        <thead>
          <tr>
            {head!.map((h, i) => {
              const a = answers[quest.items[i]?.id ?? ""];
              return (
                <th key={i} className={`border-b border-line px-1 pb-1.5 align-bottom font-mono text-[10px] uppercase tracking-wide ${a === "remove" ? "text-muted/50 line-through" : a === "mask" ? "text-ai" : "text-muted"}`}>
                  {h}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, r) => (
            <tr key={r} className="anim-rise" style={{ animationDelay: `${r * 100}ms` }}>
              {row.map((cell, i) => {
                const item = quest.items[i];
                const a = item ? answers[item.id] : undefined;
                return (
                  <td key={i} className="border-b border-line/60 px-1 py-2 align-top break-words">
                    {a === "mask" && item ? (
                      <span className="rounded bg-ai/15 px-1 font-mono text-ai">{maskLabel(item.textKey)}</span>
                    ) : a === "remove" ? (
                      <span className="select-none rounded bg-surface-2 px-1 text-muted/40" aria-label={t("ui.check.removed")}>▒▒▒</span>
                    ) : (
                      <span className={a === "keep" ? "text-ok" : ""}>{cell}</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
