// Контент первого акта: задания Q1–Q5, карточки Prompt Lab, предметы, навыки.
// Только структура и ключи текстов — сами тексты лежат в locales/.

import type { Content, PromptCard, ResponseSegment, SlotId } from "@/core/types";

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

export const content: Content = {
  cards,
  finalGoalKey: "goal.end",
  skills: [
    { id: "aiComm", nameKey: "skill.aiComm", levels: [1, 3, 6] },
    { id: "aiLiteracy", nameKey: "skill.aiLiteracy", levels: [1, 3, 6] },
  ],
  items: [
    { id: "lamp", nameKey: "item.lamp.name", descKey: "item.lamp.desc", price: 60 },
    { id: "cheatsheet", nameKey: "item.cheatsheet.name", descKey: "item.cheatsheet.desc", price: 80, unlockSlots: ["examples"] },
    { id: "coffee", nameKey: "item.coffee.name", descKey: "item.coffee.desc", price: 150 },
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
        { id: "what", textKey: "q1.c.what", replyKey: "q1.r.what" },
        { id: "heard", textKey: "q1.c.heard", replyKey: "q1.r.heard" },
        { id: "show", textKey: "q1.c.show", replyKey: "q1.r.show" },
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
        milestoneKey: "milestone.prototypeEnd",
      },
      onComplete: [
        { from: "sergey", textKey: "q5.sergey.perfect", minQuality: 0.9 },
        { from: "sergey", textKey: "q5.sergey.ok", maxQuality: 0.9 },
      ],
    },
  ],
};
