// Разбор промпта, написанного своими словами. Без внешних сервисов: каждая карточка
// описана набором признаков (регулярных выражений), и текст сводится к тем же карточкам,
// что и в обычном режиме. Дальше работает тот же детерминированный симулятор.

import type { PromptStage, SlotId } from "./types";

export type CardPatterns = Record<string, string[]>;

/** Приводим текст к виду, удобному для поиска: нижний регистр, «ё» → «е», одинарные пробелы. */
export function normalize(text: string): string {
  return text.toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ");
}

/** Признак засчитывается, если перед ним нет отрицания («не резко», «без эмодзи»). */
function countHits(text: string, pattern: string): number {
  const re = new RegExp(pattern, "g");
  let hits = 0;
  for (const m of text.matchAll(re)) {
    const before = text.slice(Math.max(0, (m.index ?? 0) - 5), m.index ?? 0);
    const negatable = !/^(не|без)(\s|$)/.test(m[0]);
    if (negatable && /(^|\s)(не|без)\s$/.test(before)) continue;
    hits += 1;
  }
  return hits;
}

/** Сколько признаков карточки нашлось в тексте. */
export function cardScore(text: string, patterns: string[] | undefined): number {
  if (!patterns) return 0;
  const norm = normalize(text);
  return patterns.reduce((n, p) => n + (countHits(norm, p) > 0 ? 1 : 0), 0);
}

/**
 * Для каждого открытого слота стадии выбирает карточку с наибольшим числом совпавших признаков.
 * Слот без совпадений остаётся пустым — как если бы игрок его не заполнил.
 */
export function analyzeFreeform(
  text: string,
  stage: PromptStage,
  cardSlot: (id: string) => SlotId | undefined,
  patterns: CardPatterns,
  unlocked: SlotId[],
): Partial<Record<SlotId, string>> {
  const out: Partial<Record<SlotId, string>> = {};
  for (const slot of stage.slots) {
    if (!unlocked.includes(slot)) continue;
    let best: { id: string; score: number } | null = null;
    for (const id of stage.cards) {
      if (cardSlot(id) !== slot) continue;
      const score = cardScore(text, patterns[id]);
      if (score > 0 && (!best || score > best.score)) best = { id, score };
    }
    if (best) out[slot] = best.id;
  }
  return out;
}
