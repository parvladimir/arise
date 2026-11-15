// Формулы экономики из проектного пакета (раздел 6).

export const QUALITY_PASS = 0.7;
export const QUALITY_TIP = 0.9;

/** Базовая ставка заказа на карьерном этапе s. */
export function basePay(stage: number): number {
  return 100 * Math.pow(2.4, stage - 1);
}

/** Множитель качества: ниже порога — 0 (доработка), от 90% — чаевые. */
export function qualityMultiplier(quality: number): number {
  if (quality < QUALITY_PASS) return 0;
  if (quality >= QUALITY_TIP) return 1.25;
  return 1;
}

/** После двух неудачных попыток клиент платит на 15% меньше (подобрано симуляцией: tools/sim). */
export function attemptMultiplier(attempts: number): number {
  return attempts > 2 ? 0.85 : 1;
}

export function orderPay(opts: {
  stage: number;
  complexity: number;
  client: number;
  quality: number;
  rep: number;
  attempts: number;
}): number {
  const raw =
    basePay(opts.stage) *
    opts.complexity *
    qualityMultiplier(opts.quality) *
    opts.client *
    (1 + 0.02 * Math.max(0, Math.min(50, opts.rep))) *
    attemptMultiplier(opts.attempts);
  return Math.round(raw / 5) * 5;
}

/** Опыт, нужный для перехода с уровня L на L+1. */
export function xpForLevel(level: number): number {
  return Math.round(50 * Math.pow(level, 1.6));
}

export function levelFromXp(xp: number): { level: number; into: number; need: number } {
  let level = 1;
  let rest = xp;
  while (rest >= xpForLevel(level)) {
    rest -= xpForLevel(level);
    level += 1;
  }
  return { level, into: rest, need: xpForLevel(level) };
}

export function skillLevel(uses: number, thresholds: number[]): number {
  let level = 0;
  for (const t of thresholds) if (uses >= t) level += 1;
  return level;
}
