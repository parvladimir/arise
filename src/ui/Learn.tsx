"use client";

import { useState } from "react";
import { content } from "@/content";
import type { LessonDef, SlotId } from "@/core/types";
import type { GameApi } from "./useGame";
import { Mascot, TaktLogo } from "./Mascot";

export const lessonFor = (questId: string | undefined): LessonDef | undefined =>
  questId ? content.lessons.find((l) => l.questId === questId) : undefined;

const SLOT_COLOR: Partial<Record<SlotId, string>> = {
  role: "#f472b6",
  goal: "#8b3dff",
  recipient: "#2dd4bf",
  audience: "#2dd4bf",
  tone: "#a78bfa",
  data: "#f5b544",
  limits: "#f87171",
  format: "#34d399",
  examples: "#fb923c",
};

/** Урок перед заданием: теория в два-три абзаца, слабый и сильный промпт, кнопка к практике. */
export function LessonCard({ game, lesson, onDone }: { game: GameApi; lesson: LessonDef; onDone: () => void }) {
  const { t } = game;
  const n = content.lessons.indexOf(lesson) + 1;
  return (
    <div className="h-full overflow-y-auto p-4">
      <article className="lesson-card anim-rise relative mx-auto max-w-2xl overflow-hidden rounded-2xl border border-ai/40 bg-surface p-5 shadow-2xl shadow-ai/15 sm:p-7">
        <div className="act-glow pointer-events-none absolute inset-0" aria-hidden />
        <div className="relative">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.25em] text-ok">
                <TaktLogo className="h-5" /> {t("ui.lesson.kicker", { n, total: content.lessons.length })}
              </p>
              <h2 className="mt-2 text-2xl font-black leading-tight sm:text-3xl">{t(lesson.titleKey)}</h2>
            </div>
            <Mascot pose="point" className="-mr-2 -mt-2 h-24 shrink-0 sm:h-28" />
          </div>
          <div className="mt-4 space-y-3 text-[15.5px] leading-relaxed text-ink/90">
            {lesson.bodyKeys.map((k, i) => (
              <p key={k} className="anim-rise" style={{ animationDelay: `${120 + i * 110}ms` }}>{t(k)}</p>
            ))}
          </div>
          {lesson.badKey && lesson.goodKey && (
            <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
              <div className="rounded-xl border border-bad/40 bg-bad/5 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-bad">✕ {t("ui.lesson.bad")}</p>
                <p className="mt-1.5 font-mono text-[13px] leading-relaxed">{t(lesson.badKey)}</p>
              </div>
              <div className="rounded-xl border border-ok/40 bg-ok/5 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-ok">✓ {t("ui.lesson.good")}</p>
                <p className="mt-1.5 font-mono text-[13px] leading-relaxed">{t(lesson.goodKey)}</p>
              </div>
            </div>
          )}
          <button onClick={onDone} className="menu-cta mt-6 w-full rounded-xl py-3.5 font-semibold text-white">
            <span className="relative">{t("ui.lesson.start")} →</span>
          </button>
        </div>
      </article>
    </div>
  );
}

/** Вывод урока после сданного задания. */
export function Takeaway({ game, questId }: { game: GameApi; questId: string }) {
  const lesson = lessonFor(questId);
  if (!lesson) return null;
  return (
    <div className="anim-rise rounded-xl border border-ok/40 bg-ok/10 p-3.5 text-sm leading-snug">
      <p className="text-xs font-semibold uppercase tracking-wide text-ok">📘 {game.t("ui.lesson.takeaway")}</p>
      <p className="mt-1">{game.t(lesson.takeawayKey)}</p>
    </div>
  );
}

/** Собирает выбранные карточки в обычный текст промпта — так, как его «видит» модель. */
export function buildPrompt(t: GameApi["t"], slots: SlotId[], selection: Partial<Record<SlotId, string>>) {
  return slots.map((slot) => {
    const id = selection[slot];
    const card = id ? content.cards.find((c) => c.id === id) : undefined;
    if (!card) return { slot, text: null as string | null };
    const v = t(card.textKey);
    const value = slot === "role" ? v.charAt(0).toUpperCase() + v.slice(1) : v;
    return { slot, text: t(`ui.prompt.line.${slot}`, { v: value }) };
  });
}

export function PromptPreview({ game, slots, selection }: { game: GameApi; slots: SlotId[]; selection: Partial<Record<SlotId, string>> }) {
  const { t } = game;
  const [copied, setCopied] = useState(false);
  const lines = buildPrompt(t, slots, selection);
  const filled = lines.filter((l) => l.text);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(filled.map((l) => l.text).join("\n"));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* буфер обмена недоступен — ничего страшного */
    }
  };
  return (
    <div className="prompt-preview rounded-xl border border-ai/30 bg-bg/70 p-3.5">
      <div className="flex items-center gap-2">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-ai">{t("ui.prompt.title")}</span>
        {filled.length > 0 && (
          <button onClick={copy} className="ml-auto rounded-md border border-line px-2 py-0.5 text-xs text-muted hover:border-ai/60 hover:text-ink">
            {copied ? `✓ ${t("ui.prompt.copied")}` : `⧉ ${t("ui.prompt.copy")}`}
          </button>
        )}
      </div>
      {filled.length === 0 ? (
        <p className="mt-2 text-sm text-muted">{t("ui.prompt.empty")}</p>
      ) : (
        <div className="mt-2 space-y-1 font-mono text-[13px] leading-relaxed">
          {lines.map((l) =>
            l.text ? (
              <p key={l.slot} className="anim-rise border-l-2 pl-2" style={{ borderColor: SLOT_COLOR[l.slot] ?? "#8b3dff" }}>
                {l.text}
              </p>
            ) : (
              <p key={l.slot} className="border-l-2 border-line pl-2 text-muted/60">
                {t(`slot.${l.slot}`)}: {t("ui.prompt.unset")}
              </p>
            ),
          )}
        </div>
      )}
      <p className="mt-2 text-xs text-muted">{t("ui.prompt.hint")}</p>
    </div>
  );
}
