// Контент первого акта: задания Q1–Q5, карточки Prompt Lab, предметы, навыки.
// Только структура и ключи текстов — сами тексты лежат в locales/.

import { school } from "./school";
import { act2Cards, act2Glossary, act2Items, act2Lessons, act2Quests } from "./act2";
import { shopItems } from "./shop";
import { buildFixQuests, huntQuests } from "./modes";
import { act3Cards, act3Glossary, act3Lessons, act3Quests } from "./act3";
import { act4Cards, act4Glossary, act4Lessons, act4Quests } from "./act4";
import type { Content, GlossaryDef, LessonDef, PromptCard, ResponseSegment, SlotId } from "@/core/types";

const card = (id: string, slot: SlotId): PromptCard => ({ id, slot, textKey: `card.${id}` });

const cards: PromptCard[] = [
  // Q2 — письмо арендодателю
  card("g.tap.about", "goal"),
  card("g.tap.fix", "goal"),
  card("g.tap.complain", "goal"),
  card("r.landlord", "recipient"),
  card("r.friend", "recipient"),
  card("r.neighbors", "recipient"),
  card("t.business", "tone"),
  card("t.warm", "tone"),
  card("t.angry", "tone"),
  // Q3 — объявление для кафе
  card("g.cafe.menu", "goal"),
  card("g.cafe.history", "goal"),
  card("g.cafe.sale", "goal"),
  card("a.students", "audience"),
  card("a.all", "audience"),
  card("a.office", "audience"),
  card("t.playful", "tone"),
  card("t.formal", "tone"),
  card("t.hype", "tone"),
  card("d.menu3", "data"),
  card("d.menuFull", "data"),
  card("l.300", "limits"),
  card("l.50", "limits"),
  card("l.emoji", "limits"),
  // Q5 — SMS автосервиса
  card("g.sms.tires", "goal"),
  card("g.sms.all", "goal"),
  card("d.sms.facts", "data"),
  card("f.sms", "format"),
  card("f.letter", "format"),
  card("f.list", "format"),
  card("e.sms", "examples"),
  // Q6 — ответ на отзыв
  card("g.rev.reply", "goal"),
  card("g.rev.defend", "goal"),
  card("d.rev.coffee", "data"),
  card("d.rev.rush", "data"),
  card("l.noPromise", "limits"),
  // Q8 — расписание йоги
  card("g.yoga.schedule", "goal"),
  card("g.yoga.summary", "goal"),
  card("d.yoga.chat", "data"),
  card("f.table", "format"),
  card("f.text", "format"),
  card("l.moves", "limits"),
  // Q9 — роль
  card("ro.prof", "role"),
  card("ro.grandson", "role"),
  card("ro.engineer", "role"),
  card("g.cloud", "goal"),
  card("l.noTerms", "limits"),
  card("l.detailed", "limits"),
  // Q11v — заказ «Волны»
  card("g.fit.launch", "goal"),
  card("g.fit.brand", "goal"),
  card("a.fit.young", "audience"),
  card("d.fit.facts", "data"),
  card("l.noGuarantee", "limits"),
  // Q13 — осенняя кампания
  card("f.post", "format"),
  card("f.sign", "format"),
  card("d.camp.oct", "data"),
  card("d.camp.old", "data"),
];

// ---------- Q2: письмо про кран ----------

const q2Segments: ResponseSegment[] = [
  {
    id: "greet",
    variants: [
      { when: { recipient: ["r.landlord"], tone: ["t.warm"] }, textKey: "q2.seg.greetLandlordWarm" },
      { when: { recipient: ["r.landlord"] }, textKey: "q2.seg.greetLandlord" },
      { when: { recipient: ["r.friend"] }, textKey: "q2.seg.greetFriend" },
      { when: { recipient: ["r.neighbors"] }, textKey: "q2.seg.greetNeighbors" },
      { textKey: "" },
    ],
  },
  {
    id: "body",
    variants: [
      { when: { goal: ["g.tap.about"], recipient: ["none"] }, textKey: "q2.seg.bodyEncyclopedia" },
      { when: { goal: ["g.tap.about"] }, textKey: "q2.seg.bodyAbout" },
      { when: { goal: ["g.tap.fix"], tone: ["t.warm"] }, textKey: "q2.seg.bodyFixWarm" },
      { when: { goal: ["g.tap.fix"], tone: ["t.angry"] }, textKey: "q2.seg.bodyFixAngry" },
      { when: { goal: ["g.tap.fix"], tone: ["t.business"] }, textKey: "q2.seg.bodyFixBusiness" },
      { when: { goal: ["g.tap.fix"] }, textKey: "q2.seg.bodyFixPlain" },
      { when: { goal: ["g.tap.complain"] }, textKey: "q2.seg.bodyComplain" },
    ],
  },
  {
    id: "close",
    variants: [
      { when: { recipient: ["r.landlord"], tone: ["t.warm"] }, textKey: "q2.seg.closeWarm" },
      { when: { recipient: ["r.landlord"], tone: ["t.angry"] }, textKey: "q2.seg.closeAngry" },
      { when: { recipient: ["r.landlord"] }, textKey: "q2.seg.closeBusiness" },
      { textKey: "" },
    ],
  },
];

// ---------- Q3: объявление для «Чашки» ----------

const q3Segments: ResponseSegment[] = [
  {
    id: "headline",
    variants: [
      { when: { limits: ["l.50"] }, textKey: "q3.seg.headShort" },
      { when: { goal: ["g.cafe.history"] }, textKey: "q3.seg.headHistory" },
      { when: { goal: ["g.cafe.sale"] }, textKey: "q3.seg.headSale" },
      { when: { goal: ["g.cafe.menu"], tone: ["t.playful"] }, textKey: "q3.seg.headPlayful" },
      { when: { goal: ["g.cafe.menu"], tone: ["t.formal"] }, textKey: "q3.seg.headFormal" },
      { when: { goal: ["g.cafe.menu"], tone: ["t.hype"] }, textKey: "q3.seg.headHype" },
      { textKey: "q3.seg.headPlain" },
    ],
  },
  {
    id: "body",
    variants: [
      { when: { limits: ["l.50"] }, textKey: "" },
      { when: { data: ["d.menu3"] }, textKey: "q3.seg.bodyMenu3" },
      { when: { data: ["d.menuFull"] }, textKey: "q3.seg.bodyMenuFull" },
      { when: { data: ["none"], limits: ["l.300"] }, textKey: "q3.seg.bodyHonest" },
      { textKey: "q3.seg.bodyInvented", hallucination: true },
    ],
  },
  {
    id: "discount",
    variants: [
      { when: { limits: ["l.50"] }, textKey: "" },
      { when: { data: ["d.menu3", "d.menuFull"] }, textKey: "q3.seg.discount" },
      { textKey: "" },
    ],
  },
  {
    id: "audience",
    variants: [
      { when: { limits: ["l.50"] }, textKey: "" },
      { when: { audience: ["a.students"], tone: ["t.playful", "none"] }, textKey: "q3.seg.audStudents" },
      { when: { audience: ["a.students"] }, textKey: "q3.seg.audStudentsStiff" },
      { when: { audience: ["a.office"] }, textKey: "q3.seg.audOffice" },
      { textKey: "" },
    ],
  },
  {
    id: "cta",
    variants: [
      { when: { goal: ["g.cafe.menu", "g.cafe.sale"] }, textKey: "q3.seg.cta" },
      { textKey: "" },
    ],
  },
  {
    id: "emoji",
    variants: [{ when: { limits: ["l.emoji"] }, textKey: "q3.seg.emoji" }, { textKey: "" }],
  },
];

// ---------- Q5: SMS для «Колеса» ----------

const q5Segments: ResponseSegment[] = [
  {
    id: "main",
    variants: [
      { when: { goal: ["g.sms.all"] }, textKey: "q5.seg.all" },
      { when: { format: ["f.letter"] }, textKey: "q5.seg.letter" },
      { when: { format: ["f.list"], data: ["d.sms.facts"] }, textKey: "q5.seg.listFacts" },
      { when: { format: ["f.list"] }, textKey: "q5.seg.list" },
      { when: { examples: ["e.sms"], data: ["d.sms.facts"] }, textKey: "q5.seg.smsTight" },
      { when: { data: ["d.sms.facts"] }, textKey: "q5.seg.smsFacts" },
      { textKey: "q5.seg.smsNoFacts" },
    ],
  },
  {
    id: "hype",
    variants: [{ when: { tone: ["t.hype"] }, textKey: "q5.seg.hypeFree", hallucination: true }, { textKey: "" }],
  },
];

// ---------- Q6: ответ на отзыв в одну звезду ----------

const q6Segments: ResponseSegment[] = [
  {
    id: "greet",
    variants: [
      { when: { tone: ["t.angry"] }, textKey: "q6.seg.greetAngry" },
      { textKey: "q6.seg.greet" },
    ],
  },
  {
    id: "body",
    variants: [
      { when: { goal: ["g.rev.defend"] }, textKey: "q6.seg.defend" },
      { when: { data: ["d.rev.coffee"] }, textKey: "q6.seg.sorry" },
      { when: { data: ["d.rev.rush"] }, textKey: "q6.seg.rush" },
      { textKey: "q6.seg.vague" },
    ],
  },
  {
    id: "offer",
    variants: [
      { when: { goal: ["g.rev.defend"] }, textKey: "" },
      { when: { data: ["d.rev.coffee"] }, textKey: "q6.seg.coffee" },
      { when: { data: ["d.rev.rush"] }, textKey: "q6.seg.barista" },
      { when: { limits: ["l.noPromise"] }, textKey: "q6.seg.welcome" },
      { textKey: "q6.seg.lunch", hallucination: true },
    ],
  },
  { id: "sign", variants: [{ textKey: "q6.seg.sign" }] },
];

// ---------- Q8: расписание студии йоги ----------

const q8Segments: ResponseSegment[] = [
  {
    id: "main",
    variants: [
      { when: { data: ["none"] }, textKey: "q8.seg.invented", hallucination: true },
      { when: { goal: ["g.yoga.summary"] }, textKey: "q8.seg.summary" },
      { when: { format: ["f.table"], limits: ["l.moves"] }, textKey: "q8.seg.tableGood" },
      { when: { format: ["f.table"] }, textKey: "q8.seg.tableBad" },
      { when: { limits: ["l.moves"] }, textKey: "q8.seg.textGood" },
      { textKey: "q8.seg.textBad" },
    ],
  },
];

// ---------- Q9: объяснить маме Алекса, что такое облако ----------

const q9Segments: ResponseSegment[] = [
  {
    id: "main",
    variants: [
      { when: { role: ["ro.grandson"], limits: ["l.noTerms"] }, textKey: "q9.seg.grandsonClean" },
      { when: { role: ["ro.grandson"] }, textKey: "q9.seg.grandsonTerms" },
      { when: { role: ["ro.prof"] }, textKey: "q9.seg.prof" },
      { when: { role: ["ro.engineer"] }, textKey: "q9.seg.engineer" },
      { textKey: "q9.seg.plain" },
    ],
  },
  { id: "more", variants: [{ when: { limits: ["l.detailed"] }, textKey: "q9.seg.detailed" }, { textKey: "" }] },
];

// ---------- Q11v: заказ агентства «Волна» ----------

const q11vSegments: ResponseSegment[] = [
  {
    id: "head",
    variants: [
      { when: { goal: ["g.fit.brand"] }, textKey: "q11v.seg.brand" },
      { when: { tone: ["t.hype"] }, textKey: "q11v.seg.headHype" },
      { textKey: "q11v.seg.head" },
    ],
  },
  {
    id: "facts",
    variants: [
      { when: { data: ["d.fit.facts"] }, textKey: "q11v.seg.facts" },
      { textKey: "q11v.seg.inventedSale", hallucination: true },
    ],
  },
  {
    id: "promise",
    variants: [
      { when: { limits: ["l.noGuarantee"] }, textKey: "" },
      { when: { tone: ["t.hype"] }, textKey: "q11v.seg.guarantee", hallucination: true },
      { textKey: "" },
    ],
  },
  { id: "aud", variants: [{ when: { audience: ["a.fit.young"] }, textKey: "q11v.seg.young" }, { textKey: "" }] },
];

// ---------- Q13: осенняя кампания (пост, SMS, табличка) ----------

const campSegments = (part: "post" | "sms" | "sign"): ResponseSegment[] => [
  {
    id: "main",
    variants: [
      { when: { format: ["f.letter"] }, textKey: "q13.seg.letter" },
      { when: { data: ["d.camp.oct"], tone: ["t.formal"] }, textKey: `q13.seg.${part}.octFormal` },
      { when: { data: ["d.camp.oct"] }, textKey: `q13.seg.${part}.oct` },
      { when: { data: ["d.camp.old"] }, textKey: `q13.seg.${part}.old` },
      { textKey: `q13.seg.${part}.invented`, hallucination: true },
    ],
  },
];

const campStage = (part: "post" | "sms" | "sign", index: number, max: number) => ({
  taskKey: `q13.task.${part}`,
  slots: ["format", "data", "tone"] as SlotId[],
  cards: ["f.post", "f.sms", "f.sign", "f.letter", "d.camp.oct", "d.camp.old", "t.playful", "t.formal", "t.hype"],
  required: ["format"] as SlotId[],
  segments: campSegments(part),
  pass: 0.7,
  criteria: [
    { id: "format", labelKey: `q13.crit.format.${part}`, weight: 30, kind: "cards" as const, when: { format: [part === "post" ? "f.post" : part === "sms" ? "f.sms" : "f.sign"] } },
    { id: "data", labelKey: "q13.crit.data", weight: 30, kind: "cards" as const, when: { data: ["d.camp.oct"] } },
    { id: "length", labelKey: `q13.crit.length.${part}`, weight: 20, kind: "maxLength" as const, max, hard: true },
    { id: "tone", labelKey: "q13.crit.tone", weight: 20, kind: "cards" as const, when: { tone: ["t.playful", "t.formal", "none"] } },
    { id: "truth", labelKey: "q13.crit.truth", weight: 0, kind: "noHallucination" as const, hard: true },
    ...(index > 0 ? [{ id: "same", labelKey: "q13.crit.same", weight: 0, kind: "sameAsStage" as const, stage: 0, slot: "data" as SlotId, hard: true }] : []),
  ],
  reactions: [
    { when: { data: ["d.camp.old"] }, from: "anna" as const, textKey: "q13.react.old" },
    { when: { format: ["f.letter"] }, from: "anna" as const, textKey: "q13.react.letter" },
  ],
});

// Уроки: короткая теория перед заданием. Задание — практика урока.
const lessons: LessonDef[] = [
  { id: "prompt", questId: "q2", titleKey: "lesson.prompt.title", bodyKeys: ["lesson.prompt.1", "lesson.prompt.2", "lesson.prompt.3"], badKey: "lesson.prompt.bad", goodKey: "lesson.prompt.good", takeawayKey: "lesson.prompt.takeaway" },
  { id: "hallucination", questId: "q3", titleKey: "lesson.hallucination.title", bodyKeys: ["lesson.hallucination.1", "lesson.hallucination.2", "lesson.hallucination.3"], badKey: "lesson.hallucination.bad", goodKey: "lesson.hallucination.good", takeawayKey: "lesson.hallucination.takeaway" },
  { id: "format", questId: "q5", titleKey: "lesson.format.title", bodyKeys: ["lesson.format.1", "lesson.format.2"], badKey: "lesson.format.bad", goodKey: "lesson.format.good", takeawayKey: "lesson.format.takeaway" },
  { id: "responsibility", questId: "q6", titleKey: "lesson.responsibility.title", bodyKeys: ["lesson.responsibility.1", "lesson.responsibility.2"], badKey: "lesson.responsibility.bad", goodKey: "lesson.responsibility.good", takeawayKey: "lesson.responsibility.takeaway" },
  { id: "factcheck", questId: "q7", titleKey: "lesson.factcheck.title", bodyKeys: ["lesson.factcheck.1", "lesson.factcheck.2", "lesson.factcheck.3"], takeawayKey: "lesson.factcheck.takeaway" },
  { id: "structure", questId: "q8", titleKey: "lesson.structure.title", bodyKeys: ["lesson.structure.1", "lesson.structure.2"], badKey: "lesson.structure.bad", goodKey: "lesson.structure.good", takeawayKey: "lesson.structure.takeaway" },
  { id: "role", questId: "q9", titleKey: "lesson.role.title", bodyKeys: ["lesson.role.1", "lesson.role.2"], badKey: "lesson.role.bad", goodKey: "lesson.role.good", takeawayKey: "lesson.role.takeaway" },
  { id: "privacy", questId: "q10", titleKey: "lesson.privacy.title", bodyKeys: ["lesson.privacy.1", "lesson.privacy.2", "lesson.privacy.3"], takeawayKey: "lesson.privacy.takeaway" },
  { id: "template", questId: "q13", titleKey: "lesson.template.title", bodyKeys: ["lesson.template.1", "lesson.template.2"], badKey: "lesson.template.bad", goodKey: "lesson.template.good", takeawayKey: "lesson.template.takeaway" },
];

// Словарь: термин открывается, когда появляется задание, где он нужен.
const glossary: GlossaryDef[] = [
  { id: "llm", termKey: "term.llm", defKey: "term.llm.def", questId: "q2" },
  { id: "prompt", termKey: "term.prompt", defKey: "term.prompt.def", questId: "q2" },
  { id: "context", termKey: "term.context", defKey: "term.context.def", questId: "q2" },
  { id: "hallucination", termKey: "term.hallucination", defKey: "term.hallucination.def", questId: "q3" },
  { id: "format", termKey: "term.format", defKey: "term.format.def", questId: "q5" },
  { id: "fewshot", termKey: "term.fewshot", defKey: "term.fewshot.def", questId: "q5" },
  { id: "token", termKey: "term.token", defKey: "term.token.def", questId: "q5" },
  { id: "factcheck", termKey: "term.factcheck", defKey: "term.factcheck.def", questId: "q7" },
  { id: "role", termKey: "term.role", defKey: "term.role.def", questId: "q9" },
  { id: "pii", termKey: "term.pii", defKey: "term.pii.def", questId: "q10" },
  { id: "anonymization", termKey: "term.anonymization", defKey: "term.anonymization.def", questId: "q10" },
  { id: "template", termKey: "term.template", defKey: "term.template.def", questId: "q13" },
];

export const content: Content = {
  school,
  lessons: [...lessons, ...act2Lessons, ...act3Lessons, ...act4Lessons],
  glossary: [...glossary, ...act2Glossary, ...act3Glossary, ...act4Glossary],
  cards: [...cards, ...act2Cards, ...act3Cards, ...act4Cards],
  finalGoalKey: "goal.end",
  skills: [
    { id: "aiComm", nameKey: "skill.aiComm", levels: [1, 3, 6] },
    { id: "aiLiteracy", nameKey: "skill.aiLiteracy", levels: [1, 3, 6] },
  ],
  items: [
    { id: "lamp", nameKey: "item.lamp.name", descKey: "item.lamp.desc", price: 60, category: "comfort", icon: "💡" },
    { id: "cheatsheet", nameKey: "item.cheatsheet.name", descKey: "item.cheatsheet.desc", price: 80, unlockSlots: ["examples"], category: "work", icon: "📋" },
    { id: "coffee", nameKey: "item.coffee.name", descKey: "item.coffee.desc", price: 150, category: "comfort", icon: "☕", xpBoost: 0.05 },
    ...act2Items.map((i) => ({ ...i, category: "work" as const, icon: i.id === "neiraPlus" ? "✨" : "💻" })),
    ...shopItems,
  ],
  quests: [
    {
      id: "q1",
      kind: "dialog",
      titleKey: "q1.title",
      stage: 1,
      requires: [],
      offer: { type: "auto" },
      goalKey: "q1.goal",
      npc: "dima",
      promptKey: "q1.dima",
      choices: [
        { id: "what", textKey: "q1.c.what", replyKey: "q1.r.what", setLevel: "novice" },
        { id: "heard", textKey: "q1.c.heard", replyKey: "q1.r.heard", setLevel: "practice" },
        { id: "show", textKey: "q1.c.show", replyKey: "q1.r.show", setLevel: "pro" },
      ],
      reward: { xp: 5, unlockApps: ["neira"] },
    },
    {
      id: "q2",
      kind: "prompt",
      titleKey: "q2.title",
      stage: 1,
      requires: ["q1"],
      offer: { type: "auto" },
      goalKey: "q2.goal",
      stages: [
        {
          taskKey: "q2.task1",
          slots: ["goal", "recipient"],
          cards: ["g.tap.about", "g.tap.fix", "g.tap.complain", "r.landlord", "r.friend", "r.neighbors"],
          required: ["goal"],
          segments: q2Segments,
          pass: 0.8,
          criteria: [
            { id: "ask", labelKey: "q2.crit.ask", weight: 60, kind: "cards", when: { goal: ["g.tap.fix"] } },
            { id: "to", labelKey: "q2.crit.to", weight: 40, kind: "cards", when: { recipient: ["r.landlord"] } },
          ],
          afterPass: { from: "dima", textKey: "q2.dima.drier" },
        },
        {
          taskKey: "q2.task2",
          slots: ["goal", "recipient", "tone"],
          cards: ["g.tap.about", "g.tap.fix", "g.tap.complain", "r.landlord", "r.friend", "r.neighbors", "t.business", "t.warm", "t.angry"],
          required: ["goal", "tone"],
          segments: q2Segments,
          pass: 0.9,
          criteria: [
            { id: "warm", labelKey: "q2.crit.warm", weight: 50, kind: "cards", when: { tone: ["t.warm"] }, hard: true },
            { id: "ask", labelKey: "q2.crit.ask", weight: 25, kind: "cards", when: { goal: ["g.tap.fix"] } },
            { id: "to", labelKey: "q2.crit.to", weight: 25, kind: "cards", when: { recipient: ["r.landlord"] } },
          ],
        },
      ],
      reward: {
        xp: 15,
        skills: { aiComm: 1 },
        achievements: ["firstPrompt"],
        unlockApps: ["journal"],
        unlockSlots: ["audience", "data", "limits"],
      },
      onComplete: [{ from: "dima", textKey: "q2.dima.done" }],
    },
    {
      id: "q3",
      kind: "prompt",
      titleKey: "q3.title",
      stage: 1,
      requires: ["q2"],
      offer: { type: "message", from: "anna", textKey: "q3.offer" },
      goalKey: "q3.goal",
      client: "anna",
      stages: [
        {
          taskKey: "q3.task",
          slots: ["goal", "audience", "tone", "data", "limits"],
          cards: [
            "g.cafe.menu", "g.cafe.history", "g.cafe.sale",
            "a.students", "a.all", "a.office",
            "t.playful", "t.formal", "t.hype",
            "d.menu3", "d.menuFull",
            "l.300", "l.50", "l.emoji",
          ],
          required: ["goal"],
          segments: q3Segments,
          pass: 0.7,
          criteria: [
            { id: "cta", labelKey: "q3.crit.cta", weight: 25, kind: "cards", when: { goal: ["g.cafe.menu", "g.cafe.sale"] } },
            { id: "prices", labelKey: "q3.crit.prices", weight: 25, kind: "cards", when: { data: ["d.menu3", "d.menuFull"], limits: ["none", "l.300", "l.emoji"] } },
            { id: "discount", labelKey: "q3.crit.discount", weight: 20, kind: "cards", when: { data: ["d.menu3", "d.menuFull"], limits: ["none", "l.300", "l.emoji"] } },
            { id: "students", labelKey: "q3.crit.students", weight: 15, kind: "cards", when: { audience: ["a.students"], tone: ["t.playful"] } },
            { id: "length", labelKey: "q3.crit.length", weight: 15, kind: "maxLength", max: 300 },
            { id: "truth", labelKey: "q3.crit.truth", weight: 0, kind: "noHallucination", hard: true, hintKey: "q3.crit.truthHint" },
          ],
        },
      ],
      reward: {
        xp: 40,
        pay: { complexity: 1.2, client: 1 },
        rep: 3,
        skills: { aiComm: 1 },
        achievements: ["firstClient"],
        unlockApps: ["orders", "shop", "skills"],
        milestoneKey: "milestone.firstOrder",
      },
      onComplete: [
        { from: "anna", textKey: "q3.anna.perfect", minQuality: 0.9 },
        { from: "anna", textKey: "q3.anna.ok", maxQuality: 0.9 },
      ],
      hours: 1,
    },
    {
      id: "q4",
      kind: "purchase",
      titleKey: "q4.title",
      stage: 1,
      requires: ["q3"],
      offer: { type: "auto" },
      goalKey: "q4.goal",
      reward: { xp: 10, achievements: ["firstUpgrade"], unlockSlots: ["format"] },
    },
    {
      id: "q5",
      kind: "prompt",
      titleKey: "q5.title",
      stage: 1,
      requires: ["q4"],
      offer: { type: "board", from: "sergey", textKey: "q5.offer" },
      goalKey: "q5.goal",
      activeGoalKey: "q5.goalActive",
      client: "sergey",
      stages: [
        {
          taskKey: "q5.task",
          slots: ["goal", "data", "format", "tone", "examples"],
          cards: ["g.sms.tires", "g.sms.all", "d.sms.facts", "f.sms", "f.letter", "f.list", "t.formal", "t.hype", "t.playful", "e.sms"],
          required: ["goal", "format"],
          segments: q5Segments,
          pass: 0.7,
          criteria: [
            { id: "length", labelKey: "q5.crit.length", weight: 30, kind: "maxLength", max: 160, hard: true },
            { id: "facts", labelKey: "q5.crit.facts", weight: 25, kind: "cards", when: { data: ["d.sms.facts"] } },
            { id: "goal", labelKey: "q5.crit.goal", weight: 20, kind: "cards", when: { goal: ["g.sms.tires"] } },
            { id: "truth", labelKey: "q5.crit.truth", weight: 10, kind: "noHallucination", hard: true },
            { id: "style", labelKey: "q5.crit.style", weight: 15, kind: "cards", when: { examples: ["e.sms"] } },
          ],
        },
      ],
      reward: {
        xp: 35,
        pay: { complexity: 0.9, client: 1 },
        rep: 2,
        skills: { aiComm: 1 },
        achievements: ["regular"],
      },
      onComplete: [
        { from: "sergey", textKey: "q5.sergey.perfect", minQuality: 0.9 },
        { from: "sergey", textKey: "q5.sergey.ok", maxQuality: 0.9 },
      ],
    },
    {
      id: "q6",
      kind: "prompt",
      titleKey: "q6.title",
      stage: 1,
      requires: ["q5"],
      offer: { type: "message", from: "anna", textKey: "q6.offer" },
      goalKey: "q6.goal",
      activeGoalKey: "q6.goalActive",
      client: "anna",
      stages: [
        {
          taskKey: "q6.task",
          slots: ["goal", "tone", "data", "limits"],
          cards: ["g.rev.reply", "g.rev.defend", "t.business", "t.warm", "t.angry", "d.rev.coffee", "d.rev.rush", "l.noPromise", "l.emoji"],
          required: ["goal"],
          segments: q6Segments,
          pass: 0.7,
          criteria: [
            { id: "calm", labelKey: "q6.crit.calm", weight: 30, kind: "cards", when: { goal: ["g.rev.reply"], tone: ["t.business", "t.warm", "none"] } },
            { id: "step", labelKey: "q6.crit.step", weight: 35, kind: "cards", when: { data: ["d.rev.coffee", "d.rev.rush"] } },
            { id: "tone", labelKey: "q6.crit.tone", weight: 35, kind: "cards", when: { tone: ["t.warm", "t.business"] } },
            { id: "truth", labelKey: "q6.crit.truth", weight: 0, kind: "noHallucination", hard: true },
          ],
          reactions: [
            { when: { goal: ["g.rev.defend"] }, from: "anna", textKey: "q6.react.defend" },
            { when: { tone: ["t.angry"] }, from: "anna", textKey: "q6.react.angry" },
            { when: { data: ["none"], limits: ["none", "l.emoji"] }, from: "anna", textKey: "q6.react.lunch" },
          ],
        },
      ],
      reward: { xp: 30, pay: { complexity: 0.6, client: 1 }, rel: { anna: 1 }, skills: { aiComm: 1 } },
      onComplete: [
        { from: "anna", textKey: "q6.anna.coffee", whenSel: { data: ["d.rev.coffee"] } },
        { from: "anna", textKey: "q6.anna.rush", whenSel: { data: ["d.rev.rush"] } },
      ],
    },
    {
      id: "q7",
      kind: "classify",
      game: "factcheck",
      titleKey: "q7.title",
      stage: 1,
      requires: ["q6"],
      offer: { type: "message", from: "dima", textKey: "q7.offer" },
      goalKey: "q7.goal",
      activeGoalKey: "q7.goalActive",
      client: "dima",
      introKey: "q7.intro",
      sourceTitleKey: "q7.sourceTitle",
      sourceKeys: ["q7.src.1", "q7.src.2", "q7.src.3", "q7.src.4"],
      options: [
        { id: "source", labelKey: "q7.opt.source" },
        { id: "contra", labelKey: "q7.opt.contra" },
        { id: "missing", labelKey: "q7.opt.missing" },
      ],
      items: [
        { id: "year", textKey: "q7.claim.year", answer: "contra", weight: 2, explainKey: "q7.explain.year" },
        { id: "founders", textKey: "q7.claim.founders", answer: "source", weight: 1, explainKey: "q7.explain.founders" },
        { id: "hub", textKey: "q7.claim.hub", answer: "source", weight: 1, explainKey: "q7.explain.hub" },
        { id: "staff", textKey: "q7.claim.staff", answer: "missing", weight: 2, explainKey: "q7.explain.staff" },
        { id: "docs", textKey: "q7.claim.docs", answer: "source", weight: 1, explainKey: "q7.explain.docs" },
        { id: "jobs", textKey: "q7.claim.jobs", answer: "source", weight: 1, explainKey: "q7.explain.jobs" },
      ],
      pass: 0.75,
      onMissed: [
        { itemId: "staff", from: "dima", textKey: "q7.dima.staff" },
        { itemId: "year", from: "dima", textKey: "q7.dima.year" },
      ],
      reward: { xp: 50, skills: { aiLiteracy: 2 }, achievements: ["factChecker"], rel: { dima: 1 } },
      onComplete: [{ from: "dima", textKey: "q7.dima.thanks" }],
    },
    {
      id: "q8",
      kind: "prompt",
      titleKey: "q8.title",
      stage: 1,
      requires: ["q7"],
      offer: { type: "board", from: "olga", textKey: "q8.offer" },
      goalKey: "q8.goal",
      activeGoalKey: "q8.goalActive",
      client: "olga",
      stages: [
        {
          taskKey: "q8.task",
          slots: ["goal", "data", "format", "limits"],
          cards: ["g.yoga.schedule", "g.yoga.summary", "d.yoga.chat", "f.table", "f.text", "f.list", "l.moves", "l.emoji"],
          required: ["goal"],
          segments: q8Segments,
          pass: 0.7,
          criteria: [
            { id: "data", labelKey: "q8.crit.data", weight: 20, kind: "cards", when: { data: ["d.yoga.chat"] } },
            { id: "goal", labelKey: "q8.crit.goal", weight: 15, kind: "cards", when: { goal: ["g.yoga.schedule"] } },
            { id: "table", labelKey: "q8.crit.table", weight: 30, kind: "cards", when: { format: ["f.table"] } },
            { id: "moves", labelKey: "q8.crit.moves", weight: 35, kind: "cards", when: { limits: ["l.moves"] } },
            { id: "truth", labelKey: "q8.crit.truth", weight: 0, kind: "noHallucination", hard: true },
          ],
          reactions: [
            { when: { data: ["none"] }, from: "olga", textKey: "q8.react.invented" },
            { when: { goal: ["g.yoga.summary"] }, from: "olga", textKey: "q8.react.summary" },
            { when: { limits: ["none", "l.emoji"] }, from: "olga", textKey: "q8.react.moves" },
            { when: { format: ["f.text", "f.list", "none"] }, from: "olga", textKey: "q8.react.text" },
          ],
        },
      ],
      reward: { xp: 40, pay: { complexity: 1.1, client: 1 }, rep: 2, skills: { aiComm: 1 } },
      onComplete: [{ from: "olga", textKey: "q8.olga.done" }],
    },
    {
      id: "q9a",
      kind: "dialog",
      titleKey: "q9a.title",
      stage: 1,
      requires: ["q8"],
      offer: { type: "auto" },
      goalKey: "q9a.goal",
      npc: "dima",
      promptKey: "q9a.dima",
      choices: [
        { id: "yes", textKey: "q9a.c.yes", replyKey: "q9a.r.yes" },
        { id: "nervous", textKey: "q9a.c.nervous", replyKey: "q9a.r.nervous" },
      ],
      reward: { xp: 5, unlockSlots: ["role"] },
    },
    {
      id: "q9",
      kind: "prompt",
      titleKey: "q9.title",
      stage: 1,
      requires: ["q9a"],
      offer: { type: "message", from: "alex", textKey: "q9.offer" },
      goalKey: "q9.goal",
      activeGoalKey: "q9.goalActive",
      client: "alex",
      stages: [
        {
          taskKey: "q9.task",
          slots: ["role", "goal", "limits"],
          cards: ["ro.prof", "ro.grandson", "ro.engineer", "g.cloud", "l.noTerms", "l.detailed"],
          required: ["goal"],
          segments: q9Segments,
          pass: 0.75,
          criteria: [
            { id: "analogy", labelKey: "q9.crit.analogy", weight: 40, kind: "cards", when: { role: ["ro.grandson"] } },
            { id: "terms", labelKey: "q9.crit.terms", weight: 35, kind: "cards", when: { limits: ["l.noTerms"] } },
            { id: "short", labelKey: "q9.crit.short", weight: 25, kind: "maxLength", max: 330 },
          ],
          reactions: [
            { when: { role: ["ro.prof"] }, from: "alex", textKey: "q9.react.prof" },
            { when: { role: ["ro.engineer"] }, from: "alex", textKey: "q9.react.engineer" },
            { when: { role: ["none"] }, from: "alex", textKey: "q9.react.none" },
            { when: { role: ["ro.grandson"], limits: ["none", "l.detailed"] }, from: "alex", textKey: "q9.react.terms" },
            { when: { role: ["ro.grandson"], limits: ["l.noTerms"] }, from: "alex", textKey: "q9.react.good" },
          ],
        },
      ],
      reward: { xp: 60, skills: { aiComm: 2 }, rel: { alex: 2 }, achievements: ["mentor"] },
      onComplete: [{ from: "alex", textKey: "q9.alex.done" }],
    },
    {
      id: "q10",
      kind: "classify",
      game: "privacy",
      titleKey: "q10.title",
      stage: 1,
      requires: ["q9"],
      offer: { type: "message", from: "sergey", textKey: "q10.offer" },
      goalKey: "q10.goal",
      activeGoalKey: "q10.goalActive",
      client: "sergey",
      introKey: "q10.intro",
      sourceTitleKey: "q10.sourceTitle",
      sourceKeys: ["q10.src.head", "q10.src.1", "q10.src.2", "q10.src.3"],
      options: [
        { id: "keep", labelKey: "q10.opt.keep" },
        { id: "mask", labelKey: "q10.opt.mask" },
        { id: "remove", labelKey: "q10.opt.remove" },
      ],
      items: [
        { id: "name", textKey: "q10.f.name", answer: "mask", weight: 1, explainKey: "q10.explain.name" },
        { id: "phone", textKey: "q10.f.phone", answer: "remove", weight: 1, explainKey: "q10.explain.phone" },
        { id: "plate", textKey: "q10.f.plate", answer: "remove", weight: 1, explainKey: "q10.explain.plate" },
        { id: "car", textKey: "q10.f.car", answer: "keep", weight: 1, explainKey: "q10.explain.car" },
        { id: "date", textKey: "q10.f.date", answer: "keep", weight: 1, explainKey: "q10.explain.date" },
        { id: "debt", textKey: "q10.f.debt", answer: "remove", weight: 2, explainKey: "q10.explain.debt" },
      ],
      pass: 0.7,
      shortcut: { labelKey: "q10.shortcut", flags: ["leakedData"], rep: -2, replyKey: "q10.sergey.fast" },
      reward: { xp: 45, pay: { complexity: 1.3, client: 1 }, rep: 3, flags: ["careful"], achievements: ["careful"], skills: { aiLiteracy: 1 } },
      onComplete: [
        { from: "sergey", textKey: "q10.sergey.clean", noFlag: "leakedData" },
        { from: "anna", textKey: "q10.anna.campaign" },
      ],
    },
    {
      id: "q11",
      kind: "dialog",
      titleKey: "q11.title",
      stage: 1,
      requires: ["q10"],
      offer: { type: "auto" },
      goalKey: "q11.goal",
      npc: "nick",
      promptKey: "q11.nick",
      choices: [
        { id: "volna", textKey: "q11.c.volna", replyKey: "q11.r.volna", effects: { flags: ["tookVolna", "annaLate"], rel: { anna: -2, nick: 1 } } },
        { id: "anna", textKey: "q11.c.anna", replyKey: "q11.r.anna", effects: { flags: ["declinedVolna"], rel: { anna: 2, nick: -1 } } },
        { id: "both", textKey: "q11.c.both", replyKey: "q11.r.both", effects: { flags: ["tookVolna", "tookBoth"] } },
      ],
      reward: { xp: 40 },
      onComplete: [
        { from: "anna", textKey: "q11.anna.late", flag: "annaLate" },
        { from: "anna", textKey: "q11.anna.thanks", flag: "declinedVolna" },
        { from: "sergey", textKey: "q11.sergey.leak", flag: "leakedData" },
      ],
    },
    {
      id: "q11v",
      kind: "prompt",
      titleKey: "q11v.title",
      stage: 1,
      requires: ["q11"],
      requiresFlag: "tookVolna",
      offer: { type: "board", from: "nick", textKey: "q11v.offer" },
      goalKey: "q11v.goal",
      activeGoalKey: "q11v.goalActive",
      client: "nick",
      stages: [
        {
          taskKey: "q11v.task",
          slots: ["goal", "audience", "tone", "data", "limits"],
          cards: ["g.fit.launch", "g.fit.brand", "a.fit.young", "a.all", "t.playful", "t.hype", "t.formal", "d.fit.facts", "l.noGuarantee", "l.emoji"],
          required: ["goal"],
          segments: q11vSegments,
          pass: 0.7,
          criteria: [
            { id: "launch", labelKey: "q11v.crit.launch", weight: 30, kind: "cards", when: { goal: ["g.fit.launch"] } },
            { id: "facts", labelKey: "q11v.crit.facts", weight: 35, kind: "cards", when: { data: ["d.fit.facts"] } },
            { id: "aud", labelKey: "q11v.crit.aud", weight: 15, kind: "cards", when: { audience: ["a.fit.young"] } },
            { id: "safe", labelKey: "q11v.crit.safe", weight: 20, kind: "cards", when: { limits: ["l.noGuarantee"] } },
            { id: "truth", labelKey: "q11v.crit.truth", weight: 0, kind: "noHallucination", hard: true },
          ],
          reactions: [
            { when: { tone: ["t.hype"], limits: ["none", "l.emoji"] }, from: "nick", textKey: "q11v.react.guarantee" },
            { when: { data: ["none"] }, from: "nick", textKey: "q11v.react.sale" },
          ],
        },
      ],
      reward: { xp: 60, pay: { complexity: 4, client: 1 }, payByFlag: { tookBoth: 0.85 }, rel: { nick: 1 } },
      onComplete: [{ from: "nick", textKey: "q11v.nick.done" }],
    },
    {
      id: "q13",
      kind: "prompt",
      titleKey: "q13.title",
      stage: 1,
      requires: ["q11"],
      offer: { type: "message", from: "anna", textKey: "q13.offer" },
      goalKey: "q13.goal",
      activeGoalKey: "q13.goalActive",
      client: "anna",
      stages: [campStage("post", 0, 320), campStage("sms", 1, 160), campStage("sign", 2, 60)].map((st, i) => ({
        ...st,
        afterPass: i === 0 ? { from: "anna" as const, textKey: "q13.anna.post" } : i === 1 ? { from: "anna" as const, textKey: "q13.anna.sms" } : undefined,
      })),
      reward: {
        xp: 150,
        pay: { complexity: 3.5, client: 1 },
        payByFlag: { annaLate: 0.8, tookBoth: 0.9 },
        rep: 4,
        rel: { anna: 1 },
        achievements: ["firstCampaign"],
        milestoneKey: "milestone.actEnd",
      },
      onComplete: [
        { from: "anna", textKey: "q13.anna.done", noFlag: "annaLate" },
        { from: "anna", textKey: "q13.anna.doneLate", flag: "annaLate" },
      ],
    },
    ...act2Quests,
    ...act3Quests,
    ...act4Quests,
  ],
};

// Новые виды заданий («Найди ошибку ИИ», «Почини промпт») — строятся на уже описанных заказах.
content.quests.push(...huntQuests, ...buildFixQuests(content.quests));
