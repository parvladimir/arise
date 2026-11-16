"use client";

import { content } from "@/content";
import { boardQuests } from "@/core/engine";
import { basePay, skillLevel } from "@/core/economy";
import type { GameState } from "@/core/types";
import type { GameApi } from "./useGame";

export function Orders({ game, state, openNeira }: { game: GameApi; state: GameState; openNeira: () => void }) {
  const { t, dispatch } = game;
  const list = [
    ...content.quests.filter((q) => (q.kind === "prompt" || q.kind === "classify") && q.offer.type !== "board" && state.quests[q.id]?.status === "active"),
    ...boardQuests(state, content),
  ];
  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold">{t("ui.orders.title")}</h2>
      {list.length === 0 && <p className="mt-4 text-sm text-muted">{t("ui.orders.empty")}</p>}
      <ul className="mt-4 space-y-3">
        {list.map((q) => {
          const status = state.quests[q.id]!.status;
          const from = q.offer.type === "auto" ? null : q.offer.from;
          const pay = q.reward.pay ? Math.round(basePay(q.stage) * q.reward.pay.complexity * q.reward.pay.client) : 0;
          return (
            <li key={q.id} className="anim-rise rounded-xl border border-line bg-surface-2/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 font-semibold">
                  {status === "available" && !q.repeatable && <span className="rounded-full bg-bad px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">{t("ui.orders.new")}</span>}
                  {q.repeatable && <span className="rounded-full bg-gold/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gold">{t("ui.orders.gig")}</span>}
                  {t(q.titleKey)}
                </h3>
                {pay > 0 && <span className="font-mono text-sm text-gold">{t("ui.orders.pay", { pay })}</span>}
              </div>
              {from && (
                <p className="mt-0.5 text-sm text-muted">
                  {t(`npc.${from}`)}
                  {q.repeatable && (state.quests[q.id]!.runs ?? 0) > 0 && <span className="ml-2 text-xs">· {t("ui.orders.runs", { n: state.quests[q.id]!.runs ?? 0 })}</span>}
                </p>
              )}
              {q.offer.type !== "auto" && <p className="mt-2 text-[15px] leading-snug">«{t(q.offer.textKey)}»</p>}
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
    </div>
  );
}

export function Shop({ game, state }: { game: GameApi; state: GameState }) {
  const { t, dispatch } = game;
  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold">{t("ui.shop.title")}</h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {content.items.filter((item) => !item.requiresQuest || state.quests[item.requiresQuest]).map((item) => {
          const owned = state.inventory.includes(item.id);
          const forQuest = item.requiresQuest && state.quests[item.requiresQuest]?.status === "active";
          const afford = state.money >= item.price;
          return (
            <li key={item.id} className={`anim-rise flex flex-col rounded-xl border p-4 ${forQuest && !owned ? "border-ok/60 bg-ok/5 shadow-[0_0_24px_-10px_var(--color-ok)]" : "border-line bg-surface-2/60"}`}>
              <h3 className="flex flex-wrap items-center gap-2 font-semibold">
                {t(item.nameKey)}
                {forQuest && !owned && <span className="rounded-full bg-ok/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ok">{t("ui.shop.forQuest")}</span>}
              </h3>
              <p className="mt-1 flex-1 text-sm leading-snug text-muted">{t(item.descKey)}</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="font-mono font-semibold text-gold">{t("ui.shop.price", { price: item.price })}</span>
                {owned ? (
                  <span className="text-sm text-ok">✓ {t("ui.shop.owned")}</span>
                ) : (
                  <button
                    disabled={!afford}
                    onClick={() => dispatch({ type: "buy", itemId: item.id })}
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
    </div>
  );
}

export function Skills({ game, state }: { game: GameApi; state: GameState }) {
  const { t } = game;
  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold">{t("ui.skills.title")}</h2>
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
      <p className="mt-4 text-sm text-muted">🔒 {t("ui.skills.lockedBranches")}</p>
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
