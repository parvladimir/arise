"use client";
// Демо-заказ на промо-странице: собери промпт из карточек, посмотри ответ ИИ и забери ₵ в игру.

import { useEffect, useRef, useState } from "react";
import { DEMO_BONUS, DEMO_CLIENT, DEMO_COOKIE, DEMO_ROWS, demoComplete, demoPrompt, demoResult, type DemoPicks, type DemoSlot } from "@/core/demo";
import { MascotHead } from "./Mascot";

type Phase = "pick" | "typing" | "done";

/** Ответ появляется по словам, как в настоящем ИИ-чате. */
function useTyping(text: string, run: boolean, onDone: () => void) {
  const [shown, setShown] = useState("");
  useEffect(() => {
    if (!run) return;
    const words = text.split(/(\s+)/);
    let i = 0;
    setShown("");
    const id = window.setInterval(() => {
      i += 2;
      setShown(words.slice(0, i).join(""));
      if (i >= words.length) {
        window.clearInterval(id);
        onDone();
      }
    }, 70);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, run]);
  return shown;
}

export function GateDemo({ botUrl }: { botUrl: string }) {
  const [picks, setPicks] = useState<DemoPicks>({});
  const [phase, setPhase] = useState<Phase>("pick");
  const [thinking, setThinking] = useState(false);
  const result = demoResult(picks);
  const shown = useTyping(result.answer, phase === "typing" && !thinking, () => setPhase("done"));
  const ready = demoComplete(picks);
  const resultRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (phase === "done") resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [phase]);

  const send = () => {
    setPhase("typing");
    setThinking(true);
    window.setTimeout(() => setThinking(false), 900);
  };
  const retry = () => {
    setPicks({});
    setPhase("pick");
  };
  const claim = () => {
    try {
      document.cookie = `${DEMO_COOKIE}=${result.reward}; path=/; max-age=${30 * 86400}; samesite=lax`;
    } catch {
      // без куки ₵ всё равно придут: бот отметит, что игрок пришёл из демо
    }
  };
  const choose = (slot: DemoSlot, id: string) => phase === "pick" && setPicks((p) => ({ ...p, [slot]: id }));

  return (
    <div id="demo" className="mx-auto w-full max-w-md rounded-3xl border border-ai/40 bg-surface/90 p-4 text-left shadow-2xl shadow-ai/20 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="rounded-full bg-ai/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-ai">Сыграй сейчас</span>
        <span className="text-xs text-muted">30 секунд, без входа</span>
      </div>

      <div className="mt-4 flex gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-amber-500/20 text-xl" aria-hidden>
          ☕
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold">{DEMO_CLIENT.name}</p>
          <p className="mt-1 rounded-2xl rounded-tl-sm bg-white/5 px-3 py-2 text-sm leading-relaxed">{DEMO_CLIENT.message}</p>
        </div>
      </div>

      <p className="mt-4 text-sm font-semibold">Собери промпт для нейросети: выбери по одной карточке в каждой строке.</p>

      <div className="mt-3 grid gap-3">
        {DEMO_ROWS.map((row, n) => (
          <fieldset key={row.slot} disabled={phase !== "pick"}>
            <legend className="text-xs text-muted">
              <b className="text-ink">
                {n + 1}. {row.label}
              </b>{" "}
              · {row.hint}
            </legend>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {row.options.map((o) => {
                const on = picks[row.slot] === o.id;
                const mark = phase === "done" && on ? (o.good ? "border-ok bg-ok/15" : "border-bad bg-bad/15") : on ? "border-ai bg-ai/25" : "border-white/15";
                return (
                  <button
                    key={o.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => choose(row.slot, o.id)}
                    className={`min-h-10 rounded-xl border px-3 py-2 text-left text-sm transition ${mark} ${phase === "pick" ? "hover:border-ai/70" : ""}`}
                  >
                    {o.text}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>

      {phase === "pick" && (
        <button
          type="button"
          disabled={!ready}
          onClick={send}
          className="mt-4 min-h-12 w-full rounded-2xl bg-ai px-4 font-bold text-white shadow-lg shadow-ai/30 transition hover:brightness-110 disabled:opacity-40 disabled:shadow-none"
        >
          {ready ? "Отправить нейросети →" : `Выбери карточки: ${Object.keys(picks).length} из 3`}
        </button>
      )}

      {phase !== "pick" && (
        <div className="mt-4">
          <p className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-muted">
            <b className="text-ink">Твой промпт:</b> {demoPrompt(picks)}
          </p>
          <div className="mt-3 flex gap-3">
            <MascotHead mood={phase === "done" && result.good === 3 ? "happy" : "think"} className="h-10 w-10 shrink-0" />
            <div className="min-w-0 flex-1 whitespace-pre-line rounded-2xl rounded-tl-sm border border-cyan-400/30 bg-cyan-400/5 px-3 py-2 text-sm leading-relaxed">
              {thinking ? <span className="text-muted">Нейра думает…</span> : shown}
            </div>
          </div>
        </div>
      )}

      {phase === "done" && (
        <div ref={resultRef} className="anim-rise mt-4 rounded-2xl border border-white/10 bg-white/5 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-lg tracking-widest text-amber-300" aria-label={`Оценка: ${result.good} из 3`}>
              {"★".repeat(result.good)}
              <span className="text-white/20">{"★".repeat(3 - result.good)}</span>
            </span>
            <span className="text-xl font-black text-amber-300">+{result.reward} ₵</span>
          </div>
          {result.good === 3 ? (
            <p className="mt-2 text-sm">
              Идеально! Роль, факты и формат: так нейросеть понимает с первого раза. Это и есть хороший промпт.
            </p>
          ) : (
            <ul className="mt-2 grid gap-1 text-sm">
              {result.notes.map((n) => (
                <li key={n}>⚠ {n}</li>
              ))}
            </ul>
          )}
          {result.good < 3 && (
            <button
              type="button"
              onClick={retry}
              className="mt-3 min-h-11 w-full rounded-2xl border border-ai/60 px-4 text-sm font-bold text-ink transition hover:bg-ai/10"
            >
              ↻ Исправить промпт и получить все {DEMO_BONUS} ₵
            </button>
          )}
          <a
            href={botUrl}
            onClick={claim}
            className="mt-2 flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-ai px-4 text-center font-bold text-white shadow-lg shadow-ai/30 transition hover:brightness-110"
          >
            ✈ Забрать {result.reward > 0 ? `${result.reward} ₵` : "старт"} и играть дальше
          </a>
          <p className="mt-2 text-center text-xs text-muted">Вход через Telegram-бота: подписка на канал, и ты в игре.</p>
        </div>
      )}
    </div>
  );
}
