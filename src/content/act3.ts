// Третий этап («Свой ИИ-бизнес»): заказы под разные виды ИИ —
// видео-генератор, контент-план и Instagram, презентация, автоматизация, свой сервис.
// Только структура и ключи текстов — тексты лежат в locales/ru.act3.ts.

import type { GlossaryDef, LessonDef, PromptCard, QuestDef, ResponseSegment, SlotId } from "@/core/types";

const card = (id: string, slot: SlotId): PromptCard => ({ id, slot, textKey: `card.${id}` });

export const act3Cards: PromptCard[] = [
  // Q16 — ИИ-мультик
  card("g.cartoon.mascot", "goal"),
  card("g.cartoon.vague", "goal"),
  card("d.cartoon.place", "data"),
  card("t.style3d", "tone"),
  card("t.realistic", "tone"),
  card("f.vertical", "format"),
  card("f.square", "format"),
  card("l.noText", "limits"),
  // Q17 — Telegram и Instagram
  card("ro.smm", "role"),
  card("g.plan.tg", "goal"),
  card("g.plan.one", "goal"),
  card("a.office.back", "audience"),
  card("a.everyone", "audience"),
  card("d.lotus.rubrics", "data"),
  card("f.plan.table", "format"),
  card("f.essay", "format"),
  card("g.insta.adapt", "goal"),
  card("g.insta.copy", "goal"),
  card("f.insta.caption", "format"),
  // Q18 — презентация
  card("ro.consult", "role"),
  card("g.deck.structure", "goal"),
  card("g.deck.pretty", "goal"),
  card("a.bank", "audience"),
  card("a.clients", "audience"),
  card("d.koleso.numbers", "data"),
  card("l.onlyMyNumbers", "limits"),
  // Q19 — автоматизация
  card("g.auto.flow", "goal"),
  card("g.auto.magic", "goal"),
  card("d.volna.types", "data"),
  card("f.steps", "format"),
  card("l.human", "limits"),
  card("l.autoSend", "limits"),
  // Q20 — свой сервис
  card("ro.dev", "role"),
  card("g.svc.mvp", "goal"),
  card("g.svc.big", "goal"),
  card("a.svc.users", "audience"),
  card("d.svc.rules", "data"),
  card("l.svc.oneBooking", "limits"),
  card("f.svc.done", "format"),
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

export const act3Lessons: LessonDef[] = [
  lesson("media", "q16", 3),
  lesson("content", "q17", 3),
  lesson("deck", "q18", 3),
  lesson("automation", "q19", 3),
  lesson("spec", "q20", 3),
];

export const act3Glossary: GlossaryDef[] = [
  { id: "genMedia", termKey: "term.genMedia", defKey: "term.genMedia.def", questId: "q16" },
  { id: "aspect", termKey: "term.aspect", defKey: "term.aspect.def", questId: "q16" },
  { id: "contentPlan", termKey: "term.contentPlan", defKey: "term.contentPlan.def", questId: "q17" },
  { id: "automation", termKey: "term.automation", defKey: "term.automation.def", questId: "q19" },
  { id: "humanLoop", termKey: "term.humanLoop", defKey: "term.humanLoop.def", questId: "q19" },
  { id: "mvp", termKey: "term.mvp", defKey: "term.mvp.def", questId: "q20" },
  { id: "spec", termKey: "term.spec", defKey: "term.spec.def", questId: "q20" },
];

const q16Segments: ResponseSegment[] = [
  {
    id: "main",
    variants: [
      { when: { goal: ["g.cartoon.vague"] }, textKey: "q16.seg.vague" },
      { when: { tone: ["t.style3d"] }, textKey: "q16.seg.mascot3d" },
      { when: { tone: ["t.realistic"] }, textKey: "q16.seg.creepy" },
      { textKey: "q16.seg.mascotRandom" },
    ],
  },
  { id: "place", variants: [{ when: { data: ["d.cartoon.place"] }, textKey: "q16.seg.place" }, { textKey: "" }] },
  {
    id: "format",
    variants: [
      { when: { format: ["f.vertical"] }, textKey: "q16.seg.vertical" },
      { when: { format: ["f.square"] }, textKey: "q16.seg.square" },
      { textKey: "q16.seg.wide" },
    ],
  },
  { id: "text", variants: [{ when: { limits: ["l.noText"] }, textKey: "" }, { textKey: "q16.seg.typo" }] },
];

const q17PlanSegments: ResponseSegment[] = [
  {
    id: "main",
    variants: [
      { when: { goal: ["g.plan.one"] }, textKey: "q17.seg.onePost" },
      { when: { audience: ["a.office.back"] }, textKey: "q17.seg.planOffice" },
      { when: { audience: ["a.everyone"] }, textKey: "q17.seg.planEveryone" },
      { textKey: "q17.seg.planGeneric" },
    ],
  },
  { id: "rubrics", variants: [{ when: { goal: ["g.plan.tg"], data: ["d.lotus.rubrics"] }, textKey: "q17.seg.rubrics" }, { textKey: "" }] },
  {
    id: "format",
    variants: [
      { when: { goal: ["g.plan.one"] }, textKey: "" },
      { when: { format: ["f.plan.table"] }, textKey: "q17.seg.table" },
      { textKey: "q17.seg.wall" },
    ],
  },
];

const q17InstaSegments: ResponseSegment[] = [
  {
    id: "main",
    variants: [
      { when: { goal: ["g.insta.copy"] }, textKey: "q17.seg.copy" },
      { when: { format: ["f.insta.caption"] }, textKey: "q17.seg.carousel" },
      { textKey: "q17.seg.shorter" },
    ],
  },
  {
    id: "promise",
    variants: [
      { when: { goal: ["g.insta.copy"] }, textKey: "" },
      { when: { limits: ["l.noGuarantee"] }, textKey: "" },
      { textKey: "q17.seg.promise", hallucination: true },
    ],
  },
];

const q18Segments: ResponseSegment[] = [
  {
    id: "main",
    variants: [
      { when: { goal: ["g.deck.pretty"] }, textKey: "q18.seg.pretty" },
      { when: { audience: ["a.bank"] }, textKey: "q18.seg.bank" },
      { when: { audience: ["a.clients"] }, textKey: "q18.seg.clients" },
      { textKey: "q18.seg.generic" },
    ],
  },
  {
    id: "numbers",
    variants: [
      { when: { data: ["d.koleso.numbers"], limits: ["l.onlyMyNumbers"] }, textKey: "q18.seg.numbers" },
      { when: { data: ["d.koleso.numbers"] }, textKey: "q18.seg.growth", hallucination: true },
      { textKey: "q18.seg.invented", hallucination: true },
    ],
  },
];

const q19Segments: ResponseSegment[] = [
  {
    id: "main",
    variants: [
      { when: { goal: ["g.auto.magic"] }, textKey: "q19.seg.magic" },
      { when: { format: ["f.steps"] }, textKey: "q19.seg.steps" },
      { textKey: "q19.seg.blob" },
    ],
  },
  { id: "types", variants: [{ when: { data: ["d.volna.types"] }, textKey: "q19.seg.types" }, { textKey: "q19.seg.inventedTypes", hallucination: true }] },
  {
    id: "send",
    variants: [
      { when: { limits: ["l.human"] }, textKey: "q19.seg.human" },
      { when: { limits: ["l.autoSend"] }, textKey: "q19.seg.autoSend" },
      { textKey: "" },
    ],
  },
];

const q20Segments: ResponseSegment[] = [
  {
    id: "main",
    variants: [
      { when: { goal: ["g.svc.big"] }, textKey: "q20.seg.big" },
      { textKey: "q20.seg.mvp" },
    ],
  },
  { id: "mobile", variants: [{ when: { goal: ["g.svc.big"] }, textKey: "" }, { when: { audience: ["a.svc.users"] }, textKey: "q20.seg.mobile" }, { textKey: "q20.seg.desktop" }] },
  { id: "rules", variants: [{ when: { data: ["d.svc.rules"] }, textKey: "q20.seg.rules" }, { textKey: "q20.seg.invented", hallucination: true }] },
  { id: "doubles", variants: [{ when: { goal: ["g.svc.big"] }, textKey: "" }, { when: { limits: ["l.svc.oneBooking"] }, textKey: "q20.seg.busy" }, { textKey: "q20.seg.double" }] },
  { id: "done", variants: [{ when: { format: ["f.svc.done"] }, textKey: "q20.seg.done" }, { textKey: "" }] },
];

export const act3Quests: QuestDef[] = [
  {
    id: "q16",
    kind: "prompt",
    titleKey: "q16.title",
    stage: 3,
    requires: ["q15b"],
    offer: { type: "message", from: "anna", textKey: "q16.offer" },
    goalKey: "q16.goal",
    activeGoalKey: "q16.goalActive",
    client: "anna",
    stages: [
      {
        taskKey: "q16.task",
        slots: ["goal", "data", "tone", "format", "limits"],
        cards: ["g.cartoon.mascot", "g.cartoon.vague", "d.cartoon.place", "t.style3d", "t.realistic", "f.vertical", "f.square", "l.noText"],
        required: ["goal"],
        segments: q16Segments,
        pass: 0.75,
        criteria: [
          { id: "mascot", labelKey: "q16.crit.mascot", weight: 30, kind: "cards", when: { goal: ["g.cartoon.mascot"] } },
          { id: "style", labelKey: "q16.crit.style", weight: 25, kind: "cards", when: { tone: ["t.style3d"] } },
          { id: "format", labelKey: "q16.crit.format", weight: 30, kind: "cards", when: { format: ["f.vertical"] } },
          { id: "clean", labelKey: "q16.crit.clean", weight: 15, kind: "cards", when: { limits: ["l.noText"] } },
        ],
        reactions: [
          { when: { goal: ["g.cartoon.vague"] }, from: "anna", textKey: "q16.react.vague" },
          { when: { tone: ["t.realistic"] }, from: "anna", textKey: "q16.react.creepy" },
          { when: { format: ["f.square", "none"] }, from: "anna", textKey: "q16.react.format" },
        ],
      },
    ],
    reward: { xp: 60, pay: { complexity: 0.7, client: 1 }, rep: 3, rel: { anna: 1 }, skills: { aiComm: 2 }, achievements: ["animator"] },
    onComplete: [{ from: "anna", textKey: "q16.anna.done" }],
  },
  {
    id: "q17",
    kind: "prompt",
    titleKey: "q17.title",
    stage: 3,
    requires: ["q16"],
    offer: { type: "message", from: "olga", textKey: "q17.offer" },
    goalKey: "q17.goal",
    activeGoalKey: "q17.goalActive",
    client: "olga",
    stages: [
      {
        taskKey: "q17.task1",
        slots: ["role", "goal", "audience", "data", "format"],
        cards: ["ro.smm", "g.plan.tg", "g.plan.one", "a.office.back", "a.everyone", "d.lotus.rubrics", "f.plan.table", "f.essay"],
        required: ["goal"],
        segments: q17PlanSegments,
        pass: 0.75,
        criteria: [
          { id: "plan", labelKey: "q17.crit.plan", weight: 30, kind: "cards", when: { goal: ["g.plan.tg"] } },
          { id: "audience", labelKey: "q17.crit.audience", weight: 25, kind: "cards", when: { audience: ["a.office.back"] } },
          { id: "rubrics", labelKey: "q17.crit.rubrics", weight: 20, kind: "cards", when: { data: ["d.lotus.rubrics"] } },
          { id: "table", labelKey: "q17.crit.table", weight: 25, kind: "cards", when: { format: ["f.plan.table"] } },
        ],
        afterPass: { from: "olga", textKey: "q17.afterPlan" },
        reactions: [
          { when: { goal: ["g.plan.one"] }, from: "olga", textKey: "q17.react.one" },
          { when: { audience: ["a.everyone", "none"] }, from: "olga", textKey: "q17.react.everyone" },
        ],
      },
      {
        taskKey: "q17.task2",
        slots: ["goal", "format", "tone", "limits"],
        cards: ["g.insta.adapt", "g.insta.copy", "f.insta.caption", "f.essay", "t.warm", "t.hype", "l.noGuarantee"],
        required: ["goal"],
        segments: q17InstaSegments,
        pass: 0.75,
        criteria: [
          { id: "adapt", labelKey: "q17.crit.adapt", weight: 30, kind: "cards", when: { goal: ["g.insta.adapt"] } },
          { id: "caption", labelKey: "q17.crit.caption", weight: 35, kind: "cards", when: { format: ["f.insta.caption"] } },
          { id: "tone", labelKey: "q17.crit.tone", weight: 15, kind: "cards", when: { tone: ["t.warm"] } },
          { id: "promise", labelKey: "q17.crit.promise", weight: 20, kind: "cards", when: { limits: ["l.noGuarantee"] } },
          { id: "truth", labelKey: "q17.crit.truth", weight: 0, kind: "noHallucination", hard: true },
        ],
        reactions: [{ when: { goal: ["g.insta.copy"] }, from: "olga", textKey: "q17.react.copy" }],
      },
    ],
    reward: { xp: 70, pay: { complexity: 0.8, client: 1 }, rep: 3, rel: { olga: 1 }, skills: { aiComm: 2 }, achievements: ["smm"] },
    onComplete: [{ from: "olga", textKey: "q17.olga.done" }],
  },
  {
    id: "q18",
    kind: "prompt",
    titleKey: "q18.title",
    stage: 3,
    requires: ["q17"],
    offer: { type: "message", from: "sergey", textKey: "q18.offer" },
    goalKey: "q18.goal",
    activeGoalKey: "q18.goalActive",
    client: "sergey",
    stages: [
      {
        taskKey: "q18.task",
        slots: ["role", "goal", "audience", "data", "limits"],
        cards: ["ro.consult", "g.deck.structure", "g.deck.pretty", "a.bank", "a.clients", "d.koleso.numbers", "l.onlyMyNumbers"],
        required: ["goal"],
        segments: q18Segments,
        pass: 0.75,
        criteria: [
          { id: "structure", labelKey: "q18.crit.structure", weight: 30, kind: "cards", when: { goal: ["g.deck.structure"] } },
          { id: "audience", labelKey: "q18.crit.audience", weight: 30, kind: "cards", when: { audience: ["a.bank"] } },
          { id: "data", labelKey: "q18.crit.data", weight: 20, kind: "cards", when: { data: ["d.koleso.numbers"] } },
          { id: "only", labelKey: "q18.crit.only", weight: 20, kind: "cards", when: { limits: ["l.onlyMyNumbers"] } },
          { id: "truth", labelKey: "q18.crit.truth", weight: 0, kind: "noHallucination", hard: true },
        ],
        reactions: [
          { when: { goal: ["g.deck.pretty"] }, from: "sergey", textKey: "q18.react.pretty" },
          { when: { audience: ["a.clients"] }, from: "sergey", textKey: "q18.react.clients" },
          { when: { data: ["none"] }, from: "sergey", textKey: "q18.react.invented" },
        ],
      },
    ],
    reward: { xp: 70, pay: { complexity: 0.9, client: 1 }, rep: 3, rel: { sergey: 1 }, skills: { aiComm: 1, aiLiteracy: 1 }, achievements: ["presenter"] },
    onComplete: [{ from: "sergey", textKey: "q18.sergey.done" }],
  },
  {
    id: "q19",
    kind: "prompt",
    titleKey: "q19.title",
    stage: 3,
    requires: ["q18"],
    offer: { type: "message", from: "nick", textKey: "q19.offer" },
    goalKey: "q19.goal",
    activeGoalKey: "q19.goalActive",
    client: "nick",
    stages: [
      {
        taskKey: "q19.task",
        slots: ["goal", "data", "format", "limits"],
        cards: ["g.auto.flow", "g.auto.magic", "d.volna.types", "f.steps", "f.essay", "l.human", "l.autoSend"],
        required: ["goal"],
        segments: q19Segments,
        pass: 0.75,
        criteria: [
          { id: "flow", labelKey: "q19.crit.flow", weight: 30, kind: "cards", when: { goal: ["g.auto.flow"] } },
          { id: "steps", labelKey: "q19.crit.steps", weight: 25, kind: "cards", when: { format: ["f.steps"] } },
          { id: "types", labelKey: "q19.crit.types", weight: 20, kind: "cards", when: { data: ["d.volna.types"] } },
          { id: "human", labelKey: "q19.crit.human", weight: 25, kind: "cards", when: { limits: ["l.human"] } },
          { id: "truth", labelKey: "q19.crit.truth", weight: 0, kind: "noHallucination", hard: true },
        ],
        reactions: [
          { when: { goal: ["g.auto.magic"] }, from: "nick", textKey: "q19.react.magic" },
          { when: { limits: ["l.autoSend"] }, from: "nick", textKey: "q19.react.autoSend" },
        ],
      },
    ],
    reward: { xp: 80, pay: { complexity: 1, client: 1 }, rep: 4, rel: { nick: 1 }, skills: { aiLiteracy: 2 }, achievements: ["automator"] },
    onComplete: [{ from: "nick", textKey: "q19.nick.done" }],
  },
  {
    id: "q20",
    kind: "prompt",
    titleKey: "q20.title",
    stage: 3,
    requires: ["q19"],
    offer: { type: "message", from: "alex", textKey: "q20.offer" },
    goalKey: "q20.goal",
    activeGoalKey: "q20.goalActive",
    client: "alex",
    stages: [
      {
        taskKey: "q20.task",
        slots: ["role", "goal", "audience", "data", "limits", "format"],
        cards: ["ro.dev", "g.svc.mvp", "g.svc.big", "a.svc.users", "d.svc.rules", "l.svc.oneBooking", "f.svc.done"],
        required: ["goal"],
        segments: q20Segments,
        pass: 0.75,
        criteria: [
          { id: "mvp", labelKey: "q20.crit.mvp", weight: 25, kind: "cards", when: { goal: ["g.svc.mvp"] } },
          { id: "rules", labelKey: "q20.crit.rules", weight: 20, kind: "cards", when: { data: ["d.svc.rules"] } },
          { id: "doubles", labelKey: "q20.crit.doubles", weight: 20, kind: "cards", when: { limits: ["l.svc.oneBooking"] } },
          { id: "mobile", labelKey: "q20.crit.mobile", weight: 15, kind: "cards", when: { audience: ["a.svc.users"] } },
          { id: "done", labelKey: "q20.crit.done", weight: 20, kind: "cards", when: { format: ["f.svc.done"] } },
          { id: "truth", labelKey: "q20.crit.truth", weight: 0, kind: "noHallucination", hard: true },
        ],
        reactions: [
          { when: { goal: ["g.svc.big"] }, from: "alex", textKey: "q20.react.big" },
          { when: { limits: ["none"], goal: ["g.svc.mvp"] }, from: "alex", textKey: "q20.react.double" },
        ],
      },
    ],
    reward: { xp: 100, pay: { complexity: 1.2, client: 1 }, rep: 5, rel: { alex: 2 }, skills: { aiComm: 2, aiLiteracy: 2 }, achievements: ["founder"], milestoneKey: "milestone.stage3" },
    onComplete: [{ from: "alex", textKey: "q20.alex.done" }],
  },
];
