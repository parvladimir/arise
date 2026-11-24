import { content } from "@/content";
import { currentGoal, DAILY_COUNT } from "@/core/engine";
import type { AppId, GameState, NpcId, QuestDef } from "@/core/types";

export type View = "room" | "laptop" | "phone";
export interface Target {
  view: View;
  app?: AppId;
  chat?: NpcId;
}

/** Куда вести игрока по кнопке «Перейти» у текущей цели. */
/** Сегодняшняя дата по часам игрока: по ней выдаются заказы дня. */
export function todayKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Сюжет пройден и все заказы дня уже сданы: подсвечивать ноутбук «Новым заказом» незачем. */
export function nothingToDoToday(state: GameState): boolean {
  const goal = currentGoal(state, content);
  return goal.textKey === content.finalGoalKey && state.daily?.day === todayKey() && state.daily.done.length >= DAILY_COUNT;
}

export function goalTarget(state: GameState): Target {
  const goal = currentGoal(state, content);
  if (goal.school) return { view: "laptop", app: "school" };
  // Сюжет пройден — цель ведёт к заказам дня.
  if (goal.textKey === content.finalGoalKey) return { view: "laptop", app: "orders" };
  const id = goal.questId;
  const q = id ? content.quests.find((x) => x.id === id) : undefined;
  if (!q) return { view: "room" };
  const status = state.quests[q.id]?.status;
  if (status === "active") {
    if (q.kind === "dialog") return { view: "phone", chat: q.npc };
    if (q.kind === "purchase") return { view: "laptop", app: "shop" };
    return { view: "laptop", app: "neira" };
  }
  if (q.kind === "dialog") return { view: "phone", chat: q.npc };
  if (q.offer.type === "board") return { view: "laptop", app: "orders" };
  if (q.offer.type === "message") return { view: "phone", chat: q.offer.from };
  if (q.kind === "purchase") return { view: "laptop", app: "shop" };
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
