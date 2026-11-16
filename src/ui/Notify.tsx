"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatMessage, GameState, NpcId } from "@/core/types";
import { AVATAR_COLOR } from "./Phone";
import type { GameApi } from "./useGame";

const SHOW_MS = 5200;
const ARRIVE_MS = 2600;

/**
 * Пуш-уведомление о новом сообщении: выезжает сверху, как на настоящем телефоне,
 * и прячется само. По нажатию открывает чат. Старые сообщения при загрузке не показываются.
 */
export function PushBanner({
  game,
  state,
  openChat,
  suppress,
}: {
  game: GameApi;
  state: GameState;
  openChat: (npc: NpcId) => void;
  /** Чат с этим персонажем уже открыт и виден — уведомление не нужно. */
  suppress: NpcId | null;
}) {
  const { t } = game;
  const seen = useRef<number | null>(null);
  const [queue, setQueue] = useState<ChatMessage[]>([]);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const maxId = state.messages.reduce((n, m) => Math.max(n, m.id), 0);
    if (seen.current === null) {
      seen.current = maxId;
      return;
    }
    const fresh = state.messages.filter((m) => m.id > seen.current! && m.from === "npc" && m.npc !== suppress);
    seen.current = maxId;
    if (fresh.length === 0) return;
    // Несколько сообщений от одного персонажа — одно уведомление с последним текстом.
    setQueue((q) => {
      const next = [...q];
      for (const m of fresh) {
        const i = next.findIndex((x) => x.npc === m.npc);
        if (i >= 0) next[i] = m;
        else next.push(m);
      }
      return next;
    });
  }, [state.messages, suppress]);

  const current = queue[0];
  // Пауза перед показом: сообщение «приходит» после ответа ТАКТ ИИ, а не одновременно с действием игрока.
  const [ready, setReady] = useState<number | null>(null);
  useEffect(() => {
    if (!current) return;
    setLeaving(false);
    const z = window.setTimeout(() => setReady(current.id), ARRIVE_MS);
    const a = window.setTimeout(() => setLeaving(true), ARRIVE_MS + SHOW_MS - 350);
    const b = window.setTimeout(() => setQueue((q) => q.slice(1)), ARRIVE_MS + SHOW_MS);
    return () => {
      window.clearTimeout(z);
      window.clearTimeout(a);
      window.clearTimeout(b);
    };
  }, [current]);

  if (!current || ready !== current.id) return null;
  const more = queue.length - 1;
  const name = t(`npc.${current.npc}`);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-2 z-[60] flex justify-center px-3" aria-live="polite">
      <button
        key={current.id}
        onClick={() => {
          openChat(current.npc);
          setQueue([]);
        }}
        className={`push-banner pointer-events-auto relative flex w-full max-w-md items-center gap-3 rounded-2xl border border-white/10 bg-surface/95 p-3 text-left shadow-2xl shadow-black/50 backdrop-blur-md ${leaving ? "push-out" : ""}`}
      >
        <span className="push-avatar relative grid h-11 w-11 shrink-0 place-items-center rounded-full text-lg font-bold text-bg" style={{ background: AVATAR_COLOR[current.npc] }}>
          {name.slice(0, 1)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2">
            <span className="truncate font-semibold">{name}</span>
            <span className="ml-auto shrink-0 font-mono text-[10px] uppercase tracking-widest text-muted">{t("ui.push.now")}</span>
          </span>
          <span className="line-clamp-2 text-sm leading-snug text-ink/80">{t(current.textKey, current.vars)}</span>
          {(current.offerQuest || current.choices) && (
            <span className="mt-1 inline-block rounded-full bg-gold/15 px-2 py-0.5 text-[11px] font-semibold text-gold">
              {current.offerQuest ? t("ui.push.offer") : t("ui.push.reply")}
            </span>
          )}
        </span>
        {more > 0 && <span className="grid h-6 min-w-6 place-items-center rounded-full bg-bad px-1.5 text-xs font-bold text-white">+{more}</span>}
        <span className="push-timer absolute inset-x-4 bottom-1 h-0.5 rounded-full bg-ai/60" style={{ animationDuration: `${SHOW_MS}ms` }} aria-hidden />
      </button>
    </div>
  );
}
