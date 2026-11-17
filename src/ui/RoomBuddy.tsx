"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { content } from "@/content";
import { currentGoal, dailyFor, pendingIncome } from "@/core/engine";
import type { GameState } from "@/core/types";
import { Mascot, type MascotMood, type MascotPose } from "./Mascot";
import { todayKey } from "./Apps";

type T = (key: string, vars?: Record<string, string | number>) => string;
export type BuddyAction = "goal" | "phone" | "orders" | "shop";
type Tip = { text: string; action?: BuddyAction; label?: string; pose: MascotPose; mood: MascotMood };

/** Точки, куда ходит робот (left в % от ширины комнаты). Поза — что он делает на месте. */
const SPOTS: { left: number; pose: MascotPose }[] = [
  { left: 30, pose: "idle" }, // перед столом
  { left: 15, pose: "point" }, // у доски целей
  { left: 82, pose: "wave" }, // у окна и растения
  { left: 48, pose: "idle" },
  { left: 66, pose: "point" },
];

/** Что сказать сейчас: сначала важное (сообщения, цель), потом деньги, заказы дня и советы по промптам. */
function tipsFor(state: GameState, t: T): Tip[] {
  const tips: Tip[] = [];
  if (state.unread.length > 0) {
    const name = t(`npc.${state.unread[0]}`).split(",")[0]!;
    tips.push({ text: t("buddy.unread", { name, n: state.unread.length }), action: "phone", label: t("buddy.go.phone"), pose: "point", mood: "happy" });
  }
  const goal = currentGoal(state, content);
  if (goal.textKey !== content.finalGoalKey && !goal.school) tips.push({ text: t("buddy.goal", { goal: t(goal.textKey) }), action: "goal", label: t("buddy.go.goal"), pose: "point", mood: "idle" });
  const daily = dailyFor(state, content, todayKey());
  const done = state.daily?.day === todayKey() ? state.daily.done.length : 0;
  if (daily.length > 0 && done < daily.length) tips.push({ text: t("buddy.daily", { n: daily.length - done }), action: "orders", label: t("buddy.go.orders"), pose: "wave", mood: "happy" });
  const income = pendingIncome(state, { content, t }, Date.now());
  if (income >= 50) tips.push({ text: t("buddy.income", { n: income }), action: "shop", label: t("buddy.go.shop"), pose: "cheer", mood: "happy" });
  const affordable = content.items
    .filter((i) => !state.inventory.includes(i.id) && i.price <= state.money && (!i.requiresItem || state.inventory.includes(i.requiresItem)) && (!i.requiresQuest || state.quests[i.requiresQuest]))
    .sort((a, b) => b.price - a.price)[0];
  if (affordable && state.apps.includes("shop")) tips.push({ text: t("buddy.shop", { item: t(affordable.nameKey) }), action: "shop", label: t("buddy.go.shop"), pose: "point", mood: "happy" });
  if ((state.streak ?? 0) >= 2) tips.push({ text: t("buddy.streak", { n: state.streak ?? 0 }), pose: "cheer", mood: "happy" });
  for (let i = 1; i <= 10; i++) tips.push({ text: t(`buddy.tip.${i}`), pose: i % 2 ? "idle" : "wave", mood: i % 3 ? "idle" : "think" });
  return tips;
}

/**
 * Живой ТАКТ AI в комнате: ходит между точками, машет, показывает на цель,
 * говорит подсказки в облачке и радуется наградам. Нажми на него — следующая подсказка.
 */
export function RoomBuddy({ state, t, motion, onAction, compact }: { state: GameState; t: T; motion: boolean; onAction: (a: BuddyAction) => void; compact: boolean }) {
  const tips = useMemo(() => tipsFor(state, t), [state, t]);
  const [spot, setSpot] = useState(0);
  const [walking, setWalking] = useState(false);
  const [facing, setFacing] = useState<1 | -1>(1);
  const [tipIndex, setTipIndex] = useState(0);
  const [bubble, setBubble] = useState(true);
  const [joy, setJoy] = useState(false);
  const lastXp = useRef(state.xp);
  const urgent = tips[0]?.action === "phone" || tips[0]?.action === "goal";

  // Награда: робот подпрыгивает и радуется.
  useEffect(() => {
    if (state.xp > lastXp.current) {
      setJoy(true);
      const id = window.setTimeout(() => setJoy(false), 3200);
      lastXp.current = state.xp;
      return () => window.clearTimeout(id);
    }
    lastXp.current = state.xp;
  }, [state.xp]);

  // Цикл: постоял с облачком → облачко прячется → идёт к следующей точке → новая подсказка.
  useEffect(() => {
    if (!motion) return;
    let alive = true;
    const timers: number[] = [];
    const later = (ms: number, fn: () => void) => timers.push(window.setTimeout(() => alive && fn(), ms));
    const loop = () => {
      later(7000, () => {
        setBubble(false);
        later(600, () => {
          setSpot((s) => {
            const next = (s + 1) % SPOTS.length;
            setFacing(SPOTS[next]!.left >= SPOTS[s]!.left ? 1 : -1);
            return next;
          });
          setWalking(true);
          later(2600, () => {
            setWalking(false);
            // Важное (сообщение, цель) повторяем через раз, между ними — советы.
            setTipIndex((i) => i + 1);
            setBubble(true);
            loop();
          });
        });
      });
    };
    loop();
    return () => {
      alive = false;
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [motion]);

  const pick = urgent && tipIndex % 2 === 0 ? tips[0]! : tips[tipIndex % tips.length]!;
  const tip = joy ? { text: t("buddy.joy"), pose: "cheer" as MascotPose, mood: "happy" as MascotMood } : pick;
  const here = SPOTS[spot]!;
  const pose: MascotPose = joy ? "cheer" : walking ? "idle" : bubble ? tip.pose : here.pose;
  const mood: MascotMood = joy ? "happy" : walking ? "idle" : tip.mood;
  const left = here.left;
  const bubbleRight = left > 55; // облачко со стороны середины комнаты, чтобы не уходило за край

  return (
    <div className="pointer-events-none absolute inset-0 z-[5] overflow-hidden" aria-live="polite">
      <div
        className={`buddy absolute ${motion ? "buddy-move" : ""}`}
        style={{ left: `${left}%`, bottom: compact ? "3%" : "4%", height: compact ? "27%" : "21%" }}
      >
        {/* Облачко с подсказкой */}
        {(bubble || joy) && !walking && (
          <div
            className={`buddy-bubble pointer-events-auto absolute bottom-[92%] ${compact ? "w-[min(210px,58vw)] p-2.5 text-[12px]" : "w-[min(260px,62vw)] p-3 text-[13px]"} rounded-2xl border border-ai/50 bg-surface/95 text-left leading-snug text-ink shadow-2xl shadow-ai/30 backdrop-blur ${bubbleRight ? "right-[40%]" : "left-[40%]"}`}
            key={`${tipIndex}:${joy}`}
          >
            <p className="mb-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-ai">ТАКТ AI</p>
            <p>{tip.text}</p>
            {"action" in tip && tip.action && (
              <button onClick={() => onAction(tip.action!)} className="mt-2 rounded-lg bg-ai px-3 py-1 text-xs font-semibold text-white hover:brightness-110">
                {tip.label} →
              </button>
            )}
          </div>
        )}
        <button
          type="button"
          onClick={() => {
            setBubble(true);
            setTipIndex((i) => i + 1);
          }}
          aria-label={t("buddy.click")}
          title={t("buddy.click")}
          className={`pointer-events-auto relative block h-full -translate-x-1/2 ${walking ? "buddy-walk" : ""} ${joy ? "buddy-joy" : ""}`}
          style={{ transform: `translateX(-50%) scaleX(${facing})` }}
        >
          <Mascot pose={pose} mood={mood} className="h-full" float={!walking && motion} />
          <span className="buddy-shadow absolute bottom-[-2%] left-1/2 h-[5%] w-[60%] -translate-x-1/2 rounded-[50%] bg-black/40 blur-[2px]" aria-hidden />
        </button>
      </div>
    </div>
  );
}
