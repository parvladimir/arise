"use client";

import { content } from "@/content";
import type { GameState, PromptStage, SlotId } from "@/core/types";
import type { GameApi } from "./useGame";

/** Поле «своими словами»: текст запроса, материалы заказа и живой разбор — что ТАКТ AI нашёл в промпте. */
export function FreeformInput({
  game,
  state,
  stage,
  text,
  setText,
  selection,
}: {
  game: GameApi;
  state: GameState;
  stage: PromptStage;
  text: string;
  setText: (v: string) => void;
  selection: Partial<Record<SlotId, string>>;
}) {
  const { t } = game;
  // Данные и примеры игрок не обязан помнить наизусть: их можно «приложить» к запросу одним нажатием.
  const materials = stage.cards
    .map((id) => content.cards.find((c) => c.id === id)!)
    .filter((c) => (c.slot === "data" || c.slot === "examples") && state.slots.includes(c.slot));
  const insert = (v: string) => setText(text.trim() ? `${text.trimEnd()}\n${v}` : v);
  const cardText = (id: string | undefined) => {
    const c = id ? content.cards.find((x) => x.id === id) : undefined;
    return c ? t(c.textKey) : null;
  };

  return (
    <div className="mt-2 space-y-3">
      <div className="rounded-xl border border-ai/40 bg-bg/70 p-1 focus-within:shadow-[0_0_0_1px_var(--color-ai)]">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          aria-label={t("ui.free.own")}
          placeholder={t("ui.free.placeholder")}
          className="block w-full resize-y bg-transparent p-2.5 font-mono text-[14px] leading-relaxed text-ink outline-none placeholder:text-muted/60"
        />
        <p className="px-2.5 pb-1.5 text-right text-[11px] text-muted">{t("ui.free.chars", { n: [...text].length })}</p>
      </div>

      {materials.length > 0 && (
        <div>
          <p className="text-xs text-muted">
            📎 <span className="font-semibold">{t("ui.free.materials")}</span> · {t("ui.free.materialsHint")}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {materials.map((c) => (
              <button key={c.id} onClick={() => insert(t(c.textKey))} className="rounded-lg border border-gold/40 bg-gold/5 px-2.5 py-1 text-left text-xs text-gold hover:bg-gold/15">
                + {t(c.textKey)}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-line bg-surface-2/50 p-3">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-ai">{t("ui.free.understood")}</p>
        <ul className="mt-2 space-y-1.5 text-sm">
          {stage.slots.map((slot) => {
            const unlocked = state.slots.includes(slot);
            const found = cardText(selection[slot]);
            const required = stage.required.includes(slot);
            return (
              <li key={slot} className="flex items-start gap-2">
                <span
                  aria-hidden
                  className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] ${!unlocked ? "bg-surface-2 text-muted" : found ? "bg-ok/20 text-ok" : required ? "bg-bad/20 text-bad" : "bg-surface-2 text-muted"}`}
                >
                  {!unlocked ? "🔒" : found ? "✓" : "·"}
                </span>
                <span className="min-w-0">
                  <span className="font-mono text-xs uppercase tracking-wider text-ai">{t(`slot.${slot}`)}</span>
                  {required && <span className="ml-1.5 text-xs text-muted">{t("ui.neira.required2")}</span>}
                  <span className={`block leading-snug ${found ? "text-ink" : "text-muted/70"}`}>
                    {!unlocked ? t("ui.free.locked") : found ?? t("ui.free.missing")}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
        <p className="mt-2 text-xs text-muted">{t("ui.free.tip")}</p>
      </div>
    </div>
  );
}
