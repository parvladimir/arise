// Детерминированный симулятор «Нейры»: собирает ответ из сегментов контента
// по выбранным карточкам и оценивает его по критериям заказчика.
// Настоящей модели здесь нет намеренно: результат предсказуем и проверяем тестами.

import type { PromptResult, PromptStage, SlotId, TextKey, When, CriterionResult } from "./types";

export type Selection = Partial<Record<SlotId, string>>;
export type Translate = (key: TextKey, vars?: Record<string, string | number>) => string;

export function matches(when: When | undefined, selection: Selection): boolean {
  if (!when) return true;
  for (const [slot, allowed] of Object.entries(when) as [SlotId, string[]][]) {
    const picked = selection[slot] ?? "none";
    if (!allowed.includes(picked)) return false;
  }
  return true;
}

export function runPrompt(
  stage: PromptStage,
  selection: Selection,
  t: Translate,
  previous: Record<number, Selection> = {},
): PromptResult {
  const segments: PromptResult["segments"] = [];
  for (const seg of stage.segments) {
    const variant = seg.variants.find((v) => matches(v.when, selection));
    if (!variant || variant.textKey === "") continue;
    segments.push({ id: seg.id, textKey: variant.textKey, hallucination: Boolean(variant.hallucination) });
  }
  const length = segments.map((s) => t(s.textKey)).join(" ").length;
  const hasHallucination = segments.some((s) => s.hallucination);

  const criteria: CriterionResult[] = stage.criteria.map((c) => {
    let passed = false;
    switch (c.kind) {
      case "cards":
        passed = matches(c.when, selection);
        break;
      case "maxLength":
        passed = length <= c.max;
        break;
      case "noHallucination":
        passed = !hasHallucination;
        break;
      case "differsFromStage": {
        const before = previous[c.stage]?.[c.slot];
        passed = before !== undefined && before !== selection[c.slot];
        break;
      }
    }
    return { id: c.id, labelKey: c.labelKey, weight: c.weight, passed, hard: Boolean(c.hard) };
  });

  const total = criteria.reduce((sum, c) => sum + c.weight, 0) || 1;
  const earned = criteria.reduce((sum, c) => sum + (c.passed ? c.weight : 0), 0);
  const hardFailed = criteria.some((c) => c.hard && !c.passed);
  const quality = hardFailed ? Math.min(earned / total, stage.pass - 0.01) : earned / total;

  return {
    segments,
    length,
    quality: Math.round(quality * 100) / 100,
    criteria,
    passed: quality >= stage.pass,
  };
}
