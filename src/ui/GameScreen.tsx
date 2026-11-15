"use client";

import { useEffect, useState } from "react";
import type { AppId, GameState, NpcId } from "@/core/types";
import { Journal, Orders, Shop, Skills } from "./Apps";
import { activePromptQuest, goalTarget, type View } from "./nav";
import { Phone } from "./Phone";
import { PromptLab } from "./PromptLab";
import { Room } from "./Room";
import { Toasts } from "./Toasts";
import { TopBar } from "./TopBar";
import type { GameApi } from "./useGame";

const ALL_APPS: AppId[] = ["neira", "orders", "shop", "skills", "journal"];
const FUTURE_APPS = ["pixela", "flow", "code"] as const;
const APP_ICON: Record<AppId, string> = { neira: "◉", orders: "▤", shop: "◈", skills: "✦", journal: "☰" };

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

export function GameScreen({ game, state }: { game: GameApi; state: GameState }) {
  const { t } = game;
  const [view, setView] = useState<View>("room");
  const [app, setApp] = useState<AppId | null>(null);
  const [chat, setChat] = useState<NpcId | null>(null);
  const [motion, setMotion] = useMotionPref();
  const target = goalTarget(state);
  const highlight = target.view === "room" ? null : target.view;

  const go = (v: View, a?: AppId | null, c?: NpcId) => {
    setView(v);
    if (a !== undefined) setApp(a);
    if (c) setChat(c);
  };
  const goToGoal = () => go(target.view, target.app ?? null, target.chat);
  const openNeira = () => go("laptop", "neira");

  const laptop = (
    <Laptop game={game} state={state} app={app} setApp={setApp} motion={motion} onClose={() => go("room", null)} openNeira={openNeira} onFinished={() => go("room", null)} />
  );
  const phone = <Phone game={game} state={state} chat={chat} setChat={setChat} onAccepted={() => openNeira()} />;

  return (
    <div data-motion={motion ? "on" : "off"} className="flex h-dvh flex-col">
      <TopBar game={game} state={state} onGo={goToGoal} motion={motion} setMotion={setMotion} />

      <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 gap-4 p-3 pb-20 lg:p-4 lg:pb-4">
        {/* Основная сцена: комната или ноутбук */}
        <main className={`relative min-h-0 flex-1 ${view === "phone" ? "hidden lg:block" : ""}`}>
          <div className={`h-full overflow-hidden rounded-2xl border border-line bg-surface ${view === "laptop" ? "hidden lg:block" : ""}`}>
            <Room state={state} highlight={highlight} open={(v) => go(v, v === "laptop" ? app : undefined)} />
          </div>
          {view === "laptop" && <div className="absolute inset-0 lg:inset-4">{laptop}</div>}
        </main>

        {/* Телефон: колонка на широком экране, отдельный экран на телефоне */}
        <aside className={`min-h-0 w-full flex-1 lg:block lg:w-[340px] lg:flex-none lg:shrink-0 ${view === "phone" ? "block" : "hidden"}`}>{phone}</aside>
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
}: {
  game: GameApi;
  state: GameState;
  app: AppId | null;
  setApp: (a: AppId | null) => void;
  motion: boolean;
  onClose: () => void;
  openNeira: () => void;
  onFinished: () => void;
}) {
  const { t } = game;
  const openApp = app && state.apps.includes(app) ? app : null;

  return (
    <section aria-label={t("ui.laptop.title")} className="anim-rise flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-[#2a3658] bg-[#0d1426] shadow-2xl shadow-black/50">
      <div className="flex items-center gap-2 border-b border-line bg-surface px-3 py-2">
        <span className="flex gap-1.5" aria-hidden>
          <span className="h-3 w-3 rounded-full bg-bad/80" />
          <span className="h-3 w-3 rounded-full bg-gold/80" />
          <span className="h-3 w-3 rounded-full bg-ok/80" />
        </span>
        {openApp ? (
          <button onClick={() => setApp(null)} className="ml-2 rounded px-2 py-0.5 text-sm text-muted hover:text-ink">‹ {t("ui.laptop.title")}</button>
        ) : (
          <span className="ml-2 text-sm text-muted">{t("ui.laptop.title")}</span>
        )}
        <span className="ml-1 text-sm font-semibold">{openApp ? t(`app.${openApp}`) : ""}</span>
        <button onClick={onClose} className="ml-auto rounded px-2 py-0.5 text-sm text-muted hover:text-ink" aria-label={t("ui.close")}>✕</button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {!openApp && (
          <div className="grid grid-cols-3 gap-3 p-5 sm:grid-cols-4 md:grid-cols-6">
            {ALL_APPS.map((a) => {
              const unlocked = state.apps.includes(a);
              return (
                <button
                  key={a}
                  disabled={!unlocked}
                  onClick={() => setApp(a)}
                  title={unlocked ? undefined : t("ui.laptop.locked")}
                  aria-label={unlocked ? t(`app.${a}`) : t("ui.laptop.locked")}
                  className="group flex flex-col items-center gap-2 rounded-xl p-3 enabled:hover:bg-surface disabled:cursor-not-allowed"
                >
                  <span className={`grid h-14 w-14 place-items-center rounded-2xl text-2xl ${unlocked ? (a === "neira" ? "bg-ai text-white shadow-lg shadow-ai/30" : "bg-surface-2 text-ink") : "border border-dashed border-line text-muted/50"}`}>
                    {unlocked ? APP_ICON[a] : "?"}
                  </span>
                  <span className={`text-xs ${unlocked ? "" : "text-muted/60"}`}>{unlocked ? t(`app.${a}`) : "···"}</span>
                </button>
              );
            })}
            {FUTURE_APPS.map((a) => (
              <div key={a} className="flex flex-col items-center gap-2 p-3 opacity-40" title={t("ui.laptop.soon")}>
                <span className="grid h-14 w-14 place-items-center rounded-2xl border border-dashed border-line text-xl text-muted">🔒</span>
                <span className="text-xs text-muted">{t(`app.${a}`)}</span>
              </div>
            ))}
          </div>
        )}
        {openApp === "neira" && <PromptLab game={game} state={state} quest={activePromptQuest(state)} motion={motion} onFinished={onFinished} />}
        {openApp === "orders" && <Orders game={game} state={state} openNeira={openNeira} />}
        {openApp === "shop" && <Shop game={game} state={state} />}
        {openApp === "skills" && <Skills game={game} state={state} />}
        {openApp === "journal" && <Journal game={game} state={state} />}
      </div>
    </section>
  );
}
