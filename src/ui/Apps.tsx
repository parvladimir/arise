"use client";

import { todayKey } from "./nav";
import { useEffect, useState } from "react";
import { content } from "@/content";
import { boardQuests, cleanRun, dailyFor, DAILY_BONUS, DAILY_COUNT, levelOf, doneGigs, starsFor, incomeRate, itemPayBoost, skillPayBoost, itemXpBoost, pendingIncome } from "@/core/engine";
import { basePay, skillLevel } from "@/core/economy";
import type { GameState, ItemCategory, ItemDef } from "@/core/types";
import type { GameApi } from "./useGame";

export function Orders({ game, state, openNeira }: { game: GameApi; state: GameState; openNeira: () => void }) {
  const { t, dispatch } = game;
  const list = [
    ...content.quests.filter((q) => (q.kind === "prompt" || q.kind === "classify") && q.offer.type !== "board" && state.quests[q.id]?.status === "active"),
    ...boardQuests(state, content),
  ];
  const finished = doneGigs(state, content);
  const levelMul = levelOf(state) === "pro" ? 1.25 : 1;
  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold">{t("ui.orders.title")}</h2>
      <p className="mt-1 text-xs leading-snug text-muted">🔥 {t("ui.streak.hint")}</p>
      <DailyOrders game={game} state={state} openNeira={openNeira} />
      {list.length === 0 && dailyFor(state, content, todayKey()).length === 0 && <p className="mt-4 text-sm text-muted">{t(finished.length > 0 ? "ui.orders.allDone" : "ui.orders.empty")}</p>}
      <ul className="mt-4 space-y-3">
        {list.map((q) => {
          const status = state.quests[q.id]!.status;
          const from = q.offer.type === "auto" ? null : q.offer.from;
          const rush = state.rush?.questId === q.id;
          const rushOn = rush && cleanRun(q, state.quests[q.id]!.attempts);
          const pay = q.reward.pay ? Math.round(basePay(q.stage) * q.reward.pay.complexity * q.reward.pay.client * levelMul * (rushOn ? 2 : 1)) : 0;
          return (
            <li key={q.id} className={`anim-rise rounded-xl border p-4 ${rushOn ? "rush-card border-bad/60 bg-bad/5" : "border-line bg-surface-2/60"}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 font-semibold">
                  {rushOn && <span className="rush-badge rounded-full bg-bad px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">{t("ui.rush.badge")}</span>}
                  {status === "available" && !q.repeatable && <span className="rounded-full bg-bad px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">{t("ui.orders.new")}</span>}
                  {q.repeatable && <span className="rounded-full bg-gold/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gold">{t("ui.orders.gig")}</span>}
                  {t(q.titleKey)}
                </h3>
                {pay > 0 && <span className="font-mono text-sm text-gold">{t("ui.orders.pay", { pay })}</span>}
              </div>
              {from && (
                <p className="mt-0.5 text-sm text-muted">
                  {t(`npc.${from}`)}
                </p>
              )}
              {q.offer.type !== "auto" && <p className="mt-2 text-[15px] leading-snug">«{t(q.offer.textKey)}»</p>}
              {rush && (
                <p className={`mt-2 rounded-lg px-2.5 py-1.5 text-xs leading-snug ${rushOn ? "bg-bad/10 text-bad" : "bg-surface text-muted"}`}>
                  {rushOn ? t("ui.rush.rule") : t("ui.rush.missed")}
                  {rushOn && status === "available" && <span className="block font-semibold">{t("ui.rush.left", { n: state.rush!.left })}</span>}
                </p>
              )}
              <div className="mt-3">
                {status === "available" ? (
                  <button
                    onClick={() => {
                      dispatch({ type: "acceptQuest", questId: q.id });
                      openNeira();
                    }}
                    className="rounded-lg bg-gold px-4 py-2 font-semibold text-bg hover:brightness-110"
                  >
                    {t("ui.orders.take")}
                  </button>
                ) : (
                  <button onClick={openNeira} className="rounded-lg border border-ai px-4 py-2 font-semibold text-ai hover:bg-ai/10">
                    {t("ui.orders.open")}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {finished.length > 0 && (
        <div className="mt-6">
          <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-ok">{t("ui.orders.doneTitle")}</h3>
          <ul className="mt-2 space-y-2">
            {finished.map((q) => (
              <li key={q.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-ok/25 bg-ok/5 px-4 py-3 text-sm">
                <span className="font-semibold text-ok">✓</span>
                <span className="font-semibold">{t(q.titleKey)}</span>
                <Stars n={starsFor(state.quests[q.id]!.bestQuality)} />
                {q.offer.type !== "auto" && <span className="text-muted">{t(`npc.${q.offer.from}`)}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

const CATEGORIES: ItemCategory[] = ["comfort", "work", "transport", "team", "home"];
const ctxOf = (game: GameApi) => ({ content, t: game.t });

export function Shop({ game, state }: { game: GameApi; state: GameState }) {
  const { t, dispatch } = game;
  const ctx = ctxOf(game);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 20_000);
    return () => window.clearInterval(id);
  }, []);
  const visible = content.items.filter((item) => !item.requiresQuest || state.quests[item.requiresQuest]);
  const has = (id: string) => state.inventory.includes(id);
  const open = (item: ItemDef) => !item.requiresItem || has(item.requiresItem);
  // Цель накопить: самая дешёвая доступная покупка, на которую пока не хватает.
  const goal = visible.filter((i) => !has(i.id) && open(i)).sort((x, y) => x.price - y.price).find((i) => i.price > state.money);
  const rate = incomeRate(state, ctx);
  const pending = pendingIncome(state, ctx, now);
  const pay = Math.round(itemPayBoost(state, ctx) * 100);
  const xp = Math.round(itemXpBoost(state, ctx) * 100);
  const bonuses = [pay ? t("ui.shop.effect.pay", { n: pay }) : "", xp ? t("ui.shop.effect.xp", { n: xp }) : ""].filter(Boolean);

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold">{t("ui.shop.title")}</h2>
      <p className="mt-1 text-sm text-muted">{t("ui.shop.sub")}</p>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {goal && (
          <div className="rounded-xl border border-gold/40 bg-gold/5 p-4">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="text-muted">{t("ui.shop.goal")}</span>
              <span className="font-mono text-gold">{state.money.toLocaleString("ru-RU")} / {goal.price.toLocaleString("ru-RU")} ₵</span>
            </div>
            <p className="mt-1 font-semibold">{goal.icon} {t(goal.nameKey)}</p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-line/60">
              <div className="h-full rounded-full bg-gradient-to-r from-gold to-ok" style={{ width: `${Math.min(100, (state.money / goal.price) * 100)}%` }} />
            </div>
            <p className="mt-1.5 text-xs text-muted">{t("ui.shop.goalLeft", { n: goal.price - state.money })}</p>
          </div>
        )}
        {rate > 0 && (
          <div className="rounded-xl border border-ok/40 bg-ok/5 p-4">
            <p className="text-sm leading-snug text-muted">{t("ui.shop.income", { rate })}</p>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="font-mono text-lg font-bold text-ok">{t("ui.shop.incomePending", { n: pending })}</span>
              <button
                disabled={pending < 1}
                onClick={() => dispatch({ type: "collectIncome", now: Date.now() })}
                className="rounded-lg bg-ok px-3.5 py-1.5 text-sm font-semibold text-bg enabled:hover:brightness-110 disabled:opacity-40"
              >
                {t("ui.shop.collect")}
              </button>
            </div>
          </div>
        )}
      </div>
      {bonuses.length > 0 && <p className="mt-3 text-sm text-ok">{t("ui.shop.bonuses", { list: bonuses.join(", ") })}</p>}

      {CATEGORIES.map((cat) => {
        const items = visible.filter((i) => (i.category ?? "comfort") === cat);
        if (items.length === 0) return null;
        return (
          <section key={cat} className="mt-6">
            <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-ai">{t(`ui.shop.cat.${cat}`)}</h3>
            <ul className="mt-2 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((item) => {
                const owned = has(item.id);
                const locked = !open(item);
                const forQuest = item.requiresQuest && state.quests[item.requiresQuest]?.status === "active";
                const afford = state.money >= item.price;
                const effects = [
                  item.payBoost ? t("ui.shop.effect.pay", { n: Math.round(item.payBoost * 100) }) : "",
                  item.xpBoost ? t("ui.shop.effect.xp", { n: Math.round(item.xpBoost * 100) }) : "",
                  item.incomePerHour ? t("ui.shop.effect.income", { n: item.incomePerHour }) : "",
                  item.rep ? t("ui.shop.effect.rep", { n: item.rep }) : "",
                ].filter(Boolean);
                const need = item.requiresItem ? content.items.find((i) => i.id === item.requiresItem) : undefined;
                return (
                  <li
                    key={item.id}
                    className={`flex flex-col rounded-xl border p-4 ${locked ? "border-dashed border-line opacity-60" : forQuest && !owned ? "border-ok/60 bg-ok/5 shadow-[0_0_24px_-10px_var(--color-ok)]" : owned ? "border-line bg-surface-2/30" : "border-line bg-surface-2/60"}`}
                  >
                    <h4 className="flex items-start gap-2 font-semibold leading-snug">
                      {item.icon && <span aria-hidden className="shrink-0">{item.icon}</span>}
                      <span className="min-w-0">{t(item.nameKey)}</span>
                      {forQuest && !owned && <span className="shrink-0 rounded-full bg-ok/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ok">{t("ui.shop.forQuest")}</span>}
                    </h4>
                    <p className="mt-1 flex-1 text-sm leading-snug text-muted">{t(item.descKey)}</p>
                    {effects.length > 0 && (
                      <ul className="mt-2 flex flex-wrap gap-1.5">
                        {effects.map((e) => <li key={e} className="rounded-full border border-ok/30 bg-ok/10 px-2 py-0.5 text-xs font-semibold text-ok">{e}</li>)}
                      </ul>
                    )}
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span className="whitespace-nowrap font-mono font-semibold text-gold">{t("ui.shop.price", { price: item.price.toLocaleString("ru-RU") })}</span>
                      {owned ? (
                        <span className="text-sm text-ok">✓ {t("ui.shop.owned")}</span>
                      ) : locked ? (
                        <span className="text-right text-xs text-muted">🔒 {t("ui.shop.needFirst", { name: need ? t(need.nameKey) : "" })}</span>
                      ) : (
                        <button
                          disabled={!afford}
                          onClick={() => dispatch({ type: "buy", itemId: item.id, now: Date.now() })}
                          className="rounded-lg bg-ai px-3.5 py-1.5 text-sm font-semibold text-white enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                          title={afford ? undefined : t("err.noMoney")}
                        >
                          {t("ui.shop.buy")}
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

export function Skills({ game, state }: { game: GameApi; state: GameState }) {
  const { t } = game;
  const boost = Math.round(skillPayBoost(state, ctxOf(game)) * 100);
  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold">{t("ui.skills.title")}</h2>
      <p className="mt-1 text-sm text-muted">{t("ui.skills.payHint", { step: 5 })}</p>
      <p className="mt-2 inline-block rounded-full bg-gold/15 px-3 py-1 text-sm font-semibold text-gold">💰 {t("ui.skills.payNow", { n: boost })}</p>
      <ul className="mt-4 space-y-3">
        {content.skills.map((s) => {
          const uses = state.skills[s.id];
          const level = skillLevel(uses, s.levels);
          const next = s.levels[level];
          return (
            <li key={s.id} className="rounded-xl border border-line bg-surface-2/60 p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{t(s.nameKey)}</h3>
                <span className={level > 0 ? "text-ok" : "text-muted"}>{t("ui.skills.level", { level })}</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded bg-bg">
                <div className="h-full rounded bg-ai" style={{ width: `${next ? Math.min(100, (uses / next) * 100) : 100}%` }} />
              </div>
              <p className="mt-1 text-xs text-muted">{t("ui.skills.uses", { n: uses })}{next ? ` / ${next}` : ""}</p>
            </li>
          );
        })}
      </ul>
      <h3 className="mt-6 text-sm font-semibold text-muted">🔒 {t("ui.skills.lockedTitle")}</h3>
      <ul className="mt-2 grid gap-2 sm:grid-cols-2">
        {(["creative", "automation", "dev", "business"] as const).map((b) => (
          <li key={b} className="rounded-xl border border-dashed border-line p-3 text-sm text-muted">
            {t(`ui.skills.branch.${b}`)}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Journal({ game, state }: { game: GameApi; state: GameState }) {
  const { t } = game;
  const done = content.quests.filter((q) => state.quests[q.id]?.status === "done");
  const lessons = content.lessons.filter((l) => state.lessons.includes(l.id));
  const terms = content.glossary.filter((g) => state.quests[g.questId]);
  return (
    <div className="grid gap-6 p-4 md:grid-cols-3">
      <section className="md:col-span-2">
        <h2 className="font-semibold">📘 {t("ui.journal.lessons")}</h2>
        {lessons.length === 0 && <p className="mt-2 text-sm text-muted">{t("ui.journal.noLessons")}</p>}
        <ul className="mt-2 space-y-2">
          {lessons.map((l, i) => (
            <li key={l.id}>
              <details className="group rounded-xl border border-line bg-surface-2/50 p-3">
                <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ok/15 text-xs text-ok">{i + 1}</span>
                  {t(l.titleKey)}
                  <span className="ml-auto text-muted transition group-open:rotate-90">›</span>
                </summary>
                <div className="mt-2 space-y-2 text-sm leading-relaxed text-ink/90">
                  {l.bodyKeys.map((k) => <p key={k}>{t(k)}</p>)}
                  {l.goodKey && <p className="rounded-lg border border-ok/30 bg-ok/5 p-2 font-mono text-[13px]">✓ {t(l.goodKey)}</p>}
                  <p className="font-semibold text-ok">{t(l.takeawayKey)}</p>
                </div>
              </details>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="font-semibold">{t("ui.journal.glossary")}</h2>
        <dl className="mt-2 space-y-2.5 text-sm">
          {terms.map((g) => (
            <div key={g.id}>
              <dt className="font-semibold text-ai">{t(g.termKey)}</dt>
              <dd className="leading-snug text-ink/85">{t(g.defKey)}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section>
        <h2 className="font-semibold">{t("ui.journal.achievements")}</h2>
        {state.achievements.length === 0 && <p className="mt-2 text-sm text-muted">{t("ui.journal.noAch")}</p>}
        <ul className="mt-2 space-y-2">
          {state.achievements.map((a) => (
            <li key={a} className="flex items-center gap-2 rounded-lg bg-gold/10 px-3 py-2 text-sm text-gold">★ {t(`ach.${a}`)}</li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="font-semibold">{t("ui.journal.quests")}</h2>
        <ul className="mt-2 space-y-1.5 text-sm">
          {done.map((q) => (
            <li key={q.id} className="flex justify-between gap-2">
              <span>✓ {t(q.titleKey)}</span>
              {state.quests[q.id]!.bestQuality > 0 && <span className="text-muted">{Math.round(state.quests[q.id]!.bestQuality * 100)}%</span>}
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="font-semibold">{t("ui.journal.ledger")}</h2>
        <ul className="mt-2 space-y-1.5 font-mono text-sm">
          {state.ledger.map((e) => (
            <li key={e.key} className="flex justify-between gap-2">
              <span className="truncate font-sans">{t(e.reasonKey)}</span>
              <span className={e.delta > 0 ? "text-ok" : "text-bad"}>{e.delta > 0 ? "+" : ""}{e.delta} ₵</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/** Звёзды за заказ: ★★★ от 95%, ★★ от 85%. */
export function Stars({ n, className = "" }: { n: number; className?: string }) {
  return (
    <span className={`font-mono tracking-wider text-gold ${className}`} aria-label={`${n} из 3`}>
      {"★".repeat(n)}
      <span className="text-muted/40">{"★".repeat(3 - n)}</span>
    </span>
  );
}

/** Плашка срочного заказа в самом задании: пока нет ошибок — ×2, после ошибки — обычная оплата. */
export function RushNote({ game, state, questId }: { game: GameApi; state: GameState; questId: string }) {
  const quest = content.quests.find((q) => q.id === questId);
  const progress = state.quests[questId];
  if (!quest || !progress || progress.status !== "active" || state.rush?.questId !== questId) return null;
  const on = cleanRun(quest, progress.attempts);
  return (
    <p className={`mt-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold leading-snug ${on ? "rush-card bg-bad/10 text-bad" : "bg-surface text-muted"}`}>
      {on ? `${game.t("ui.rush.badge")} · ${game.t("ui.rush.rule")}` : game.t("ui.rush.missed")}
    </p>
  );
}

/** Звёзды в итоге заказа и подсказка, как получить три. */
export function ResultStars({ game, quality }: { game: GameApi; quality: number }) {
  const n = starsFor(quality);
  return (
    <span className="flex items-center gap-2">
      <Stars n={n} className="text-lg" />
      {n < 3 && <span className="text-xs text-muted">{game.t("ui.stars.how")}</span>}
    </span>
  );
}

/** Дата игрока YYYY-MM-DD: от неё зависит набор заказов дня. */
export { todayKey };

/** Три заказа дня из уже знакомых: деньги, опыт, звёзды и серия, бонус за все три. */
function DailyOrders({ game, state, openNeira }: { game: GameApi; state: GameState; openNeira: () => void }) {
  const { t, dispatch } = game;
  const day = todayKey();
  const list = dailyFor(state, content, day);
  const done = state.daily?.day === day ? state.daily.done : [];
  if (list.length === 0) return null;
  const all = list.every((q) => done.includes(q.id));
  return (
    <section className="daily-card mt-4 rounded-2xl border border-ai/40 bg-gradient-to-br from-ai/10 via-surface-2/60 to-ok/10 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-base font-bold">📅 {t("ui.daily.title")}</h3>
        <span className={`rounded-full px-2.5 py-0.5 font-mono text-xs font-semibold ${all ? "bg-ok/20 text-ok" : "bg-ai/15 text-ai"}`}>{t("ui.daily.progress", { n: done.length, total: DAILY_COUNT })}</span>
      </div>
      <p className="mt-1 text-xs leading-snug text-muted">{all ? t("ui.daily.allDone") : t("ui.daily.sub", { money: DAILY_BONUS.money, xp: DAILY_BONUS.xp })}</p>
      <ul className="mt-3 grid gap-2 sm:grid-cols-3">
        {list.map((q) => {
          const p = state.quests[q.id]!;
          const isDone = done.includes(q.id);
          const active = p.status === "active" && p.daily === day;
          const from = q.offer.type === "auto" ? null : q.offer.from;
          return (
            <li key={q.id} className={`flex flex-col rounded-xl border p-3 ${isDone ? "border-ok/40 bg-ok/5" : "border-line bg-surface/80"}`}>
              <span className="text-[10px] font-bold uppercase tracking-wider text-ai">{q.kind === "classify" ? "🔎" : "✍️"} {t("ui.daily.badge")}</span>
              <span className="mt-1 text-sm font-semibold leading-snug">{t(q.titleKey)}</span>
              {from && <span className="text-xs text-muted">{t(`npc.${from}`).split(",")[0]}</span>}
              <span className="mt-1 flex items-center gap-1.5 text-xs text-muted">{t("ui.daily.best")}: <Stars n={starsFor(p.bestQuality)} /></span>
              <div className="mt-auto pt-2.5">
                {isDone ? (
                  <span className="text-sm font-semibold text-ok">{t("ui.daily.done")}</span>
                ) : active ? (
                  <button onClick={openNeira} className="w-full rounded-lg border border-ai px-3 py-1.5 text-sm font-semibold text-ai hover:bg-ai/10">{t("ui.orders.open")}</button>
                ) : (
                  <button
                    onClick={() => {
                      const ev = dispatch({ type: "startDaily", questId: q.id, day });
                      if (!ev.some((e) => e.type === "rejected")) openNeira();
                    }}
                    className="w-full rounded-lg bg-ai px-3 py-1.5 text-sm font-semibold text-white hover:brightness-110"
                  >
                    {t("ui.daily.take")}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
