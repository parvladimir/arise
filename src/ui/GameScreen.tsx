"use client";

import { useEffect, useState } from "react";
import { content } from "@/content";
import { currentGoal } from "@/core/engine";
import type { AppId, GameState, NpcId } from "@/core/types";
import { Journal, Orders, Shop, Skills } from "./Apps";
import { boardQuests } from "@/core/engine";
import { activeClassifyQuest, activePromptQuest, goalTarget, type View } from "./nav";
import { ClassifyLab } from "./ClassifyLab";
import { LessonCard, lessonFor } from "./Learn";
import { Phone } from "./Phone";
import { PromptLab } from "./PromptLab";
import { Room, type RoomHints } from "./Room";
import { AVATAR_COLOR } from "./Phone";
import { Toasts } from "./Toasts";
import { MascotHead, TaktLogo } from "./Mascot";
import { PushBanner } from "./Notify";
import { DeskAlert, DeskTicker, DeskWidgets } from "./Desk";
import { TopBar } from "./TopBar";
import type { GameApi } from "./useGame";

const ALL_APPS: AppId[] = ["neira", "orders", "shop", "skills", "journal"];
const FUTURE_APPS = ["pixela", "flow", "code"] as const;
const APP_ICON: Record<AppId, string> = { neira: "◉", orders: "▤", shop: "◈", skills: "✦", journal: "☰" };
const APP_GRADIENT: Record<AppId, string> = {
  neira: "linear-gradient(135deg, #8b3dff, #00d4ff)",
  orders: "linear-gradient(135deg, #f5b544, #f97316)",
  shop: "linear-gradient(135deg, #f472b6, #a78bfa)",
  skills: "linear-gradient(135deg, #34d399, #0ea5e9)",
  journal: "linear-gradient(135deg, #64748b, #334155)",
};
const APP_GLOW: Record<AppId, string> = { neira: "#8b3dff", orders: "#f59e0b", shop: "#ec4899", skills: "#10b981", journal: "#475569" };

function useMotionPref(): [boolean, (v: boolean) => void] {
  const [motion, setMotionState] = useState(true);
  useEffect(() => {
    try {
      const v = window.localStorage.getItem("ai-rise.motion");
      if (v === "off") setMotionState(false);
      else if (v === null && window.matchMedia("(prefers-reduced-motion: reduce)").matches) setMotionState(false);
    } catch {
      /* ignore */
    }
  }, []);
  const setMotion = (v: boolean) => {
    setMotionState(v);
    try {
      window.localStorage.setItem("ai-rise.motion", v ? "on" : "off");
    } catch {
      /* ignore */
    }
  };
  return [motion, setMotion];
}

/** Узкий экран (телефон): комната показывается крупным планом стола. */
function useNarrow(): boolean {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const on = () => setNarrow(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return narrow;
}

export function GameScreen({ game, state }: { game: GameApi; state: GameState }) {
  const { t } = game;
  const [view, setView] = useState<View>("room");
  const [app, setApp] = useState<AppId | null>(null);
  const [chat, setChat] = useState<NpcId | null>(null);
  const [phonePulse, setPhonePulse] = useState(0);
  const [motion, setMotion] = useMotionPref();
  const narrow = useNarrow();
  const target = goalTarget(state);
  const highlight = target.view === "room" ? null : target.view;
  // Что нового — крупно над ноутбуком и телефоном в комнате
  const roomHints: RoomHints = {};
  const noticeNpc = state.unread[0] ?? (target.view === "phone" ? target.chat : undefined);
  if (noticeNpc) {
    const last = [...state.messages].reverse().find((m) => m.npc === noticeNpc && m.from === "npc");
    const name = t(`npc.${noticeNpc}`).split(",")[0]!;
    roomHints.phone = {
      npc: noticeNpc,
      kicker: state.unread.length > 1 ? t("ui.hint.messages", { n: state.unread.length }) : state.unread.length === 1 ? t("ui.hint.message") : t("ui.hint.waits", { name }),
      text: last ? t(last.textKey, last.vars) : "",
    };
  }
  if (target.view === "laptop") roomHints.laptop = t(target.app === "orders" ? "ui.hint.order" : target.app === "shop" ? "ui.hint.shop" : "ui.hint.task");

  const go = (v: View, a?: AppId | null, c?: NpcId) => {
    setView(v);
    if (a !== undefined) setApp(a);
    if (c) setChat(c);
  };
  const goToGoal = () => go(target.view, target.app ?? null, target.chat);

  // Телефон в комнате: открываем чат, куда ведёт цель, иначе непрочитанный, иначе последний.
  // На широком экране телефон и так виден справа, поэтому панель ещё и подсвечивается.
  const openPhone = () => {
    const last = state.messages[state.messages.length - 1]?.npc;
    const c = (target.view === "phone" ? target.chat : undefined) ?? state.unread[0] ?? last;
    go("phone", undefined, c);
    setPhonePulse((n) => n + 1);
  };
  useEffect(() => {
    if (!phonePulse) return;
    const id = window.setTimeout(() => setPhonePulse(0), 900);
    return () => window.clearTimeout(id);
  }, [phonePulse]);
  const openNeira = () => go("laptop", "neira");

  const laptop = (
    <Laptop game={game} state={state} app={app} setApp={setApp} motion={motion} onClose={() => go("room", null)} openNeira={openNeira} onFinished={() => go("room", null)} onGoal={goToGoal} openPhone={openPhone} />
  );
  const phone = <Phone game={game} state={state} chat={chat} setChat={setChat} onAccepted={() => openNeira()} motion={motion} />;
  // Чат виден, если телефон открыт: на широком экране он всегда сбоку, на узком — только на своём экране.
  const visibleChat = chat && (!narrow || view === "phone") ? chat : null;

  return (
    <div data-motion={motion ? "on" : "off"} className="flex h-dvh flex-col">
      <TopBar game={game} state={state} onGo={goToGoal} motion={motion} setMotion={setMotion} />

      <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 gap-4 p-3 pb-20 lg:p-4 lg:pb-4">
        {/* Основная сцена: комната или ноутбук */}
        <main className={`relative min-h-0 flex-1 ${view === "phone" ? "hidden lg:block" : ""}`}>
          <div className={`flex h-full flex-col gap-3 lg:block ${view === "laptop" ? "hidden lg:block" : ""}`}>
            <div className="aspect-[4/3] shrink-0 overflow-hidden rounded-2xl border border-line bg-surface lg:aspect-auto lg:h-full">
              <Room t={t} compact={narrow} state={state} highlight={highlight} hints={roomHints} open={(v) => (v === "phone" ? openPhone() : go(v, app))} />
            </div>
            {roomHints.phone && (
              <button
                onClick={openPhone}
                className="room-notice-card absolute inset-x-3 top-3 z-10 flex items-start gap-3 rounded-2xl bg-white/95 p-3 text-left text-[#1b1530] shadow-2xl shadow-ai/40 backdrop-blur sm:inset-x-auto sm:right-4 sm:w-[300px] lg:bottom-6 lg:right-6 lg:top-auto"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full font-bold text-bg" style={{ background: AVATAR_COLOR[roomHints.phone.npc] }}>{t(`npc.${roomHints.phone.npc}`).slice(0, 1)}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2">
                    <span className="truncate text-[11px] font-bold uppercase tracking-wide text-[#7c3aed]">📱 {roomHints.phone.kicker}</span>
                    <span className="ml-auto shrink-0 text-[11px] text-[#6b6390]">{t("ui.push.now")}</span>
                  </span>
                  <span className="block truncate text-sm font-bold">{t(`npc.${roomHints.phone.npc}`)}</span>
                  <span className="mt-0.5 line-clamp-2 text-[13px] leading-snug">{roomHints.phone.text}</span>
                </span>
              </button>
            )}
            {/* На телефоне под комнатой — цель и быстрые кнопки */}
            <div className="glass-card rounded-2xl p-4 lg:hidden">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-ok">{t("ui.goal")}</p>
              <p className="mt-1.5 leading-snug">{t(currentGoal(state, content).textKey)}</p>
              {target.view !== "room" && (
                <button onClick={goToGoal} className="mt-3 w-full rounded-xl bg-ai py-3 font-semibold text-white shadow-lg shadow-ai/30">{t("ui.go")}</button>
              )}
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <button onClick={() => go("laptop", app)} className="rounded-xl border border-line bg-surface-2/60 py-2.5">▭ {t("ui.nav.laptop")}</button>
                <button onClick={openPhone} className="relative rounded-xl border border-line bg-surface-2/60 py-2.5">
                  ▯ {t("ui.nav.phone")}
                  {state.unread.length > 0 && <span className="absolute right-3 top-2.5 h-2 w-2 rounded-full bg-bad" aria-hidden />}
                </button>
              </div>
            </div>
          </div>
          {view === "laptop" && <div className="absolute inset-0 lg:inset-4">{laptop}</div>}
        </main>

        {/* Телефон: колонка на широком экране, отдельный экран на телефоне */}
        <aside className={`min-h-0 w-full flex-1 rounded-[28px] transition-shadow duration-300 lg:block lg:w-[340px] lg:flex-none lg:shrink-0 ${view === "phone" ? "block" : "hidden"} ${phonePulse ? "shadow-[0_0_0_3px_var(--color-ai)]" : ""}`}>{phone}</aside>
      </div>

      {/* Нижняя навигация на телефоне */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 border-t border-line bg-bg/95 backdrop-blur lg:hidden" aria-label="Навигация">
        {(["room", "laptop", "phone"] as View[]).map((v) => (
          <button
            key={v}
            onClick={() => go(v)}
            aria-current={view === v ? "page" : undefined}
            className={`relative flex flex-col items-center gap-0.5 py-2.5 text-xs ${view === v ? "text-ai" : "text-muted"}`}
          >
            <span className="text-lg" aria-hidden>{v === "room" ? "⌂" : v === "laptop" ? "▭" : "▯"}</span>
            {t(`ui.nav.${v}`)}
            {v === "phone" && state.unread.length > 0 && <span className="absolute right-[30%] top-2 h-2.5 w-2.5 rounded-full bg-bad" aria-label="новые сообщения" />}
            {highlight === v && view !== v && <span className="anim-glow absolute left-[30%] top-2 h-2 w-2 rounded-full bg-ok" aria-hidden />}
          </button>
        ))}
      </nav>

      <Toasts game={game} state={state} hold={view === "laptop" && app === "neira"} />
      <PushBanner game={game} state={state} suppress={visibleChat} openChat={(c) => { go("phone", undefined, c); setPhonePulse((n) => n + 1); }} />
    </div>
  );
}

function Laptop({
  game,
  state,
  app,
  setApp,
  motion,
  onClose,
  openNeira,
  onFinished,
  onGoal,
  openPhone,
}: {
  game: GameApi;
  state: GameState;
  app: AppId | null;
  setApp: (a: AppId | null) => void;
  motion: boolean;
  onClose: () => void;
  openNeira: () => void;
  onFinished: () => void;
  onGoal: () => void;
  openPhone: () => void;
}) {
  const { t } = game;
  const openApp = app && state.apps.includes(app) ? app : null;
  // Значки на иконках: сколько новых заказов, есть ли задача для ТАКТ ИИ, куда ведёт текущая цель
  const goalApp = goalTarget(state).app;
  const badges: Partial<Record<AppId, string>> = {};
  const newOrders = boardQuests(state, content).filter((q) => !q.repeatable && state.quests[q.id]?.status === "available").length;
  if (newOrders > 0) badges.orders = String(newOrders);
  if (activePromptQuest(state) || activeClassifyQuest(state)) badges.neira = "!";
  if (goalApp && !badges[goalApp]) badges[goalApp] = "!";

  return (
    <section aria-label={t("ui.laptop.title")} className="anim-rise flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-[#342d66] bg-[#0f0d22] shadow-2xl shadow-black/50">
      <div className="flex items-center gap-2 border-b border-line bg-surface px-3 py-2">
        <span className="hidden gap-1.5 sm:flex" aria-hidden>
          <span className="h-3 w-3 rounded-full bg-bad/80" />
          <span className="h-3 w-3 rounded-full bg-gold/80" />
          <span className="h-3 w-3 rounded-full bg-ok/80" />
        </span>
        {openApp ? (
          <button onClick={() => setApp(null)} className="whitespace-nowrap rounded px-1 py-0.5 text-sm text-muted hover:text-ink sm:ml-2 sm:px-2">‹ {t("ui.laptop.title")}</button>
        ) : (
          <span className="ml-2 flex items-center gap-1.5 text-sm text-muted"><TaktLogo className="h-5" /> {t("ui.laptop.title")}</span>
        )}
        <span className="ml-1 truncate text-sm font-semibold">{openApp ? t(`app.${openApp}`) : ""}</span>
        <button onClick={onClose} aria-label={t("ui.laptop.toRoom")} className="ml-auto flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-line bg-surface-2/70 px-3 py-1 text-sm text-ink hover:border-ai/60 hover:bg-surface-2">
          <span aria-hidden>⌂</span> <span className="hidden sm:inline">{t("ui.laptop.toRoom")}</span>
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {!openApp && (
          <div className="desk-wallpaper relative min-h-full p-5">
            <DeskAlert game={game} state={state} onGoal={onGoal} openPhone={openPhone} />
            <div className="relative mb-6 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.25em] text-ok/80">{t("ui.laptop.os")}</p>
                <p className="mt-1 text-2xl font-semibold">{t("ui.laptop.hello", { name: state.profile.name })}</p>
              </div>
              <p className="font-mono text-3xl font-light tabular-nums text-ink/80">{String(state.hour % 24).padStart(2, "0")}:00</p>
            </div>
            <div className="relative grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
              {ALL_APPS.map((a, i) => {
                const unlocked = state.apps.includes(a);
                return (
                  <button
                    key={a}
                    disabled={!unlocked}
                    onClick={() => setApp(a)}
                    title={unlocked ? undefined : t("ui.laptop.locked")}
                    aria-label={unlocked ? t(`app.${a}`) : t("ui.laptop.locked")}
                    className="app-tile group flex flex-col items-center gap-2 rounded-xl p-3 disabled:cursor-not-allowed"
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    <span
                      className={`app-icon relative grid h-14 w-14 place-items-center rounded-2xl text-2xl text-white ${unlocked ? "" : "app-icon-locked text-muted/50"} ${unlocked && goalApp === a ? "app-goal" : ""}`}
                      style={unlocked ? { background: APP_GRADIENT[a], boxShadow: `0 8px 24px -6px ${APP_GLOW[a]}` } : undefined}
                    >
                      {unlocked ? (a === "neira" ? <MascotHead className="h-11 w-11" /> : APP_ICON[a]) : "?"}
                      {unlocked && badges[a] && (
                        <span className="app-badge absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-bad px-1 text-[11px] font-bold text-white">{badges[a]}</span>
                      )}
                    </span>
                    <span className={`text-xs ${unlocked ? "" : "text-muted/60"}`}>{unlocked ? t(`app.${a}`) : "···"}</span>
                    {unlocked && a === "orders" && newOrders > 0 && <span className="-mt-1 text-[11px] font-semibold text-gold">{t("ui.laptop.newOrders", { n: newOrders })}</span>}
                    {unlocked && goalApp === a && a !== "orders" && <span className="-mt-1 text-[11px] font-semibold text-ok">{t("ui.laptop.goalHere")}</span>}
                  </button>
                );
              })}
              {FUTURE_APPS.map((a) => (
                <div key={a} className="flex flex-col items-center gap-2 p-3 opacity-45" title={t("ui.laptop.soon")}>
                  <span className="app-icon-locked grid h-14 w-14 place-items-center rounded-2xl text-xl text-muted">🔒</span>
                  <span className="text-xs text-muted">{t(`app.${a}`)}</span>
                </div>
              ))}
            </div>
            <DeskTicker game={game} />
            <DeskWidgets game={game} state={state} onGoal={onGoal} openNeira={openNeira} openPhone={openPhone} />
          </div>
        )}
        {openApp === "neira" && <NeiraApp game={game} state={state} motion={motion} onFinished={onFinished} />}
        {openApp === "orders" && <Orders game={game} state={state} openNeira={openNeira} />}
        {openApp === "shop" && <Shop game={game} state={state} />}
        {openApp === "skills" && <Skills game={game} state={state} />}
        {openApp === "journal" && <Journal game={game} state={state} />}
      </div>
    </section>
  );
}

/** ТАКТ ИИ показывает либо конструктор запроса, либо мини-игру проверки — смотря какое задание в работе. */
function NeiraApp({ game, state, motion, onFinished }: { game: GameApi; state: GameState; motion: boolean; onFinished: () => void }) {
  const prompt = activePromptQuest(state);
  const classify = activeClassifyQuest(state);
  const [checking, setChecking] = useState(classify?.id ?? null);
  // Пока на экране результат проверки, держим её открытой, даже если задание уже закрыто.
  const shownClassify = classify ?? (checking ? content.quests.find((q) => q.id === checking && q.kind === "classify") : undefined);
  if (classify && checking !== classify.id) setChecking(classify.id);
  // Урок перед заданием: показывается сам при первом открытии, потом — по кнопке «Урок».
  const lesson = lessonFor(classify?.id ?? prompt?.id);
  const [reading, setReading] = useState<string | null>(null);
  const unseen = lesson && !state.lessons.includes(lesson.id);
  if (lesson && (unseen || reading === lesson.id)) {
    return (
      <LessonCard
        key={lesson.id}
        game={game}
        lesson={lesson}
        onDone={() => {
          if (unseen) game.dispatch({ type: "seeLesson", lessonId: lesson.id });
          setReading(null);
        }}
      />
    );
  }
  const openLesson = lesson ? () => setReading(lesson.id) : undefined;
  if (shownClassify && shownClassify.kind === "classify" && (!prompt || classify)) {
    return (
      <ClassifyLab
        key={shownClassify.id}
        game={game}
        quest={shownClassify}
        onLesson={classify ? openLesson : undefined}
        onFinished={() => {
          setChecking(null);
          onFinished();
        }}
      />
    );
  }
  return <PromptLab game={game} state={state} quest={prompt} motion={motion} onFinished={onFinished} onLesson={openLesson} />;
}
