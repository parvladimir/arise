// Симуляция экономики первого акта для трёх типов игроков.
// Запуск: npm run sim. Проверки тех же свойств — в sim.test.ts.

import { content } from "../../src/content";
import { makeTranslator } from "../../src/content/i18n";
import { apply, newGameState, type Ctx } from "../../src/core/engine";
import { runPrompt, type Selection } from "../../src/core/promptSim";
import type { Action, GameState, PromptStage, QuestDef } from "../../src/core/types";

export type Profile = "careful" | "average" | "hasty";

/** Оценка секунд реального времени на действие — гипотеза для плейтеста. */
const SECONDS = {
  careful: { dialog: 15, attempt: 60, shop: 30 },
  average: { dialog: 10, attempt: 40, shop: 20 },
  hasty: { dialog: 5, attempt: 20, shop: 10 },
} as const;

const ctx: Ctx = { content, t: makeTranslator("ru", "they") };

export interface SimResult {
  profile: Profile;
  money: number;
  earned: number;
  xp: number;
  attempts: Record<string, number>;
  bought: string[];
  minutes: number;
  gigs: number;
  finished: boolean;
}

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function optionsBySlot(stage: PromptStage, state: GameState) {
  return stage.slots
    .filter((slot) => state.slots.includes(slot))
    .map((slot) => ({ slot, cards: stage.cards.filter((id) => content.cards.find((c) => c.id === id)?.slot === slot) }));
}

function allSelections(stage: PromptStage, state: GameState): Selection[] {
  const groups = optionsBySlot(stage, state);
  const out: Selection[] = [];
  const walk = (i: number, sel: Selection) => {
    if (i === groups.length) return void out.push(sel);
    const g = groups[i]!;
    if (!stage.required.includes(g.slot)) walk(i + 1, sel);
    for (const id of g.cards) walk(i + 1, { ...sel, [g.slot]: id });
  };
  walk(0, {});
  return out;
}

function pickSelection(profile: Profile, stage: PromptStage, state: GameState, attempt: number, rand: () => number, previous: Record<number, Selection>): Selection {
  const all = allSelections(stage, state);
  const scored = all.map((sel) => {
    const r = runPrompt(stage, sel, ctx.t, previous);
    return { sel, q: r.quality, ok: r.passed };
  });
  if (profile === "careful") return scored.sort((a, b) => Number(b.ok) - Number(a.ok) || b.q - a.q)[0]!.sel;
  if (profile === "average") {
    // Пропускает необязательные слоты, если без них проходит; иначе берёт лучшее.
    const minimal = scored.filter((s) => s.ok).sort((a, b) => Object.keys(a.sel).length - Object.keys(b.sel).length || b.q - a.q);
    return (attempt === 0 ? minimal[0] : scored.sort((a, b) => Number(b.ok) - Number(a.ok) || b.q - a.q)[0])!.sel;
  }
  // Торопливый: первая попытка — первая карточка в обязательных слотах, дальше случайно, к 4-й попытке «читает критерии».
  if (attempt === 0) {
    const sel: Selection = {};
    for (const g of optionsBySlot(stage, state)) if (stage.required.includes(g.slot)) sel[g.slot] = g.cards[0];
    return sel;
  }
  if (attempt >= 3) return scored.filter((s) => s.ok).sort((a, b) => a.q - b.q)[0]!.sel;
  return scored[Math.floor(rand() * scored.length)]!.sel;
}

const SHOP_PLAN: Record<Profile, string[]> = {
  careful: ["cheatsheet", "lamp"],
  average: ["lamp", "cheatsheet"],
  hasty: ["coffee", "lamp"],
};

/** maxStage: дальше этого этапа сюжет не берём (баланс «торопливый/аккуратный» проверяется для этапов 1–3). */
export function simulate(profile: Profile, seed = 1, maxStage = Infinity): SimResult {
  const rand = rng(seed);
  let state = newGameState({ name: "Sim", avatar: "a1", pronoun: "they" }, ctx);
  const attempts: Record<string, number> = {};
  let seconds = 0;
  const act = (a: Action) => {
    const r = apply(state, a, ctx);
    state = r.state;
    return r.events;
  };

  let gigs = 0;
  let needMoney = false;
  for (let guard = 0; guard < 400; guard++) {
    const open = (q: QuestDef) => {
      const st = state.quests[q.id]?.status;
      return st === "active" || st === "available";
    };
    // Сюжет идёт первым; подработку берём, только если не хватает денег на покупку (или она уже начата).
    const activeGig = content.quests.find((q) => q.repeatable && state.quests[q.id]?.status === "active");
    const story = content.quests.find((q) => !q.repeatable && open(q) && q.stage <= maxStage);
    const gig = content.quests.filter((q) => q.repeatable && open(q))[gigs % 3];
    const quest = (activeGig ?? (needMoney ? gig : story)) as QuestDef | undefined;
    if (!quest) break;
    if (quest.repeatable && state.quests[quest.id]?.status === "available") {
      gigs += 1;
      needMoney = false;
    }
    const progress = state.quests[quest.id]!;
    if (progress.status === "available") {
      act({ type: "acceptQuest", questId: quest.id });
      continue;
    }
    if (quest.kind === "dialog") {
      act({ type: "choose", questId: quest.id, choiceId: quest.choices[Math.floor(rand() * quest.choices.length)]!.id });
      seconds += SECONDS[profile].dialog;
    } else if (quest.kind === "purchase" && quest.items) {
      const wanted = profile === "hasty" ? [...quest.items].reverse() : quest.items;
      const id = wanted.find((i) => state.money >= content.items.find((x) => x.id === i)!.price);
      if (id) {
        act({ type: "buy", itemId: id });
        seconds += SECONDS[profile].shop;
      } else {
        needMoney = true;
        if (gigs > 40) break;
      }
    } else if (quest.kind === "purchase") {
      for (const id of SHOP_PLAN[profile]) {
        const item = content.items.find((i) => i.id === id)!;
        if (state.money >= item.price && !state.inventory.includes(id)) {
          act({ type: "buy", itemId: id });
          seconds += SECONDS[profile].shop;
        }
      }
      if (state.quests[quest.id]?.status !== "done") break; // застрял: не хватает денег
    } else if (quest.kind === "classify") {
      // Аккуратный решает без ошибок; средний ошибается в одном пункте с первой попытки;
      // торопливый идёт коротким путём, если он есть.
      const correct = Object.fromEntries(quest.items.map((i) => [i.id, i.answer]));
      if (profile === "hasty" && quest.shortcut && progress.attempts === 0) {
        act({ type: "takeShortcut", questId: quest.id });
      } else if (profile !== "careful" && progress.attempts === 0) {
        const first = quest.items[0]!;
        const wrong = quest.options.find((o) => o.id !== first.answer)!.id;
        act({ type: "submitClassify", questId: quest.id, answers: { ...correct, [first.id]: wrong } });
      } else {
        act({ type: "submitClassify", questId: quest.id, answers: correct });
      }
      seconds += SECONDS[profile].attempt * 2;
    } else {
      const stage = quest.stages[progress.stage]!;
      const tries = progress.attempts;
      const sel = pickSelection(profile, stage, state, tries - stageStart(quest, progress.stage, attempts), rand, progress.selections);
      act({ type: "submitPrompt", questId: quest.id, selection: sel });
      attempts[quest.id] = (attempts[quest.id] ?? 0) + 1;
      seconds += SECONDS[profile].attempt;
    }
  }

  void gigs;
  const earned = state.ledger.filter((e) => e.delta > 0).reduce((s, e) => s + e.delta, 0);
  return {
    profile,
    money: state.money,
    earned,
    xp: state.xp,
    attempts,
    bought: [...state.inventory],
    minutes: Math.round((seconds / 60) * 10) / 10,
    gigs,
    finished: content.quests.filter((q) => !q.repeatable && state.quests[q.id]).every((q) => state.quests[q.id]!.status === "done") && state.quests.q15b?.status === "done",
  };
}

// Количество попыток, сделанных до начала текущей стадии (для торопливого игрока).
const stageStarts = new Map<string, number>();
function stageStart(quest: QuestDef, stage: number, attempts: Record<string, number>): number {
  const key = `${quest.id}:${stage}`;
  if (!stageStarts.has(key)) stageStarts.set(key, attempts[quest.id] ?? 0);
  return stageStarts.get(key)!;
}

export function resetSim() {
  stageStarts.clear();
}
