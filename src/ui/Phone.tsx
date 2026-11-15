"use client";

import { useEffect, useRef } from "react";
import type { GameState, NpcId } from "@/core/types";
import type { GameApi } from "./useGame";

const AVATAR_COLOR: Record<NpcId, string> = {
  dima: "#4f8cff",
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
}: {
  game: GameApi;
  state: GameState;
  chat: NpcId | null;
  setChat: (n: NpcId | null) => void;
  onAccepted: (questId: string) => void;
}) {
  const { t, dispatch } = game;
  const npcs: NpcId[] = [];
  for (const m of [...state.messages].reverse()) if (!npcs.includes(m.npc)) npcs.push(m.npc);
  const open = chat && npcs.includes(chat) ? chat : null;
  const endRef = useRef<HTMLDivElement>(null);
  const thread = open ? state.messages.filter((m) => m.npc === open) : [];

  useEffect(() => {
    if (open && state.unread.includes(open)) dispatch({ type: "readChat", npc: open });
  }, [open, state.unread, dispatch]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [thread.length, open]);

  return (
    <section aria-label={t("ui.phone.title")} className="flex h-full min-h-0 flex-col overflow-hidden rounded-[28px] border-4 border-[#1f2940] bg-[#0c1324] shadow-2xl">
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        {open && (
          <button onClick={() => setChat(null)} className="rounded-md px-1.5 text-lg text-muted hover:text-ink" aria-label={t("ui.back")}>
            ‹
          </button>
        )}
        <h2 className="font-semibold">{open ? t(`npc.${open}`) : t("ui.phone.title")}</h2>
      </div>

      {!open && (
        <ul className="flex-1 overflow-y-auto">
          {npcs.length === 0 && <li className="p-4 text-sm text-muted">{t("ui.phone.empty")}</li>}
          {npcs.map((npc) => {
            const last = [...state.messages].reverse().find((m) => m.npc === npc)!;
            const unread = state.unread.includes(npc);
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
                  {unread && <span className="h-2.5 w-2.5 rounded-full bg-bad" aria-label="непрочитано" />}
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
          <div ref={endRef} />
        </div>
      )}
    </section>
  );
}
