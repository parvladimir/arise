// Глава 4 («Студия ТАКТ AI»): системный промпт для бота, цепочка промптов,
// честная реклама без дипфейков и питч инвестору. Тексты — в locales/ru.act4.ts.

import type { GlossaryDef, LessonDef, PromptCard, QuestDef, ResponseSegment, SlotId } from "@/core/types";

const card = (id: string, slot: SlotId): PromptCard => ({ id, slot, textKey: `card.${id}` });

export const act4Cards: PromptCard[] = [
  // Q21 — бот «Бритвы»
  card("ro.bot.admin", "role"),
  card("ro.bot.barber", "role"),
  card("g.bot.answer", "goal"),
  card("g.bot.all", "goal"),
  card("d.razor.price", "data"),
  card("l.bot.unknown", "limits"),
  card("l.bot.discount", "limits"),
  card("t.bot.slang", "tone"),
  card("f.bot.short", "format"),
  // Q22 — цепочка
  card("g.chain.facts", "goal"),
  card("g.chain.article", "goal"),
  card("d.chain.interview", "data"),
  card("f.chain.list", "format"),
  card("g.chain.outline", "goal"),
  card("a.chain.locals", "audience"),
  card("f.chain.headers", "format"),
  card("g.chain.write", "goal"),
  card("g.chain.free", "goal"),
  card("l.chain.facts", "limits"),
  // Q23 — реклама без дипфейка
  card("g.ad.celebrity", "goal"),
  card("g.ad.mascot", "goal"),
  card("d.ad.menu", "data"),
  card("l.ad.label", "limits"),
  card("l.ad.realistic", "limits"),
  // Q24 — питч
  card("ro.pitch", "role"),
  card("g.pitch.minute", "goal"),
  card("g.pitch.story", "goal"),
  card("a.investor", "audience"),
  card("a.pitch.friends", "audience"),
  card("d.hive.numbers", "data"),
  card("f.pitch.slides", "format"),
];

const lesson = (id: string, questId: string, paragraphs: number): LessonDef => ({
  id,
  questId,
  titleKey: `lesson.${id}.title`,
  bodyKeys: Array.from({ length: paragraphs }, (_, i) => `lesson.${id}.${i + 1}`),
  badKey: `lesson.${id}.bad`,
  goodKey: `lesson.${id}.good`,
  takeawayKey: `lesson.${id}.takeaway`,
});

export const act4Lessons: LessonDef[] = [
  lesson("system", "q21", 3),
  lesson("chain", "q22", 3),
  lesson("deepfake", "q23", 3),
  lesson("pitch", "q24", 3),
];

export const act4Glossary: GlossaryDef[] = [
  { id: "systemPrompt", termKey: "term.systemPrompt", defKey: "term.systemPrompt.def", questId: "q21" },
  { id: "chatbot", termKey: "term.chatbot", defKey: "term.chatbot.def", questId: "q21" },
  { id: "chain", termKey: "term.chain", defKey: "term.chain.def", questId: "q22" },
  { id: "deepfake", termKey: "term.deepfake", defKey: "term.deepfake.def", questId: "q23" },
  { id: "aiLabel", termKey: "term.aiLabel", defKey: "term.aiLabel.def", questId: "q23" },
  { id: "pitch", termKey: "term.pitch", defKey: "term.pitch.def", questId: "q24" },
];

// Ответ бота на вопрос клиента: «Сколько стоит стрижка с бородой? А скидку дадите?»
const q21Segments: ResponseSegment[] = [
  {
    id: "hello",
    variants: [
      { when: { role: ["ro.bot.barber"] }, textKey: "q21.seg.barber" },
      { when: { tone: ["t.bot.slang"] }, textKey: "q21.seg.slang" },
      { when: { role: ["ro.bot.admin"] }, textKey: "q21.seg.admin" },
      { textKey: "q21.seg.plain" },
    ],
  },
  { id: "price", variants: [{ when: { data: ["d.razor.price"] }, textKey: "q21.seg.price" }, { textKey: "q21.seg.priceInvented", hallucination: true }] },
  {
    id: "discount",
    variants: [
      { when: { limits: ["l.bot.discount"] }, textKey: "q21.seg.discount", hallucination: true },
      { when: { limits: ["l.bot.unknown"] }, textKey: "q21.seg.unknown" },
      { textKey: "q21.seg.discountInvented", hallucination: true },
    ],
  },
  { id: "scope", variants: [{ when: { goal: ["g.bot.all"] }, textKey: "q21.seg.all" }, { textKey: "" }] },
  { id: "long", variants: [{ when: { format: ["f.bot.short"] }, textKey: "" }, { textKey: "q21.seg.long" }] },
];

const q22FactsSegments: ResponseSegment[] = [
  {
    id: "main",
    variants: [
      { when: { goal: ["g.chain.article"] }, textKey: "q22.seg.rush", hallucination: true },
      { when: { goal: ["g.chain.facts"], data: ["d.chain.interview"] }, textKey: "q22.seg.facts" },
      { textKey: "q22.seg.noSource" },
    ],
  },
  { id: "format", variants: [{ when: { goal: ["g.chain.article"] }, textKey: "" }, { when: { format: ["f.chain.list"] }, textKey: "q22.seg.list" }, { textKey: "q22.seg.mess" }] },
];

const q22OutlineSegments: ResponseSegment[] = [
  {
    id: "main",
    variants: [
      { when: { goal: ["g.chain.article"] }, textKey: "q22.seg.skip" },
      { when: { audience: ["a.chain.locals"] }, textKey: "q22.seg.outlineLocals" },
      { textKey: "q22.seg.outlineGeneric" },
    ],
  },
  { id: "format", variants: [{ when: { goal: ["g.chain.article"] }, textKey: "" }, { when: { format: ["f.chain.headers"] }, textKey: "q22.seg.headers" }, { textKey: "q22.seg.vague" }] },
];

const q22WriteSegments: ResponseSegment[] = [
  {
    id: "main",
    variants: [
      { when: { goal: ["g.chain.free"] }, textKey: "q22.seg.free" },
      { textKey: "q22.seg.write" },
    ],
  },
  { id: "facts", variants: [{ when: { limits: ["l.chain.facts"] }, textKey: "q22.seg.onlyFacts" }, { textKey: "q22.seg.inventedQuote", hallucination: true }] },
  { id: "tone", variants: [{ when: { tone: ["t.warm"] }, textKey: "q22.seg.warm" }, { when: { tone: ["t.hype"] }, textKey: "q22.seg.hype" }, { textKey: "" }] },
];

// Ролик для видео-генератора
const q23Segments: ResponseSegment[] = [
  {
    id: "main",
    variants: [
      { when: { goal: ["g.ad.celebrity"] }, textKey: "q23.seg.celebrity", hallucination: true },
      { when: { goal: ["g.ad.mascot"] }, textKey: "q23.seg.mascot" },
      { textKey: "q23.seg.vague" },
    ],
  },
  { id: "menu", variants: [{ when: { data: ["d.ad.menu"] }, textKey: "q23.seg.menu" }, { textKey: "q23.seg.price", hallucination: true }] },
  {
    id: "label",
    variants: [
      { when: { limits: ["l.ad.label"] }, textKey: "q23.seg.label" },
      { when: { limits: ["l.ad.realistic"] }, textKey: "q23.seg.realistic", hallucination: true },
      { textKey: "q23.seg.noLabel" },
    ],
  },
  { id: "format", variants: [{ when: { format: ["f.vertical"] }, textKey: "q23.seg.vertical" }, { textKey: "q23.seg.wide" }] },
];

const q24Segments: ResponseSegment[] = [
  {
    id: "main",
    variants: [
      { when: { goal: ["g.pitch.story"] }, textKey: "q24.seg.story" },
      { when: { audience: ["a.pitch.friends"] }, textKey: "q24.seg.friends" },
      { when: { audience: ["a.investor"] }, textKey: "q24.seg.investor" },
      { textKey: "q24.seg.generic" },
    ],
  },
  {
    id: "numbers",
    variants: [
      { when: { data: ["d.hive.numbers"], limits: ["l.onlyMyNumbers"] }, textKey: "q24.seg.numbers" },
      { when: { data: ["d.hive.numbers"] }, textKey: "q24.seg.forecast", hallucination: true },
      { textKey: "q24.seg.invented", hallucination: true },
    ],
  },
  { id: "format", variants: [{ when: { format: ["f.pitch.slides"] }, textKey: "q24.seg.slides" }, { textKey: "q24.seg.wall" }] },
];

export const act4Quests: QuestDef[] = [
  {
    id: "q21",
    kind: "prompt",
    titleKey: "q21.title",
    stage: 4,
    requires: ["q20"],
    offer: { type: "message", from: "vera", textKey: "q21.offer" },
    goalKey: "q21.goal",
    activeGoalKey: "q21.goalActive",
    client: "vera",
    stages: [
      {
        taskKey: "q21.task",
        slots: ["role", "goal", "data", "limits", "tone", "format"],
        cards: ["ro.bot.admin", "ro.bot.barber", "g.bot.answer", "g.bot.all", "d.razor.price", "l.bot.unknown", "l.bot.discount", "t.warm", "t.bot.slang", "f.bot.short"],
        required: ["goal"],
        segments: q21Segments,
        pass: 0.75,
        criteria: [
          { id: "role", labelKey: "q21.crit.role", weight: 15, kind: "cards", when: { role: ["ro.bot.admin"] } },
          { id: "goal", labelKey: "q21.crit.goal", weight: 15, kind: "cards", when: { goal: ["g.bot.answer"] } },
          { id: "data", labelKey: "q21.crit.data", weight: 25, kind: "cards", when: { data: ["d.razor.price"] } },
          { id: "unknown", labelKey: "q21.crit.unknown", weight: 25, kind: "cards", when: { limits: ["l.bot.unknown"] } },
          { id: "tone", labelKey: "q21.crit.tone", weight: 10, kind: "cards", when: { tone: ["t.warm"] } },
          { id: "short", labelKey: "q21.crit.short", weight: 10, kind: "cards", when: { format: ["f.bot.short"] } },
          { id: "truth", labelKey: "q21.crit.truth", weight: 0, kind: "noHallucination", hard: true },
        ],
        reactions: [
          { when: { limits: ["l.bot.discount"] }, from: "vera", textKey: "q21.react.discount" },
          { when: { role: ["ro.bot.barber"] }, from: "vera", textKey: "q21.react.barber" },
          { when: { tone: ["t.bot.slang"] }, from: "vera", textKey: "q21.react.slang" },
          { when: { goal: ["g.bot.all"] }, from: "vera", textKey: "q21.react.all" },
        ],
      },
    ],
    reward: { xp: 110, pay: { complexity: 0.5, client: 1 }, rep: 4, rel: { vera: 1 }, skills: { aiComm: 2 }, achievements: ["botmaker"] },
    onComplete: [{ from: "vera", textKey: "q21.vera.done" }],
  },
  {
    id: "q22",
    kind: "prompt",
    titleKey: "q22.title",
    stage: 4,
    requires: ["q21"],
    offer: { type: "message", from: "nick", textKey: "q22.offer" },
    goalKey: "q22.goal",
    activeGoalKey: "q22.goalActive",
    client: "nick",
    stages: [
      {
        taskKey: "q22.task1",
        slots: ["goal", "data", "format"],
        cards: ["g.chain.facts", "g.chain.article", "d.chain.interview", "f.chain.list", "f.essay"],
        required: ["goal"],
        segments: q22FactsSegments,
        pass: 0.75,
        criteria: [
          { id: "facts", labelKey: "q22.crit.facts", weight: 40, kind: "cards", when: { goal: ["g.chain.facts"] } },
          { id: "source", labelKey: "q22.crit.source", weight: 40, kind: "cards", when: { data: ["d.chain.interview"] } },
          { id: "list", labelKey: "q22.crit.list", weight: 20, kind: "cards", when: { format: ["f.chain.list"] } },
          { id: "truth", labelKey: "q22.crit.truth", weight: 0, kind: "noHallucination", hard: true },
        ],
        afterPass: { from: "nick", textKey: "q22.after1" },
        reactions: [{ when: { goal: ["g.chain.article"] }, from: "nick", textKey: "q22.react.rush" }],
      },
      {
        taskKey: "q22.task2",
        slots: ["goal", "audience", "format"],
        cards: ["g.chain.outline", "g.chain.article", "a.chain.locals", "a.everyone", "f.chain.headers", "f.essay"],
        required: ["goal"],
        segments: q22OutlineSegments,
        pass: 0.75,
        criteria: [
          { id: "outline", labelKey: "q22.crit.outline", weight: 40, kind: "cards", when: { goal: ["g.chain.outline"] } },
          { id: "audience", labelKey: "q22.crit.audience", weight: 30, kind: "cards", when: { audience: ["a.chain.locals"] } },
          { id: "headers", labelKey: "q22.crit.headers", weight: 30, kind: "cards", when: { format: ["f.chain.headers"] } },
        ],
        afterPass: { from: "nick", textKey: "q22.after2" },
        reactions: [{ when: { goal: ["g.chain.article"] }, from: "nick", textKey: "q22.react.skip" }],
      },
      {
        taskKey: "q22.task3",
        slots: ["goal", "tone", "limits"],
        cards: ["g.chain.write", "g.chain.free", "t.warm", "t.hype", "l.chain.facts"],
        required: ["goal"],
        segments: q22WriteSegments,
        pass: 0.75,
        criteria: [
          { id: "write", labelKey: "q22.crit.write", weight: 40, kind: "cards", when: { goal: ["g.chain.write"] } },
          { id: "onlyFacts", labelKey: "q22.crit.onlyFacts", weight: 35, kind: "cards", when: { limits: ["l.chain.facts"] } },
          { id: "tone", labelKey: "q22.crit.tone", weight: 25, kind: "cards", when: { tone: ["t.warm"] } },
          { id: "truth", labelKey: "q22.crit.truth", weight: 0, kind: "noHallucination", hard: true },
        ],
        reactions: [
          { when: { goal: ["g.chain.free"] }, from: "nick", textKey: "q22.react.free" },
          { when: { tone: ["t.hype"] }, from: "nick", textKey: "q22.react.hype" },
        ],
      },
    ],
    reward: { xp: 130, pay: { complexity: 0.6, client: 1 }, rep: 4, rel: { nick: 1 }, skills: { aiComm: 2, aiLiteracy: 1 }, achievements: ["chainer"] },
    onComplete: [{ from: "nick", textKey: "q22.nick.done" }],
  },
  {
    id: "q23",
    kind: "prompt",
    titleKey: "q23.title",
    stage: 4,
    requires: ["q22"],
    offer: { type: "message", from: "boris", textKey: "q23.offer" },
    goalKey: "q23.goal",
    activeGoalKey: "q23.goalActive",
    client: "boris",
    stages: [
      {
        taskKey: "q23.task",
        slots: ["goal", "data", "limits", "format"],
        cards: ["g.ad.celebrity", "g.ad.mascot", "d.ad.menu", "l.ad.label", "l.ad.realistic", "f.vertical", "f.square"],
        required: ["goal"],
        segments: q23Segments,
        pass: 0.75,
        criteria: [
          { id: "mascot", labelKey: "q23.crit.mascot", weight: 35, kind: "cards", when: { goal: ["g.ad.mascot"] } },
          { id: "menu", labelKey: "q23.crit.menu", weight: 25, kind: "cards", when: { data: ["d.ad.menu"] } },
          { id: "label", labelKey: "q23.crit.label", weight: 25, kind: "cards", when: { limits: ["l.ad.label"] } },
          { id: "vertical", labelKey: "q23.crit.vertical", weight: 15, kind: "cards", when: { format: ["f.vertical"] } },
          { id: "truth", labelKey: "q23.crit.truth", weight: 0, kind: "noHallucination", hard: true },
        ],
        reactions: [
          { when: { goal: ["g.ad.celebrity"] }, from: "boris", textKey: "q23.react.celebrity" },
          { when: { limits: ["l.ad.realistic"] }, from: "boris", textKey: "q23.react.realistic" },
        ],
      },
    ],
    reward: { xp: 120, pay: { complexity: 0.55, client: 1 }, rep: 5, rel: { boris: 1 }, skills: { aiLiteracy: 2 }, achievements: ["ethics"] },
    onComplete: [{ from: "boris", textKey: "q23.boris.done" }],
  },
  {
    id: "q24",
    kind: "prompt",
    titleKey: "q24.title",
    stage: 4,
    requires: ["q23"],
    offer: { type: "message", from: "alex", textKey: "q24.offer" },
    goalKey: "q24.goal",
    activeGoalKey: "q24.goalActive",
    client: "alex",
    stages: [
      {
        taskKey: "q24.task",
        slots: ["role", "goal", "audience", "data", "limits", "format"],
        cards: ["ro.pitch", "g.pitch.minute", "g.pitch.story", "a.investor", "a.pitch.friends", "d.hive.numbers", "l.onlyMyNumbers", "f.pitch.slides"],
        required: ["goal"],
        segments: q24Segments,
        pass: 0.75,
        criteria: [
          { id: "minute", labelKey: "q24.crit.minute", weight: 25, kind: "cards", when: { goal: ["g.pitch.minute"] } },
          { id: "investor", labelKey: "q24.crit.investor", weight: 20, kind: "cards", when: { audience: ["a.investor"] } },
          { id: "data", labelKey: "q24.crit.data", weight: 20, kind: "cards", when: { data: ["d.hive.numbers"] } },
          { id: "only", labelKey: "q24.crit.only", weight: 15, kind: "cards", when: { limits: ["l.onlyMyNumbers"] } },
          { id: "slides", labelKey: "q24.crit.slides", weight: 10, kind: "cards", when: { format: ["f.pitch.slides"] } },
          { id: "role", labelKey: "q24.crit.role", weight: 10, kind: "cards", when: { role: ["ro.pitch"] } },
          { id: "truth", labelKey: "q24.crit.truth", weight: 0, kind: "noHallucination", hard: true },
        ],
        reactions: [
          { when: { goal: ["g.pitch.story"] }, from: "alex", textKey: "q24.react.story" },
          { when: { audience: ["a.pitch.friends"] }, from: "alex", textKey: "q24.react.friends" },
          { when: { limits: ["none"], data: ["d.hive.numbers"] }, from: "alex", textKey: "q24.react.forecast" },
        ],
      },
    ],
    reward: { xp: 150, pay: { complexity: 0.65, client: 1 }, rep: 6, rel: { alex: 2 }, skills: { aiComm: 2, aiLiteracy: 2 }, achievements: ["pitcher"], milestoneKey: "milestone.stage4" },
    onComplete: [{ from: "alex", textKey: "q24.alex.done" }],
  },
];
