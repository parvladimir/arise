// Школа ТАКТ ИИ: короткие обучающие мини-игры про основы ИИ и промптов.
// Только структура и ключи — тексты лежат в locales/ru.school.ts.

import type { SchoolModule } from "@/core/types";

const k = (mod: string) => (rest: string) => `school.${mod}.${rest}`;

const ai = k("ai");
const tools = k("tools");
const prompt = k("prompt");
const better = k("better");
const tokens = k("tokens");
const fake = k("fake");

const tf = [ai("true"), ai("myth")];

export const school: SchoolModule[] = [
  {
    id: "ai",
    icon: "🧠",
    core: true,
    titleKey: ai("title"),
    introKey: ai("intro"),
    takeawayKey: ai("takeaway"),
    kind: "quiz",
    optionKeys: tf,
    items: [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({
      qKey: ai(`q${n}`),
      answer: [1, 0, 1, 0, 1, 0, 0, 1][n - 1]!,
      explainKey: ai(`e${n}`),
    })),
  },
  {
    id: "tools",
    icon: "🧰",
    core: true,
    titleKey: tools("title"),
    introKey: tools("intro"),
    takeawayKey: tools("takeaway"),
    kind: "quiz",
    optionKeys: ["chat", "image", "video", "voice", "code"].map((x) => tools(`o.${x}`)),
    items: [
      { n: 1, a: 0 },
      { n: 2, a: 1 },
      { n: 3, a: 2 },
      { n: 4, a: 3 },
      { n: 5, a: 4 },
      { n: 6, a: 0 },
      { n: 7, a: 3 },
      { n: 8, a: 1 },
    ].map(({ n, a }) => ({ qKey: tools(`q${n}`), answer: a, explainKey: tools(`e${n}`) })),
  },
  {
    id: "prompt",
    icon: "🧩",
    core: true,
    titleKey: prompt("title"),
    introKey: prompt("intro"),
    takeawayKey: prompt("takeaway"),
    kind: "build",
    rounds: [1, 2].map((r) => ({
      taskKey: prompt(`r${r}.brief`),
      parts: ["role", "task", "context", "format"].map((p) => ({
        labelKey: prompt(`part.${p}`),
        pieceKey: prompt(`r${r}.${p}`),
        hintKey: prompt(`hint.${p}`),
      })),
      decoyKeys: [prompt(`r${r}.d1`), prompt(`r${r}.d2`)],
      resultKey: prompt(`r${r}.result`),
    })),
  },
  {
    id: "better",
    icon: "⚖️",
    titleKey: better("title"),
    introKey: better("intro"),
    takeawayKey: better("takeaway"),
    kind: "quiz",
    // Сильный промпт стоит то первым, то вторым, чтобы не угадывали по месту.
    items: [1, 2, 3, 4, 5].map((n) => {
      const strongFirst = n % 2 === 0;
      return {
        qKey: better("q"),
        optionKeys: strongFirst ? [better(`s${n}`), better(`w${n}`)] : [better(`w${n}`), better(`s${n}`)],
        answer: strongFirst ? 0 : 1,
        explainKey: better(`e${n}`),
      };
    }),
  },
  {
    id: "tokens",
    icon: "🔤",
    titleKey: tokens("title"),
    introKey: tokens("intro"),
    takeawayKey: tokens("takeaway"),
    kind: "quiz",
    items: [
      { n: 1, a: 0 },
      { n: 2, a: 2 },
      { n: 3, a: 1 },
      { n: 4, a: 0 },
    ].map(({ n, a }) => ({ qKey: tokens(`q${n}`), optionKeys: [1, 2, 3].map((o) => tokens(`q${n}.o${o}`)), answer: a, explainKey: tokens(`e${n}`) })),
  },
  {
    id: "fake",
    icon: "🔍",
    titleKey: fake("title"),
    introKey: fake("intro"),
    takeawayKey: fake("takeaway"),
    kind: "spot",
    rounds: [
      { n: 1, fakes: [3] },
      { n: 2, fakes: [3, 5] },
      { n: 3, fakes: [3] },
    ].map(({ n, fakes }) => ({
      factsKey: fake(`r${n}.facts`),
      sentences: [1, 2, 3, 4, 5].slice(0, n === 2 ? 5 : 4).map((i) => ({ key: fake(`r${n}.s${i}`), fake: fakes.includes(i) })),
    })),
  },
];
