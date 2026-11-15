import { content } from "@/content";
import type { AppId, GameState, NpcId, QuestDef } from "@/core/types";

export type View = "room" | "laptop" | "phone";
export interface Target {
  view: View;
  app?: AppId;
  chat?: NpcId;
}

/** Куда вести игрока по кнопке «Перейти» у текущей цели. */
export function goalTarget(state: GameState): Target {
  const quests = content.quests;
  const status = (q: QuestDef) => state.quests[q.id]?.status;
  const active = quests.find((q) => status(q) === "active");
  if (active) {
    if (active.kind === "dialog") return { view: "phone", chat: active.npc };
    if (active.kind === "purchase") return { view: "laptop", app: "shop" };
    return { view: "laptop", app: "neira" };
  }
  const available = quests.find((q) => status(q) === "available");
  if (available) {
    if (available.offer.type === "board") return { view: "laptop", app: "orders" };
    if (available.offer.type === "message") return { view: "phone", chat: available.offer.from };
  }
  return { view: "room" };
}

export function activePromptQuest(state: GameState) {
  return content.quests.find((q) => q.kind === "prompt" && state.quests[q.id]?.status === "active") as
    | Extract<QuestDef, { kind: "prompt" }>
    | undefined;
}

export function activeClassifyQuest(state: GameState) {
  return content.quests.find((q) => q.kind === "classify" && state.quests[q.id]?.status === "active") as
    | Extract<QuestDef, { kind: "classify" }>
    | undefined;
}
