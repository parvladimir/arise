// Новые виды заданий, чтобы заказы не были одинаковыми:
// «Найди ошибку ИИ» — на время тапаешь по выдумкам прямо в ответе ИИ, сверяясь с данными клиента;
// «Почини промпт» — дан плохой промпт и плохой ответ, можно поменять только 2 строки.

import type { ClassifyItem, NpcId, PromptStage, QuestDef } from "@/core/types";

const bug = (q: string, id: string): ClassifyItem => ({ id, textKey: `${q}.f.${id}`, answer: "bug", weight: 2, explainKey: `${q}.e.${id}` });
const ok = (q: string, id: string): ClassifyItem => ({ id, textKey: `${q}.f.${id}`, answer: "ok", weight: 1 });

const hunt = (
  id: string,
  stage: number,
  requires: string[],
  client: NpcId,
  sources: number,
  items: ClassifyItem[],
  timer: number,
  reward: { xp: number; complexity: number },
): QuestDef => ({
  id,
  kind: "classify",
  game: "hunt",
  titleKey: `${id}.title`,
  stage,
  requires,
  repeatable: true,
  offer: { type: "board", from: client, textKey: `${id}.offer` },
  goalKey: `${id}.goal`,
  client,
  introKey: `${id}.intro`,
  sourceTitleKey: `${id}.sourceTitle`,
  sourceKeys: Array.from({ length: sources }, (_, i) => `${id}.src.${i + 1}`),
  options: [
    { id: "ok", labelKey: "ui.hunt.ok" },
    { id: "bug", labelKey: "ui.hunt.bug" },
  ],
  items,
  pass: 0.75,
  timer,
  reward: { xp: reward.xp, pay: { complexity: reward.complexity, client: 1 } },
  onComplete: [{ from: client, textKey: `${id}.done` }],
});

export const huntQuests: QuestDef[] = [
  hunt("hunt1", 1, ["q3"], "anna", 4, [ok("hunt1", "a"), bug("hunt1", "b"), ok("hunt1", "c"), ok("hunt1", "d"), bug("hunt1", "e"), ok("hunt1", "f"), bug("hunt1", "g")], 40, { xp: 20, complexity: 0.6 }),
  hunt("hunt2", 2, ["q13"], "alex", 5, [ok("hunt2", "a"), bug("hunt2", "b"), ok("hunt2", "c"), ok("hunt2", "d"), bug("hunt2", "e"), bug("hunt2", "f"), ok("hunt2", "g")], 45, { xp: 25, complexity: 0.5 }),
  hunt("hunt4", 4, ["q21"], "vera", 4, [ok("hunt4", "a"), ok("hunt4", "b"), bug("hunt4", "c"), ok("hunt4", "d"), bug("hunt4", "e"), ok("hunt4", "f"), bug("hunt4", "g")], 45, { xp: 35, complexity: 0.4 }),
  hunt("hunt3", 3, ["q16"], "sergey", 4, [ok("hunt3", "a"), ok("hunt3", "b"), bug("hunt3", "c"), ok("hunt3", "d"), ok("hunt3", "e"), bug("hunt3", "f"), bug("hunt3", "g")], 45, { xp: 30, complexity: 0.5 }),
];

/** «Почини промпт» строится на стадии существующего заказа: те же карточки и проверки, но старт с плохого набора. */
export function buildFixQuests(quests: QuestDef[]): QuestDef[] {
  const base = (questId: string, index: number): PromptStage => {
    const q = quests.find((x) => x.id === questId);
    if (!q || q.kind !== "prompt") throw new Error(`fix: нет заказа ${questId}`);
    return q.stages[index]!;
  };
  const fix = (
    id: string,
    stage: number,
    requires: string[],
    client: NpcId,
    from: [string, number],
    preset: PromptStage["preset"],
    reward: { xp: number; complexity: number },
  ): QuestDef => ({
    id,
    kind: "prompt",
    titleKey: `${id}.title`,
    stage,
    requires,
    repeatable: true,
    offer: { type: "board", from: client, textKey: `${id}.offer` },
    goalKey: `${id}.goal`,
    client,
    stages: [{ ...base(from[0], from[1]), afterPass: undefined, reactions: undefined, taskKey: `${id}.task`, preset, maxEdits: 2 }],
    reward: { xp: reward.xp, pay: { complexity: reward.complexity, client: 1 } },
    onComplete: [{ from: client, textKey: `${id}.done` }],
  });
  return [
    fix("fix1", 1, ["q3"], "dima", ["q2", 1], { goal: "g.tap.fix", recipient: "r.neighbors", tone: "t.angry" }, { xp: 20, complexity: 0.5 }),
    fix("fix2", 2, ["q13"], "boris", ["gigSms", 0], { goal: "g.pizza.menu", data: "d.pizza.facts", format: "f.letter", tone: "t.playful" }, { xp: 25, complexity: 0.45 }),
    fix("fix4", 4, ["q22"], "vera", ["q21", 0], { role: "ro.bot.barber", goal: "g.bot.answer", data: "d.razor.price", limits: "l.bot.discount", tone: "t.warm", format: "f.bot.short" }, { xp: 35, complexity: 0.4 }),
    fix("fix3", 3, ["q16"], "anna", ["q16", 0], { goal: "g.cartoon.vague", data: "d.cartoon.place", tone: "t.style3d", format: "f.square", limits: "l.noText" }, { xp: 30, complexity: 0.45 }),
  ];
}
