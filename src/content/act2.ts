// Второй этап («Своё дело»): «ТАКТ Плюс» или ручные критерии, справочник для «Улья»,
// ноутбук мечты и подработки на доске заказов, которые можно брать снова и снова.

import type { GlossaryDef, ItemDef, LessonDef, PromptCard, QuestDef, ResponseSegment, SlotId } from "@/core/types";

const card = (id: string, slot: SlotId): PromptCard => ({ id, slot, textKey: `card.${id}` });

export const act2Cards: PromptCard[] = [
  // Q14b — бот по правилам
  card("ro.admin", "role"),
  card("g.faq", "goal"),
  card("d.rules", "data"),
  card("l.onlyRules", "limits"),
  card("f.dontKnow", "format"),
  // Подработка: SMS пиццерии
  card("g.pizza.day", "goal"),
  card("g.pizza.menu", "goal"),
  card("d.pizza.facts", "data"),
  // Подработка: отзыв барбершопа
  card("d.barber.fix", "data"),
];

export const act2Items: ItemDef[] = [
  { id: "neiraPlus", nameKey: "item.neiraPlus.name", descKey: "item.neiraPlus.desc", price: 300, flags: ["selfCheck"], requiresQuest: "q12p" },
  { id: "laptopLight", nameKey: "item.laptopLight.name", descKey: "item.laptopLight.desc", price: 1200, flags: ["lightLaptop"], requiresQuest: "q15b" },
  { id: "laptopGamer", nameKey: "item.laptopGamer.name", descKey: "item.laptopGamer.desc", price: 1800, flags: ["gpuLaptop"], requiresQuest: "q15b" },
];

export const act2Lessons: LessonDef[] = [
  {
    id: "criteria",
    questId: "q12m",
    titleKey: "lesson.criteria.title",
    bodyKeys: ["lesson.criteria.1", "lesson.criteria.2"],
    badKey: "lesson.criteria.bad",
    goodKey: "lesson.criteria.good",
    takeawayKey: "lesson.criteria.takeaway",
  },
  {
    id: "rag",
    questId: "q14b",
    titleKey: "lesson.rag.title",
    bodyKeys: ["lesson.rag.1", "lesson.rag.2", "lesson.rag.3"],
    badKey: "lesson.rag.bad",
    goodKey: "lesson.rag.good",
    takeawayKey: "lesson.rag.takeaway",
  },
];

export const act2Glossary: GlossaryDef[] = [
  { id: "criteria", termKey: "term.criteria", defKey: "term.criteria.def", questId: "q12" },
  { id: "rag", termKey: "term.rag", defKey: "term.rag.def", questId: "q14b" },
  { id: "cloudAi", termKey: "term.cloudAi", defKey: "term.cloudAi.def", questId: "q15" },
  { id: "localModel", termKey: "term.localModel", defKey: "term.localModel.def", questId: "q15" },
  { id: "gpu", termKey: "term.gpu", defKey: "term.gpu.def", questId: "q15" },
];

const q14bSegments: ResponseSegment[] = [
  { id: "hello", variants: [{ when: { role: ["ro.admin"] }, textKey: "q14b.seg.hello" }, { textKey: "" }] },
  {
    id: "main",
    variants: [
      { when: { data: ["none"] }, textKey: "q14b.seg.invented", hallucination: true },
      { when: { limits: ["l.onlyRules"], format: ["f.dontKnow"] }, textKey: "q14b.seg.good" },
      { when: { format: ["f.dontKnow"] }, textKey: "q14b.seg.good" },
      { when: { limits: ["l.onlyRules"] }, textKey: "q14b.seg.guess", hallucination: true },
      { textKey: "q14b.seg.parking", hallucination: true },
    ],
  },
];

const pizzaSegments: ResponseSegment[] = [
  {
    id: "main",
    variants: [
      { when: { format: ["f.letter"] }, textKey: "gig.sms.seg.letter" },
      { when: { goal: ["g.pizza.menu"] }, textKey: "gig.sms.seg.menu" },
      { when: { data: ["d.pizza.facts"], tone: ["t.hype"] }, textKey: "gig.sms.seg.hype" },
      { when: { data: ["d.pizza.facts"], tone: ["t.playful"] }, textKey: "gig.sms.seg.playful" },
      { when: { data: ["d.pizza.facts"] }, textKey: "gig.sms.seg.facts" },
      { textKey: "gig.sms.seg.invented", hallucination: true },
    ],
  },
];

const barberSegments: ResponseSegment[] = [
  { id: "greet", variants: [{ when: { tone: ["t.angry"] }, textKey: "gig.rev.seg.greetAngry" }, { textKey: "gig.rev.seg.greet" }] },
  {
    id: "body",
    variants: [
      { when: { goal: ["g.rev.defend"] }, textKey: "gig.rev.seg.defend" },
      { when: { data: ["d.barber.fix"] }, textKey: "gig.rev.seg.sorry" },
      { textKey: "gig.rev.seg.vague" },
    ],
  },
  {
    id: "offer",
    variants: [
      { when: { goal: ["g.rev.defend"] }, textKey: "" },
      { when: { data: ["d.barber.fix"] }, textKey: "gig.rev.seg.fix" },
      { when: { limits: ["l.noPromise"] }, textKey: "gig.rev.seg.welcome" },
      { textKey: "gig.rev.seg.year", hallucination: true },
    ],
  },
  { id: "sign", variants: [{ textKey: "gig.rev.seg.sign" }] },
];

const GIG_PAY = { lightLaptop: 1.15 };

export const act2Quests: QuestDef[] = [
  {
    id: "q12",
    kind: "dialog",
    titleKey: "q12.title",
    stage: 2,
    requires: ["q13"],
    offer: { type: "auto" },
    goalKey: "q12.goal",
    npc: "alex",
    promptKey: "q12.alex",
    choices: [
      { id: "plus", textKey: "q12.c.plus", replyKey: "q12.r.plus", effects: { flags: ["wantPlus"] } },
      { id: "manual", textKey: "q12.c.manual", replyKey: "q12.r.manual", effects: { flags: ["wantManual"], rel: { alex: 1 } } },
    ],
    reward: { xp: 10 },
  },
  {
    id: "q12p",
    kind: "purchase",
    titleKey: "q12p.title",
    stage: 2,
    requires: ["q12"],
    requiresFlag: "wantPlus",
    offer: { type: "auto" },
    goalKey: "q12p.goal",
    items: ["neiraPlus"],
    reward: { xp: 20, achievements: ["neiraPlus"] },
    onComplete: [{ from: "alex", textKey: "q12p.alex" }],
  },
  {
    id: "q12m",
    kind: "classify",
    game: "spot",
    titleKey: "q12m.title",
    stage: 2,
    requires: ["q12"],
    requiresFlag: "wantManual",
    offer: { type: "auto" },
    goalKey: "q12m.goal",
    client: "alex",
    introKey: "q12m.intro",
    sourceTitleKey: "q12m.sourceTitle",
    sourceKeys: ["q12m.src.1", "q12m.src.2"],
    options: [
      { id: "check", labelKey: "q12m.opt.check" },
      { id: "vague", labelKey: "q12m.opt.vague" },
    ],
    items: [
      { id: "len", textKey: "q12m.i.len", answer: "check", weight: 1, explainKey: "q12m.e.len" },
      { id: "cool", textKey: "q12m.i.cool", answer: "vague", weight: 1, explainKey: "q12m.e.cool" },
      { id: "phone", textKey: "q12m.i.phone", answer: "check", weight: 1, explainKey: "q12m.e.phone" },
      { id: "all", textKey: "q12m.i.all", answer: "vague", weight: 1, explainKey: "q12m.e.all" },
      { id: "prices", textKey: "q12m.i.prices", answer: "check", weight: 1, explainKey: "q12m.e.prices" },
      { id: "fresh", textKey: "q12m.i.fresh", answer: "vague", weight: 1, explainKey: "q12m.e.fresh" },
    ],
    pass: 0.8,
    reward: { xp: 40, skills: { aiComm: 1 }, rel: { alex: 1 }, achievements: ["criteria"] },
    onComplete: [{ from: "alex", textKey: "q12m.alex" }],
  },
  {
    id: "q14",
    kind: "classify",
    game: "factcheck",
    titleKey: "q14.title",
    stage: 2,
    requires: ["q12"],
    offer: { type: "message", from: "alex", textKey: "q14.offer" },
    goalKey: "q14.goal",
    activeGoalKey: "q14.goalActive",
    client: "alex",
    introKey: "q14.intro",
    sourceTitleKey: "q14.sourceTitle",
    sourceKeys: ["q14.src.1", "q14.src.2", "q14.src.3", "q14.src.4", "q14.src.5"],
    options: [
      { id: "source", labelKey: "q14.opt.source" },
      { id: "contra", labelKey: "q14.opt.contra" },
      { id: "missing", labelKey: "q14.opt.missing" },
    ],
    items: [
      { id: "hours", textKey: "q14.i.hours", answer: "source", weight: 1, explainKey: "q14.e.hours" },
      { id: "weekend", textKey: "q14.i.weekend", answer: "contra", weight: 2, explainKey: "q14.e.weekend" },
      { id: "price", textKey: "q14.i.price", answer: "contra", weight: 2, explainKey: "q14.e.price" },
      { id: "room", textKey: "q14.i.room", answer: "source", weight: 1, explainKey: "q14.e.room" },
      { id: "food", textKey: "q14.i.food", answer: "contra", weight: 2, explainKey: "q14.e.food" },
      { id: "parking", textKey: "q14.i.parking", answer: "missing", weight: 2, explainKey: "q14.e.parking" },
      { id: "coffee", textKey: "q14.i.coffee", answer: "source", weight: 1, explainKey: "q14.e.coffee" },
      { id: "guests", textKey: "q14.i.guests", answer: "source", weight: 1, explainKey: "q14.e.guests" },
    ],
    pass: 0.75,
    onMissed: [
      { itemId: "price", from: "alex", textKey: "q14.alex.price" },
      { itemId: "parking", from: "alex", textKey: "q14.alex.parking" },
    ],
    reward: { xp: 60, pay: { complexity: 0.9, client: 1 }, skills: { aiLiteracy: 1 } },
    onComplete: [{ from: "alex", textKey: "q14.alex.next" }],
  },
  {
    id: "q14b",
    kind: "prompt",
    titleKey: "q14b.title",
    stage: 2,
    requires: ["q14"],
    offer: { type: "auto" },
    goalKey: "q14b.goal",
    client: "alex",
    stages: [
      {
        taskKey: "q14b.task",
        slots: ["role", "goal", "data", "limits", "format"],
        cards: ["ro.admin", "ro.prof", "g.faq", "d.rules", "l.onlyRules", "l.detailed", "f.dontKnow", "f.list"],
        required: ["goal"],
        segments: q14bSegments,
        pass: 0.7,
        criteria: [
          { id: "rules", labelKey: "q14b.crit.rules", weight: 30, kind: "cards", when: { data: ["d.rules"] } },
          { id: "only", labelKey: "q14b.crit.only", weight: 35, kind: "cards", when: { limits: ["l.onlyRules"] } },
          { id: "dk", labelKey: "q14b.crit.dk", weight: 35, kind: "cards", when: { format: ["f.dontKnow"] } },
          { id: "truth", labelKey: "q14b.crit.truth", weight: 0, kind: "noHallucination", hard: true },
        ],
        reactions: [
          { when: { data: ["none"] }, from: "alex", textKey: "q14b.react.none" },
          { when: { data: ["d.rules"], format: ["none", "f.list"] }, from: "alex", textKey: "q14b.react.guess" },
        ],
      },
    ],
    reward: { xp: 80, pay: { complexity: 1.2, client: 1 }, skills: { aiLiteracy: 2 }, rep: 3, achievements: ["docBot"] },
    onComplete: [{ from: "alex", textKey: "q14b.alex.done" }],
  },
  {
    id: "q15",
    kind: "dialog",
    titleKey: "q15.title",
    stage: 2,
    requires: ["q14b"],
    offer: { type: "auto" },
    goalKey: "q15.goal",
    npc: "alex",
    promptKey: "q15.alex",
    choices: [
      { id: "gamer", textKey: "q15.c.gamer", replyKey: "q15.r.gamer" },
      { id: "light", textKey: "q15.c.light", replyKey: "q15.r.light" },
      { id: "ask", textKey: "q15.c.ask", replyKey: "q15.r.ask" },
    ],
    reward: { xp: 10 },
  },
  {
    id: "q15b",
    kind: "purchase",
    titleKey: "q15b.title",
    stage: 2,
    requires: ["q15"],
    offer: { type: "auto" },
    goalKey: "q15b.goal",
    items: ["laptopLight", "laptopGamer"],
    reward: { xp: 50, achievements: ["newLaptop"], milestoneKey: "milestone.stage2" },
    onComplete: [
      { from: "alex", textKey: "q15b.alex.light", flag: "lightLaptop" },
      { from: "alex", textKey: "q15b.alex.gamer", flag: "gpuLaptop" },
    ],
  },

  // ---------- Подработки: снова появляются на доске после сдачи ----------
  {
    id: "gigSms",
    kind: "prompt",
    titleKey: "gig.sms.title",
    stage: 2,
    requires: ["q13"],
    repeatable: true,
    offer: { type: "board", from: "boris", textKey: "gig.sms.offer" },
    goalKey: "gig.sms.goal",
    client: "boris",
    stages: [
      {
        taskKey: "gig.sms.task",
        slots: ["goal", "data", "format", "tone", "limits"],
        cards: ["g.pizza.day", "g.pizza.menu", "d.pizza.facts", "f.sms", "f.letter", "t.playful", "t.formal", "t.hype", "l.noPromise"],
        required: ["goal"],
        segments: pizzaSegments,
        pass: 0.7,
        criteria: [
          { id: "length", labelKey: "gig.sms.crit.length", weight: 25, kind: "maxLength", max: 160, hard: true },
          { id: "facts", labelKey: "gig.sms.crit.facts", weight: 35, kind: "cards", when: { data: ["d.pizza.facts"] } },
          { id: "goal", labelKey: "gig.sms.crit.goal", weight: 20, kind: "cards", when: { goal: ["g.pizza.day"] } },
          { id: "tone", labelKey: "gig.sms.crit.tone", weight: 20, kind: "cards", when: { tone: ["t.playful", "t.formal", "none"] } },
          { id: "truth", labelKey: "gig.sms.crit.truth", weight: 0, kind: "noHallucination", hard: true },
        ],
        reactions: [{ when: { tone: ["t.hype"] }, from: "boris", textKey: "gig.sms.react.hype" }],
      },
    ],
    reward: { xp: 15, pay: { complexity: 0.5, client: 1 }, payByFlag: GIG_PAY },
    onComplete: [{ from: "boris", textKey: "gig.sms.done" }],
  },
  {
    id: "gigReview",
    kind: "prompt",
    titleKey: "gig.rev.title",
    stage: 2,
    requires: ["q13"],
    repeatable: true,
    offer: { type: "board", from: "vera", textKey: "gig.rev.offer" },
    goalKey: "gig.rev.goal",
    client: "vera",
    stages: [
      {
        taskKey: "gig.rev.task",
        slots: ["goal", "tone", "data", "limits"],
        cards: ["g.rev.reply", "g.rev.defend", "t.warm", "t.business", "t.angry", "d.barber.fix", "l.noPromise"],
        required: ["goal"],
        segments: barberSegments,
        pass: 0.7,
        criteria: [
          { id: "calm", labelKey: "q6.crit.calm", weight: 30, kind: "cards", when: { goal: ["g.rev.reply"], tone: ["t.business", "t.warm", "none"] } },
          { id: "step", labelKey: "q6.crit.step", weight: 35, kind: "cards", when: { data: ["d.barber.fix"] } },
          { id: "tone", labelKey: "q6.crit.tone", weight: 35, kind: "cards", when: { tone: ["t.warm", "t.business"] } },
          { id: "truth", labelKey: "gig.rev.crit.truth", weight: 0, kind: "noHallucination", hard: true },
        ],
      },
    ],
    reward: { xp: 15, pay: { complexity: 0.45, client: 1 }, payByFlag: GIG_PAY },
    onComplete: [{ from: "vera", textKey: "gig.rev.done" }],
  },
  {
    id: "gigSpot",
    kind: "classify",
    game: "spot",
    titleKey: "gig.spot.title",
    stage: 2,
    requires: ["q13"],
    repeatable: true,
    offer: { type: "board", from: "editor", textKey: "gig.spot.offer" },
    goalKey: "gig.spot.goal",
    client: "editor",
    introKey: "gig.spot.intro",
    sourceTitleKey: "gig.spot.sourceTitle",
    sourceKeys: ["gig.spot.src.1", "gig.spot.src.2", "gig.spot.src.3"],
    options: [
      { id: "true", labelKey: "gig.spot.opt.true" },
      { id: "fake", labelKey: "gig.spot.opt.fake" },
    ],
    items: [
      { id: "day", textKey: "gig.spot.i.day", answer: "true", weight: 1, explainKey: "gig.spot.e.day" },
      { id: "len", textKey: "gig.spot.i.len", answer: "fake", weight: 2, explainKey: "gig.spot.e.len" },
      { id: "cars", textKey: "gig.spot.i.cars", answer: "true", weight: 1, explainKey: "gig.spot.e.cars" },
      { id: "years", textKey: "gig.spot.i.years", answer: "fake", weight: 2, explainKey: "gig.spot.e.years" },
      { id: "mayor", textKey: "gig.spot.i.mayor", answer: "fake", weight: 2, explainKey: "gig.spot.e.mayor" },
      { id: "cost", textKey: "gig.spot.i.cost", answer: "true", weight: 1, explainKey: "gig.spot.e.cost" },
    ],
    pass: 0.75,
    timer: 45,
    reward: { xp: 15, pay: { complexity: 0.4, client: 1 }, payByFlag: GIG_PAY },
    onComplete: [{ from: "editor", textKey: "gig.spot.done" }],
  },
];
