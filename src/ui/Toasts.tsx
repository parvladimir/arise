"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { content } from "@/content";
import type { GameState, Toast } from "@/core/types";
import type { GameApi } from "./useGame";
import { Mascot, MascotHead } from "./Mascot";

type Batch = { key: number; items: Toast[]; ms: number };
let counter = 0;

export function Toasts({ game, state, hold = false, onBusy }: { game: GameApi; state: GameState; hold?: boolean; onBusy?: (busy: boolean) => void }) {
  const { t, dispatch } = game;
  const [batches, setBatches] = useState<Batch[]>([]);
  const [milestone, setMilestone] = useState<string | null>(null);
  const close = (key: number) => setBatches((b) => b.filter((x) => x.key !== key));

  useEffect(() => {
    if (state.toasts.length === 0) return;
    const incoming = state.toasts;
    dispatch({ type: "clearToasts" });
    const m = incoming.find((x) => x.kind === "milestone");
    if (m && m.kind === "milestone") setMilestone(m.textKey);
    const items = incoming.filter((x) => x.kind !== "milestone");
    if (items.length === 0) return;
    // Большая награда висит 10 секунд, одиночная мелочь — 6. Карточки показываются по очереди, не стопкой.
    const batch = { key: ++counter, items, ms: items.length > 2 ? 10000 : 6000 };
    setBatches((b) => [...b, batch]);
  }, [state.toasts, dispatch]);

  const current = batches[0];
  useEffect(() => onBusy?.(Boolean(current)), [current, onBusy]);
  const timer = usePausableTimer(current?.key ?? null, current?.ms ?? 0, () => current && close(current.key));

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 top-16 z-50 flex flex-col items-center px-3 sm:top-20" aria-live="polite">
        {current && <RewardCard key={current.key} batch={current} t={t} onClose={() => close(current.key)} pause={timer.pause} resume={timer.resume} />}
      </div>
      {milestone === "milestone.actEnd" && !hold && <ActEnd game={game} state={state} onClose={() => setMilestone(null)} />}
      {milestone && milestone !== "milestone.actEnd" && !hold && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-bg/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="milestone">
          <div className="anim-rise w-full max-w-md rounded-2xl border border-ai/40 bg-surface p-7 text-center shadow-2xl shadow-ai/20">
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-ok">AI RISE</p>
            <h2 id="milestone" className="mt-3 text-2xl font-bold leading-snug">{t(milestone)}</h2>
            <button autoFocus onClick={() => setMilestone(null)} className="mt-6 rounded-xl bg-ai px-6 py-3 font-semibold text-white hover:brightness-110">
              {t("ui.neira.next")}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

type T = GameApi["t"];

/** Таймер, который можно приостановить: пока мышь над уведомлением, оно не исчезает. */
export function usePausableTimer(key: number | null, ms: number, onDone: () => void) {
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  });
  const left = useRef(ms);
  const started = useRef(0);
  const id = useRef<number | undefined>(undefined);
  const resume = useCallback(() => {
    window.clearTimeout(id.current);
    started.current = Date.now();
    id.current = window.setTimeout(() => done.current(), left.current);
  }, []);
  const pause = useCallback(() => {
    window.clearTimeout(id.current);
    left.current = Math.max(1500, left.current - (Date.now() - started.current));
  }, []);
  useEffect(() => {
    if (key === null) return;
    left.current = ms;
    resume();
    return () => window.clearTimeout(id.current);
  }, [key, ms, resume]);
  return { pause, resume };
}

/** Карточка награды: кредиты и опыт крупно сверху, достижения и открытия — строками ниже. */
function RewardCard({ batch, t, onClose, pause, resume }: { batch: Batch; t: T; onClose: () => void; pause: () => void; resume: () => void }) {
  const money = batch.items.reduce((n, x) => n + (x.kind === "money" ? x.amount : 0), 0);
  const xp = batch.items.reduce((n, x) => n + (x.kind === "xp" ? x.amount : 0), 0);
  const rows = batch.items.flatMap((x) => {
    switch (x.kind) {
      case "achievement": return [{ icon: "★", tone: "text-gold border-gold/40 bg-gold/10", label: t("ui.toast.achLabel"), value: t(`ach.${x.id}`) }];
      case "skill": return [{ icon: "▲", tone: "text-ai border-ai/40 bg-ai/10", label: t("ui.toast.skillLabel"), value: t("ui.toast.skillValue", { name: t(content.skills.find((s) => s.id === x.skill)?.nameKey ?? x.skill), level: x.level }) }];
      default: return [];
    }
  });
  const apps = batch.items.flatMap((x) => (x.kind === "unlock" ? [t(`app.${x.app}`)] : []));
  if (apps.length) rows.push({ icon: "▣", tone: "text-ok border-ok/40 bg-ok/10", label: t(apps.length > 1 ? "ui.toast.unlockMany" : "ui.toast.unlockLabel"), value: apps.join(" · ") });
  return (
    <div role="status" onMouseEnter={pause} onMouseLeave={resume} className="toast-card pointer-events-auto relative w-full max-w-sm sm:w-80 overflow-hidden rounded-2xl border border-ai/35 bg-surface/95 shadow-2xl shadow-ai/20 backdrop-blur">
      <div className="flex items-center gap-2 px-4 pt-3">
        <MascotHead mood="happy" className="h-7 w-7" />
        <p className="flex-1 font-mono text-[11px] uppercase tracking-[0.25em] text-muted">{t("ui.toast.title")}</p>
        <button onClick={onClose} aria-label={t("ui.toast.close")} className="-mr-1 grid h-7 w-7 place-items-center rounded-lg text-muted hover:bg-line/60 hover:text-ink">✕</button>
      </div>
      {(money > 0 || xp > 0) && (
        <div className="flex gap-2 px-4 pt-2">
          {money > 0 && (
            <div className="toast-row flex-1 rounded-xl border border-gold/30 bg-gold/10 px-3 py-2" style={{ animationDelay: "80ms" }}>
              <p className="text-[11px] text-muted">{t("ui.toast.moneyLabel")}</p>
              <p className="font-mono text-xl font-bold text-gold">{t("ui.toast.money", { n: money })}</p>
            </div>
          )}
          {xp > 0 && (
            <div className="toast-row flex-1 rounded-xl border border-ai/30 bg-ai/10 px-3 py-2" style={{ animationDelay: "160ms" }}>
              <p className="text-[11px] text-muted">{t("ui.toast.xpLabel")}</p>
              <p className="font-mono text-xl font-bold text-ai">{t("ui.toast.xp", { n: xp })}</p>
            </div>
          )}
        </div>
      )}
      {rows.length > 0 && (
        <ul className="space-y-1.5 px-4 pt-2">
          {rows.map((r, i) => (
            <li key={i} className="toast-row flex items-center gap-3" style={{ animationDelay: `${240 + i * 90}ms` }}>
              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border text-sm ${r.tone}`} aria-hidden>{r.icon}</span>
              <span className="min-w-0">
                <span className="block text-[11px] text-muted">{r.label}</span>
                <span className="block text-sm font-semibold leading-snug">{r.value}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 h-1 bg-line/50">
        <div className="toast-timer h-full bg-gradient-to-r from-ai to-ok" style={{ animationDuration: `${batch.ms}ms` }} />
      </div>
    </div>
  );
}

/** Итог первого акта: что заработано, какие решения приняты и что ждёт дальше. */
function ActEnd({ game, state, onClose }: { game: GameApi; state: GameState; onClose: () => void }) {
  const { t } = game;
  const earned = state.ledger.filter((e) => e.delta > 0).reduce((n, e) => n + e.delta, 0);
  const done = Object.values(state.quests).filter((q) => q.status === "done").length;
  const has = (f: string) => state.flags.includes(f);
  const choices = [
    has("declinedVolna") ? "ui.act.choiceAnna" : has("tookBoth") ? "ui.act.choiceBoth" : has("tookVolna") ? "ui.act.choiceVolna" : null,
    has("leakedData") ? "ui.act.choiceLeak" : has("careful") ? "ui.act.choiceCareful" : null,
  ].filter(Boolean) as string[];
  const stats = [
    { label: t("ui.act.earned"), value: `${earned} ₵`, tone: "text-gold" },
    { label: t("ui.act.quests"), value: String(done), tone: "text-ai" },
    { label: t("ui.act.rep"), value: String(state.rep), tone: "text-ok" },
    { label: "XP", value: String(state.xp), tone: "text-ai" },
  ];
  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-bg/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="act-end">
      <div className="act-card anim-rise relative w-full max-w-lg overflow-hidden rounded-3xl border border-ai/40 bg-surface p-6 shadow-2xl shadow-ai/25 sm:p-8">
        <div className="act-glow pointer-events-none absolute inset-0" aria-hidden />
        <Mascot pose="cheer" mood="happy" className="pointer-events-none absolute -right-3 top-2 h-24 opacity-95 sm:h-32" />
        <div className="relative">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-ok">{t("ui.act.kicker")}</p>
          <h2 id="act-end" className="mt-2 text-3xl font-black leading-tight sm:text-4xl">{t("ui.act.title")}</h2>
          <p className="mt-2 text-muted">{t("milestone.actEnd")}</p>
          <dl className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {stats.map((s, i) => (
              <div key={s.label} className="anim-rise rounded-xl border border-line bg-bg/50 p-3 text-center" style={{ animationDelay: `${150 + i * 90}ms` }}>
                <dt className="text-[11px] uppercase tracking-wide text-muted">{s.label}</dt>
                <dd className={`mt-1 font-mono text-xl font-bold ${s.tone}`}>{s.value}</dd>
              </div>
            ))}
          </dl>
          {choices.length > 0 && (
            <div className="mt-5">
              <h3 className="text-sm font-semibold text-muted">{t("ui.act.choices")}</h3>
              <ul className="mt-2 space-y-1.5 text-sm">
                {choices.map((c) => <li key={c} className="flex gap-2"><span className="text-ai">◆</span>{t(c)}</li>)}
              </ul>
            </div>
          )}
          {state.achievements.length > 0 && (
            <div className="mt-5">
              <h3 className="text-sm font-semibold text-muted">{t("ui.journal.achievements")}</h3>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {state.achievements.map((a) => <li key={a} className="rounded-full border border-gold/40 bg-gold/10 px-2.5 py-1 text-xs font-semibold text-gold">★ {t(`ach.${a}`)}</li>)}
              </ul>
            </div>
          )}
          <p className="mt-5 rounded-xl border border-line bg-bg/40 p-3 text-sm leading-snug text-muted">{t("ui.act.next")}</p>
          <button onClick={onClose} className="mt-6 w-full rounded-xl bg-ai py-3 font-semibold text-white shadow-lg shadow-ai/30 hover:brightness-110">
            {t("ui.act.stay")}
          </button>
        </div>
      </div>
    </div>
  );
}
