"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { content } from "@/content";
import { SCHOOL_PAY, SCHOOL_XP } from "@/core/engine";
import type { GameState, SchoolBuildRound, SchoolModule, SchoolQuizItem, SchoolSpotRound, TextKey } from "@/core/types";
import { MascotHead, TaktLogo } from "./Mascot";
import type { GameApi } from "./useGame";

type T = GameApi["t"];

function shuffle<X>(list: X[]): X[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** Школа ТАКТ ИИ: список мини-игр и сама игра. */
export function School({ game, state }: { game: GameApi; state: GameState }) {
  const { t } = game;
  const [playing, setPlaying] = useState<string | null>(null);
  const mod = content.school.find((m) => m.id === playing);
  if (mod) return <ModulePlayer key={mod.id} game={game} mod={mod} onExit={() => setPlaying(null)} />;

  const done = (id: string) => state.flags.includes(`school:${id}`);
  const all = content.school.every((m) => done(m.id));
  // Следующий непройденный урок подсвечен: сначала азы, потом остальные.
  const next = content.school.find((m) => m.core && !done(m.id)) ?? content.school.find((m) => !done(m.id));
  return (
    <div className="p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <MascotHead mood="happy" className="h-12 w-12" />
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-xl font-bold"><TaktLogo className="h-6" /> {t("ui.school.title")}</h2>
          <p className="text-sm text-muted">{t("ui.school.sub", { pay: SCHOOL_PAY, xp: SCHOOL_XP })}</p>
        </div>
      </div>
      {all && <p className="mt-4 rounded-xl border border-ok/40 bg-ok/10 px-4 py-3 text-sm font-semibold text-ok">🎓 {t("ui.school.allDone")}</p>}
      <ul className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {content.school.map((m, i) => {
          const passed = done(m.id);
          const isNext = next?.id === m.id;
          return (
            <li key={m.id} className="anim-rise" style={{ animationDelay: `${i * 60}ms` }}>
              <button
                onClick={() => setPlaying(m.id)}
                className={`school-card group flex h-full w-full flex-col rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 ${isNext ? "border-ok/70 bg-ok/10 shadow-lg shadow-ok/15" : passed ? "border-line bg-surface-2/40" : "border-line bg-surface-2/70 hover:border-ai/60"}`}
              >
                <span className="flex items-start gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#8b3dff]/40 to-[#00d4ff]/30 text-2xl">{m.icon}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono text-[11px] text-muted">{i + 1}.</span>
                      {m.core && <span className="rounded-full bg-ai/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#c4b5fd]">{t("ui.school.core")}</span>}
                      {passed && <span className="rounded-full bg-ok/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ok">✓ {t("ui.school.done")}</span>}
                    </span>
                    <span className="mt-1 block font-semibold leading-snug">{t(m.titleKey)}</span>
                  </span>
                </span>
                <span className="mt-2 line-clamp-3 text-sm leading-snug text-muted">{t(m.introKey)}</span>
                <span className={`mt-3 self-start rounded-lg px-3 py-1.5 text-sm font-semibold ${isNext ? "bg-ok text-bg" : "border border-line text-ink"}`}>
                  {passed ? t("ui.school.again") : t("ui.school.start")} →
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ModulePlayer({ game, mod, onExit }: { game: GameApi; mod: SchoolModule; onExit: () => void }) {
  const { t } = game;
  const [result, setResult] = useState<{ correct: number; total: number } | null>(null);
  const finish = (correct: number, total: number) => {
    setResult({ correct, total });
    game.dispatch({ type: "finishSchool", moduleId: mod.id, correct, total });
  };
  return (
    <div className="p-4 sm:p-5">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center gap-2">
          <button onClick={onExit} className="rounded-lg px-2 py-1 text-sm text-muted hover:text-ink">‹ {t("ui.school.back")}</button>
          <span className="ml-auto font-mono text-xs uppercase tracking-[0.2em] text-ok">{t("ui.school.title")}</span>
        </div>
        <h2 className="mt-2 flex items-center gap-2 text-2xl font-black leading-tight"><span aria-hidden>{mod.icon}</span> {t(mod.titleKey)}</h2>
        {result ? (
          <Finish t={t} mod={mod} result={result} onExit={onExit} />
        ) : (
          <>
            <p className="mt-2 text-[15px] leading-relaxed text-ink/85">{t(mod.introKey)}</p>
            <div className="mt-4">
              {mod.kind === "quiz" && <Quiz t={t} items={mod.items} shared={mod.optionKeys} onDone={finish} />}
              {mod.kind === "build" && <Build t={t} rounds={mod.rounds} onDone={finish} />}
              {mod.kind === "spot" && <Spot t={t} rounds={mod.rounds} onDone={finish} />}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Finish({ t, mod, result, onExit }: { t: T; mod: SchoolModule; result: { correct: number; total: number }; onExit: () => void }) {
  const great = result.correct / result.total >= 0.75;
  return (
    <div className="anim-rise mt-4 rounded-2xl border border-ai/40 bg-surface p-5 shadow-2xl shadow-ai/15">
      <div className="flex items-center gap-3">
        <MascotHead mood={great ? "happy" : "think"} className="h-14 w-14" />
        <p className="text-lg font-bold">{t("ui.school.score", { n: result.correct, total: result.total })}</p>
      </div>
      <p className="mt-4 font-mono text-xs uppercase tracking-[0.2em] text-ok">{t("ui.school.takeaway")}</p>
      <p className="mt-1 text-[15px] leading-relaxed">{t(mod.takeawayKey)}</p>
      <button onClick={onExit} className="menu-cta mt-5 w-full rounded-xl py-3 font-semibold text-white">
        <span className="relative">{t("ui.school.finish")} →</span>
      </button>
    </div>
  );
}

function Progress({ n, total, t }: { n: number; total: number; t: T }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-gradient-to-r from-[#8b3dff] to-[#00d4ff] transition-all duration-500" style={{ width: `${(n / total) * 100}%` }} />
      </div>
      <span className="font-mono text-xs tabular-nums text-muted">{t("ui.school.progress", { n: Math.min(n + 1, total), total })}</span>
    </div>
  );
}

function Explain({ t, ok, textKey, onNext, last }: { t: T; ok: boolean; textKey: TextKey; onNext: () => void; last: boolean }) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => ref.current?.focus({ preventScroll: true }), []);
  return (
    <div className={`anim-rise mt-3 rounded-xl border p-3.5 ${ok ? "border-ok/50 bg-ok/10" : "border-bad/50 bg-bad/10"}`}>
      <p className={`font-semibold ${ok ? "text-ok" : "text-bad"}`}>{ok ? "✓ " + t("ui.school.right") : "✕ " + t("ui.school.wrong")}</p>
      <p className="mt-1 text-[15px] leading-relaxed">{t(textKey)}</p>
      <button ref={ref} onClick={onNext} className="mt-3 rounded-lg bg-ai px-4 py-2 font-semibold text-white hover:brightness-110">
        {last ? t("ui.school.finish") : t("ui.school.next")} →
      </button>
    </div>
  );
}

function Quiz({ t, items, shared, onDone }: { t: T; items: SchoolQuizItem[]; shared?: TextKey[]; onDone: (c: number, total: number) => void }) {
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const item = items[i]!;
  const options = item.optionKeys ?? shared ?? [];
  const long = options.some((o) => t(o).length > 40);
  const pick = (n: number) => {
    if (picked !== null) return;
    setPicked(n);
    if (n === item.answer) setCorrect((c) => c + 1);
  };
  const next = () => {
    if (i + 1 >= items.length) onDone(correct, items.length);
    else {
      setI(i + 1);
      setPicked(null);
    }
  };
  return (
    <div>
      <Progress n={i} total={items.length} t={t} />
      <div key={i} className="anim-rise mt-4 rounded-2xl border border-line bg-surface-2/70 p-4 sm:p-5">
        <p className="text-lg font-semibold leading-snug">{t(item.qKey)}</p>
        <div className={`mt-4 grid gap-2 ${long ? "" : options.length === 2 ? "grid-cols-2" : "sm:grid-cols-2"}`}>
          {options.map((o, n) => {
            const state = picked === null ? "idle" : n === item.answer ? "right" : n === picked ? "wrong" : "dim";
            return (
              <button
                key={o}
                onClick={() => pick(n)}
                disabled={picked !== null}
                className={`rounded-xl border px-4 py-3 text-left text-[15px] leading-snug transition ${
                  state === "idle" ? "border-line bg-bg/60 hover:border-ai hover:bg-ai/10" : state === "right" ? "border-ok bg-ok/15 text-ink" : state === "wrong" ? "school-shake border-bad bg-bad/15" : "border-line/50 opacity-50"
                }`}
              >
                {t(o)}
              </button>
            );
          })}
        </div>
        {picked !== null && <Explain t={t} ok={picked === item.answer} textKey={item.explainKey} onNext={next} last={i + 1 >= items.length} />}
      </div>
    </div>
  );
}

function Build({ t, rounds, onDone }: { t: T; rounds: SchoolBuildRound[]; onDone: (c: number, total: number) => void }) {
  const [r, setR] = useState(0);
  const [filled, setFilled] = useState(0);
  const [miss, setMiss] = useState<TextKey | null>(null);
  const [firstTry, setFirstTry] = useState(0);
  const [slipped, setSlipped] = useState(false);
  const round = rounds[r]!;
  const pool = useMemo(() => shuffle([...round.parts.map((p) => p.pieceKey), ...round.decoyKeys]), [round]);
  const total = rounds.reduce((n, x) => n + x.parts.length, 0);
  const complete = filled >= round.parts.length;
  const part = round.parts[filled];
  const used = new Set(round.parts.slice(0, filled).map((p) => p.pieceKey));

  const tap = (key: TextKey) => {
    if (!part) return;
    if (key === part.pieceKey) {
      if (!slipped) setFirstTry((n) => n + 1);
      setFilled((f) => f + 1);
      setMiss(null);
      setSlipped(false);
    } else {
      setMiss(key);
      setSlipped(true);
    }
  };
  const next = () => {
    if (r + 1 >= rounds.length) onDone(firstTry, total);
    else {
      setR(r + 1);
      setFilled(0);
      setMiss(null);
      setSlipped(false);
    }
  };
  return (
    <div>
      <Progress n={r} total={rounds.length} t={t} />
      <div key={r} className="anim-rise mt-4 rounded-2xl border border-line bg-surface-2/70 p-4 sm:p-5">
        <p className="text-lg font-semibold leading-snug">{t(round.taskKey)}</p>
        <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.2em] text-muted">{t("ui.school.build.prompt")}</p>
        <ol className="mt-2 space-y-1.5 rounded-xl border border-ai/30 bg-bg/70 p-3 font-mono text-[13.5px] leading-relaxed">
          {round.parts.map((p, n) => (
            <li key={p.labelKey} className={`flex gap-2 rounded-lg px-2 py-1 ${n === filled && !complete ? "bg-ai/15 ring-1 ring-ai/60" : ""}`}>
              <span className="w-[5.5rem] shrink-0 text-[11px] font-bold uppercase tracking-wide text-[#c4b5fd]">{t(p.labelKey)}</span>
              {n < filled ? <span className="anim-rise text-ink">{t(p.pieceKey)}</span> : <span className="text-muted/60">…</span>}
            </li>
          ))}
        </ol>
        {!complete && part && (
          <>
            <p className="mt-4 text-sm font-semibold">{t("ui.school.build.pick", { part: t(part.labelKey) })}</p>
            {miss && <p key={miss} className="anim-rise mt-2 rounded-lg bg-gold/10 px-3 py-2 text-sm text-gold">💡 {t(part.hintKey)}</p>}
            <div className="mt-2 flex flex-wrap gap-2">
              {pool.filter((k) => !used.has(k)).map((k) => (
                <button
                  key={k}
                  onClick={() => tap(k)}
                  className={`rounded-xl border px-3 py-2 text-left text-sm leading-snug transition ${miss === k ? "school-shake border-bad bg-bad/10 text-bad" : "border-line bg-bg/60 hover:border-ai hover:bg-ai/10"}`}
                >
                  {t(k)}
                </button>
              ))}
            </div>
          </>
        )}
        {complete && (
          <div className="anim-rise mt-4 rounded-xl border border-ok/50 bg-ok/10 p-3.5">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ok">{t("ui.school.build.result")}</p>
            <p className="mt-1 text-[15px] leading-relaxed">{t(round.resultKey)}</p>
            <button onClick={next} className="mt-3 rounded-lg bg-ai px-4 py-2 font-semibold text-white hover:brightness-110">
              {r + 1 >= rounds.length ? t("ui.school.finish") : t("ui.school.next")} →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Spot({ t, rounds, onDone }: { t: T; rounds: SchoolSpotRound[]; onDone: (c: number, total: number) => void }) {
  const [r, setR] = useState(0);
  const [sel, setSel] = useState<Set<number>>(new Set());
  const [checked, setChecked] = useState(false);
  const [correct, setCorrect] = useState(0);
  const round = rounds[r]!;
  const total = rounds.reduce((n, x) => n + x.sentences.length, 0);
  const toggle = (n: number) => {
    if (checked) return;
    setSel((s) => {
      const x = new Set(s);
      if (x.has(n)) x.delete(n);
      else x.add(n);
      return x;
    });
  };
  const check = () => {
    setChecked(true);
    setCorrect((c) => c + round.sentences.filter((s, n) => s.fake === sel.has(n)).length);
  };
  const next = () => {
    if (r + 1 >= rounds.length) onDone(correct, total);
    else {
      setR(r + 1);
      setSel(new Set());
      setChecked(false);
    }
  };
  const allRight = round.sentences.every((s, n) => s.fake === sel.has(n));
  return (
    <div>
      <Progress n={r} total={rounds.length} t={t} />
      <div key={r} className="anim-rise mt-4 space-y-3">
        <div className="rounded-2xl border border-gold/40 bg-gold/5 p-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-gold">📋 {t("ui.school.spot.facts")}</p>
          <p className="mt-1 text-[15px] leading-relaxed">{t(round.factsKey)}</p>
        </div>
        <div className="rounded-2xl border border-ai/40 bg-surface-2/70 p-4">
          <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-[#c4b5fd]"><MascotHead className="h-5 w-5" /> {t("ui.school.spot.answer")}</p>
          <div className="mt-2 space-y-1.5">
            {round.sentences.map((s, n) => {
              const on = sel.has(n);
              const look = !checked
                ? on ? "border-bad bg-bad/15" : "border-line bg-bg/60 hover:border-ai"
                : s.fake ? (on ? "border-ok bg-ok/15" : "border-bad bg-bad/15") : on ? "school-shake border-bad bg-bad/10 opacity-80" : "border-line/40 opacity-60";
              return (
                <button key={s.key} onClick={() => toggle(n)} disabled={checked} className={`flex w-full items-start gap-2 rounded-xl border px-3 py-2 text-left text-[15px] leading-snug transition ${look}`}>
                  <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded border text-xs ${on ? "border-bad bg-bad text-white" : "border-line"}`} aria-hidden>{on ? "✕" : ""}</span>
                  <span className="flex-1">{t(s.key)}</span>
                  {checked && s.fake && <span className="shrink-0 rounded-full bg-bad/20 px-2 py-0.5 text-[10px] font-bold uppercase text-bad">{t("ui.school.spot.fake")}</span>}
                </button>
              );
            })}
          </div>
          {!checked ? (
            <button onClick={check} disabled={sel.size === 0} className="mt-3 rounded-lg bg-ai px-4 py-2 font-semibold text-white hover:brightness-110 disabled:opacity-40">
              {t("ui.school.spot.check")}
            </button>
          ) : (
            <div className={`anim-rise mt-3 rounded-xl border p-3 ${allRight ? "border-ok/50 bg-ok/10" : "border-gold/50 bg-gold/10"}`}>
              <p className={`font-semibold ${allRight ? "text-ok" : "text-gold"}`}>{allRight ? "✓ " + t("ui.school.right") : "✕ " + t("ui.school.wrong")}</p>
              <button onClick={next} className="mt-2 rounded-lg bg-ai px-4 py-2 font-semibold text-white hover:brightness-110">
                {r + 1 >= rounds.length ? t("ui.school.finish") : t("ui.school.next")} →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
