"use client";

import { useEffect, useState } from "react";
import type { GameApi } from "./useGame";

// Маленькое демо на главном экране: запрос → «думает» → ответ печатается. Тексты — из первых заказов игры.
const DEMO = [
  { prompt: "напиши хозяину про кран, тёплым тоном", answer: "Виктор Петрович, добрый вечер! Кран на кухне течёт уже неделю. Сможете прислать мастера до пятницы? Спасибо!" },
  { prompt: "SMS про зимнюю резину, до 160 знаков", answer: "«Колесо»: пора на зимнюю резину! Запись 555-12-34, скидка до 30.11." },
  { prompt: "ты — терпеливый внук. Объясни маме, что такое облако", answer: "Мам, представь камеру хранения на вокзале. Облако — такая же, только для фотографий." },
];

const FEATURES = [
  { icon: "✦", label: "Промпты", tone: "#a78bfa" },
  { icon: "◆", label: "Основы ИИ", tone: "#4f8cff" },
  { icon: "●", label: "9 уроков", tone: "#2dd4bf" },
  { icon: "▲", label: "Сюжет и карьера", tone: "#f5b544" },
];

// Узлы «нейросети» на фоне: координаты в процентах, связи — пары индексов.
const NODES = [
  [8, 22], [18, 12], [26, 30], [14, 46], [34, 16], [72, 14], [84, 26], [92, 12], [78, 42], [66, 30], [90, 52], [6, 64],
] as const;
const LINKS = [[0, 1], [1, 2], [0, 3], [2, 4], [1, 4], [5, 6], [6, 7], [6, 8], [5, 9], [9, 8], [8, 10], [3, 11], [2, 3]] as const;

function useMenuMotion() {
  const [on, setOn] = useState(true);
  useEffect(() => {
    try {
      const v = window.localStorage.getItem("ai-rise.motion");
      if (v === "off" || (v === null && window.matchMedia("(prefers-reduced-motion: reduce)").matches)) setOn(false);
    } catch {
      /* без доступа к хранилищу оставляем анимации включёнными */
    }
  }, []);
  return on;
}

function DemoChat({ motion }: { motion: boolean }) {
  const [i, setI] = useState(0);
  const [phase, setPhase] = useState<"typing" | "thinking" | "answer">(motion ? "typing" : "answer");
  const [n, setN] = useState(motion ? 0 : Number.MAX_SAFE_INTEGER);
  const demo = DEMO[i % DEMO.length]!;
  const words = demo.answer.split(" ");

  useEffect(() => {
    if (!motion) {
      setPhase("answer");
      setN(Number.MAX_SAFE_INTEGER);
      return;
    }
    const timers: number[] = [];
    const later = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));
    setPhase("typing");
    setN(0);
    later(1400, () => setPhase("thinking"));
    later(2600, () => {
      setPhase("answer");
      words.forEach((_, k) => later(k * 90, () => setN(k + 1)));
      later(words.length * 90 + 2600, () => setI((x) => x + 1));
    });
    return () => timers.forEach((id) => window.clearTimeout(id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, motion]);

  return (
    <div className="menu-chat relative w-full overflow-hidden rounded-2xl border border-ai/30 bg-surface/80 p-4 text-left shadow-2xl shadow-ai/20 backdrop-blur-md">
      <div className="flex items-center gap-2 border-b border-line pb-3">
        <span className="neira-orb neira-orb-sm" aria-hidden />
        <span className="text-sm font-semibold">Нейра</span>
        <span className="ml-auto flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-ok">
          <span className="menu-live h-1.5 w-1.5 rounded-full bg-ok" aria-hidden /> online
        </span>
      </div>
      <div className="mt-3 flex justify-end">
        <p className="max-w-[85%] rounded-2xl rounded-br-md bg-ai px-3 py-2 text-sm text-white">
          <span className={motion && phase === "typing" ? "menu-type" : undefined} key={i}>{demo.prompt}</span>
        </p>
      </div>
      <div className="mt-3 min-h-[76px]">
        {phase === "thinking" ? (
          <p className="flex items-center gap-2 text-sm text-muted">
            думает<span className="neira-dots" aria-hidden><i>.</i><i>.</i><i>.</i></span>
          </p>
        ) : phase === "answer" ? (
          <p className="max-w-[92%] rounded-2xl rounded-bl-md border border-line bg-bg/70 px-3 py-2 font-mono text-[13px] leading-relaxed text-ink">
            {words.slice(0, n).join(" ")}
            {motion && n < words.length && <span className="neira-cursor" aria-hidden />}
          </p>
        ) : null}
      </div>
      <div className="mt-2 flex gap-1" aria-hidden>
        {DEMO.map((_, k) => <span key={k} className={`h-1 flex-1 rounded-full transition-colors duration-500 ${k === i % DEMO.length ? "bg-ai" : "bg-line"}`} />)}
      </div>
    </div>
  );
}

export function Menu({ game }: { game: GameApi }) {
  const { t, hasSave } = game;
  const [confirm, setConfirm] = useState(false);
  const motion = useMenuMotion();

  return (
    <main data-motion={motion ? "on" : "off"} className="menu-root relative flex min-h-dvh flex-col overflow-hidden">
      {/* Фон: сияние, «нейросеть», неоновая сетка-пол и ночной город. Без filter: blur — он даёт тёмные прямоугольники в Safari. */}
      <div aria-hidden className="menu-aurora pointer-events-none absolute inset-0" />
      <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" preserveAspectRatio="none">
        {LINKS.map(([a, b], k) => (
          <line key={k} x1={`${NODES[a][0]}%`} y1={`${NODES[a][1]}%`} x2={`${NODES[b][0]}%`} y2={`${NODES[b][1]}%`} className="menu-link" style={{ animationDelay: `${(k % 5) * 0.7}s` }} />
        ))}
        {NODES.map(([x, y], k) => (
          <circle key={k} cx={`${x}%`} cy={`${y}%`} r={k % 3 === 0 ? 3 : 2} className="menu-node" style={{ animationDelay: `${(k % 4) * 0.8}s` }} />
        ))}
      </svg>
      <div aria-hidden className="menu-grid pointer-events-none absolute inset-x-0 bottom-0 h-[38%]" />
      <svg aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[22%] w-full" viewBox="0 0 1200 200" preserveAspectRatio="none">
        <path
          d="M0 200V130h60v-30h40v50h50V80h30v-20h30v20h30v90h40v-60h70v40h40V60h20V40h40v20h20v110h50v-70h60v50h40V70h30V50h30v20h30v100h60v-80h50v60h40V90h60v30h50V60h30v-20h30v20h20v110h40v-50h60v-30h40v40h50v50z"
          fill="#070b16"
          stroke="#4f8cff"
          strokeOpacity="0.35"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
        {Array.from({ length: 34 }, (_, k) => (
          <rect key={k} x={(k * 137) % 1180 + 10} y={135 + ((k * 97) % 55)} width="5" height="6" className="menu-window" style={{ animationDelay: `${(k % 7) * 0.9}s` }} />
        ))}
      </svg>
      {Array.from({ length: 14 }, (_, k) => (
        <span key={k} aria-hidden className="menu-mote pointer-events-none absolute bottom-0 h-1 w-1 rounded-full" style={{ left: `${(k * 71) % 100}%`, animationDelay: `${k * 0.9}s`, animationDuration: `${9 + (k % 5) * 2}s` }} />
      ))}

      <div className="relative z-10 mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 px-4 py-10 sm:px-8 lg:grid-cols-[1.1fr_1fr]">
        <div className="anim-rise text-center lg:text-left">
          <p className="inline-flex items-center gap-2 rounded-full border border-ok/30 bg-ok/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.25em] text-ok">
            <span className="menu-live h-1.5 w-1.5 rounded-full bg-ok" aria-hidden /> Ривертон · 2026
          </p>
          <h1 className="menu-title mt-5 text-6xl font-black leading-[0.95] tracking-tight sm:text-7xl lg:text-8xl">
            <span className="block">AI</span>
            <span className="menu-title-rise block">RISE</span>
          </h1>
          <p className="mx-auto mt-5 max-w-md text-lg text-muted lg:mx-0">{t("ui.subtitle")}</p>
          <ul className="mt-5 flex flex-wrap justify-center gap-2 lg:justify-start">
            {FEATURES.map((f, k) => (
              <li key={f.label} className="anim-rise rounded-full border border-line bg-surface/60 px-3 py-1 text-sm backdrop-blur" style={{ animationDelay: `${200 + k * 90}ms` }}>
                <span style={{ color: f.tone }} aria-hidden>{f.icon}</span> {f.label}
              </li>
            ))}
          </ul>

          <div className="mx-auto mt-9 flex w-full max-w-sm flex-col gap-3 lg:mx-0">
            {hasSave && (
              <button onClick={game.continueGame} className="menu-cta rounded-xl px-6 py-4 text-lg font-semibold text-white">
                <span className="relative">{t("ui.continue")} →</span>
              </button>
            )}
            {!confirm ? (
              <button
                onClick={() => (hasSave ? setConfirm(true) : game.setScreen("create"))}
                className={hasSave ? "rounded-xl border border-line bg-surface/70 px-6 py-3.5 text-lg font-semibold backdrop-blur transition hover:border-ai/60 hover:bg-surface-2" : "menu-cta rounded-xl px-6 py-4 text-lg font-semibold text-white"}
              >
                <span className="relative">{t("ui.newGame")}{hasSave ? "" : " →"}</span>
              </button>
            ) : (
              <div className="rounded-xl border border-bad/40 bg-surface/90 p-4 backdrop-blur">
                <p className="text-sm text-muted">{t("ui.resetConfirm")}</p>
                <div className="mt-3 flex justify-center gap-3">
                  <button onClick={() => { game.reset(); game.setScreen("create"); }} className="rounded-lg bg-bad/90 px-4 py-2 font-semibold text-white">{t("ui.yes")}</button>
                  <button onClick={() => setConfirm(false)} className="rounded-lg border border-line px-4 py-2">{t("ui.no")}</button>
                </div>
              </div>
            )}
          </div>
          <p className="mt-6 text-xs text-muted">{t("ui.prototypeNote")}</p>
        </div>

        <div className="anim-rise mx-auto w-full max-w-md" style={{ animationDelay: "250ms" }}>
          <DemoChat motion={motion} />
          <p className="mt-3 text-center text-xs text-muted">{t("ui.menu.demo")}</p>
        </div>
      </div>
    </main>
  );
}
