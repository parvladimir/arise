import { describe, expect, it } from "vitest";
import { content } from "../../src/content";
import { resetSim, simulate, type Profile } from "./sim";

// Многошаговые задания (кампания из трёх текстов) получают лимит попыток на каждый шаг.
const stagesOf = (id: string) => {
  const q = content.quests.find((x) => x.id === id);
  return q?.kind === "prompt" ? q.stages.length : 1;
};

const run = (p: Profile, seed: number) => {
  resetSim();
  return simulate(p, seed);
};

describe("симуляция экономики первого акта", () => {
  for (const seed of [1, 7, 42, 2026]) {
    it(`все типы игроков проходят прототип (seed ${seed})`, () => {
      for (const p of ["careful", "average", "hasty"] as Profile[]) {
        const r = run(p, seed);
        expect(r.finished, p).toBe(true);
        for (const [q, n] of Object.entries(r.attempts)) expect(n, `${p} ${q}`).toBeLessThanOrEqual(8 * stagesOf(q));
      }
    });

    it(`торопливый зарабатывает не меньше 60% от аккуратного (seed ${seed})`, () => {
      const careful = run("careful", seed);
      const hasty = run("hasty", seed);
      expect(hasty.earned).toBeGreaterThanOrEqual(careful.earned * 0.6);
      expect(hasty.earned).toBeLessThan(careful.earned);
    });
  }

  it("первый акт занимает у аккуратного игрока 10–40 минут чистых действий", () => {
    const m = run("careful", 1).minutes;
    expect(m).toBeGreaterThan(10);
    expect(m).toBeLessThan(40);
  });
});
