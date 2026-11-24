"use client";

import { useEffect, useRef, useState } from "react";
import type { GameState, NpcId } from "@/core/types";
import type { GameApi } from "./useGame";
import { TaktLogo } from "./Mascot";

export const AVATAR_COLOR: Record<NpcId, string> = {
  dima: "#4f8cff",
  boris: "#fb923c",
  vera: "#f472b6",
  editor: "#38bdf8",
  anna: "#e9a35b",
  sergey: "#94a3b8",
  olga: "#a78bfa",
  alex: "#34d399",
  nick: "#f472b6",
  neira: "#2dd4bf",
  system: "#64748b",
};

export function Phone({
  game,
  state,
  chat,
  setChat,
  onAccepted,
  motion = true,
}: {
  game: GameApi;
  state: GameState;
  chat: NpcId | null;
  setChat: (n: NpcId | null) => void;
  onAccepted: (questId: string) => void;
  motion?: boolean;
}) {
  const { t, dispatch } = game;
  const npcs: NpcId[] = [];
  for (const m of [...state.messages].reverse()) if (!npcs.includes(m.npc)) npcs.push(m.npc);
  const open = chat && npcs.includes(chat) ? chat : null;
  const endRef = useRef<HTMLDivElement>(null);
  // Новые реплики в открытом чате появляются по одной, после «печатает…» — как в мессенджере.
  const [shownUpTo, setShownUpTo] = useState(() => state.messages.reduce((n, m) => Math.max(n, m.id), 0));
  const next = state.messages.find((m) => m.id > shownUpTo);
  const typing = !!(motion && next && next.from === "npc" && next.npc === open);
  useEffect(() => {
    if (!next) return;
    const delay = typing ? 700 + Math.min(t(next.textKey, next.vars).length * 10, 1100) : 0;
    const id = window.setTimeout(() => setShownUpTo(next.id), delay);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [next?.id, typing]);
  const thread = open ? state.messages.filter((m) => m.npc === open && m.id <= shownUpTo) : [];

  useEffect(() => {
    if (open && state.unread.includes(open)) dispatch({ type: "readChat", npc: open });
  }, [open, state.unread, dispatch]);

  useEffect(() => {
    // Прокручиваем только ленту чата: scrollIntoView двигал бы и всю страницу (на компьютере телефон
    // стоит рядом с ноутбуком, и страница «уплывала» вниз при каждом новом сообщении).
    const box = endRef.current?.parentElement;
    if (box) box.scrollTop = box.scrollHeight;
  }, [thread.length, open, typing]);

  return (
    <section aria-label={t("ui.phone.title")} className="flex h-full min-h-0 flex-col overflow-hidden rounded-[28px] border-4 border-[#28224a] bg-[#0e0c20] shadow-2xl">
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        {open && (
          <button onClick={() => setChat(null)} className="rounded-md px-1.5 text-lg text-muted hover:text-ink" aria-label={t("ui.back")}>
            ‹
          </button>
        )}
        <h2 className="font-semibold">{open ? t(`npc.${open}`) : t("ui.phone.title")}</h2>
        {!open && state.unread.length > 0 && (
          <span className="app-badge rounded-full bg-bad px-2 py-0.5 text-xs font-bold text-white">{t("ui.phone.unread", { n: state.unread.length })}</span>
        )}
        {!open && (
          <span className="ml-auto flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-muted">
            <TaktLogo className="h-5" /> ТАКТ
          </span>
        )}
      </div>

      {!open && (
        <ul className="flex-1 overflow-y-auto">
          {state.unread[0] && (() => {
            const npc = state.unread[0]!;
            const last = [...state.messages].reverse().find((m) => m.npc === npc && m.from === "npc");
            return (
              <li className="px-3 pt-3">
                <button onClick={() => setChat(npc)} className="phone-notice flex w-full items-start gap-3 rounded-2xl bg-white/95 p-3 text-left text-[#1b1530] shadow-lg shadow-ai/30">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full font-bold text-bg" style={{ background: AVATAR_COLOR[npc] }}>{t(`npc.${npc}`).slice(0, 1)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-2">
                      <span className="truncate text-sm font-bold">{t(`npc.${npc}`)}</span>
                      <span className="ml-auto shrink-0 text-[11px] text-[#6b6390]">{t("ui.push.now")}</span>
                    </span>
                    <span className="mt-0.5 line-clamp-2 text-[13px] leading-snug">{last ? t(last.textKey, last.vars) : ""}</span>
                  </span>
                </button>
              </li>
            );
          })()}
          {npcs.length === 0 && <li className="p-4 text-sm text-muted">{t("ui.phone.empty")}</li>}
          {npcs.filter((npc) => npc !== state.unread[0]).map((npc) => {
            const last = [...state.messages].reverse().find((m) => m.npc === npc)!;
            const unread = state.unread.includes(npc);
            const thread = state.messages.filter((m) => m.npc === npc);
            const tail = thread[thread.length - 1];
            const waiting = !!tail?.choices || (!!tail?.offerQuest && state.quests[tail.offerQuest]?.status === "available");
            return (
              <li key={npc}>
                <button onClick={() => setChat(npc)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full font-bold text-bg" style={{ background: AVATAR_COLOR[npc] }}>
                    {t(`npc.${npc}`).slice(0, 1)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{t(`npc.${npc}`)}</span>
                    <span className="block truncate text-sm text-muted">{t(last.textKey, last.vars)}</span>
                  </span>
                  {waiting && <span className="shrink-0 rounded-full bg-gold/15 px-2 py-0.5 text-[11px] font-semibold text-gold">{t(tail?.offerQuest ? "ui.phone.offer" : "ui.phone.waiting")}</span>}
                  {unread && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-bad" aria-label="непрочитано" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {open && (
        <div className="flex-1 space-y-2.5 overflow-y-auto px-3 py-4">
          {thread.map((m) => (
            <div key={m.id} className={`anim-rise flex flex-col ${m.from === "player" ? "items-end" : "items-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-[15px] leading-snug ${m.from === "player" ? "rounded-br-sm bg-ai text-white" : "rounded-bl-sm bg-surface-2"}`}>
                {t(m.textKey, m.vars)}
              </div>
              {m.choices && (
                <div className="mt-2 flex w-full flex-col items-end gap-1.5">
                  {m.choices.options.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => dispatch({ type: "choose", questId: m.choices!.questId, choiceId: c.id })}
                      className="rounded-2xl border border-ai/60 px-3.5 py-2 text-left text-[15px] text-ai hover:bg-ai/10"
                    >
                      {t(c.textKey)}
                    </button>
                  ))}
                </div>
              )}
              {m.offerQuest && state.quests[m.offerQuest]?.status === "available" && (
                <button
                  onClick={() => {
                    dispatch({ type: "acceptQuest", questId: m.offerQuest! });
                    onAccepted(m.offerQuest!);
                  }}
                  className="mt-2 rounded-xl bg-gold px-4 py-2 font-semibold text-bg hover:brightness-110"
                >
                  {t("ui.phone.accept")}
                </button>
              )}
            </div>
          ))}
          {typing && (
            <div className="anim-rise flex items-start" aria-label={t("ui.phone.typing")}>
              <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm bg-surface-2 px-3.5 py-2.5 text-sm text-muted">
                {t("ui.phone.typing")}
                <span className="neira-dots" aria-hidden><i>.</i><i>.</i><i>.</i></span>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
      )}
    </section>
  );
}
