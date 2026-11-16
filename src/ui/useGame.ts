"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { content } from "@/content";
import { makeTranslator } from "@/content/i18n";
import { apply, refreshQuests, type Ctx } from "@/core/engine";
import { browserStorage, deserialize, serialize } from "@/core/save";
import type { Action, GameEvent, GameState } from "@/core/types";

export type Screen = "menu" | "create" | "game";

export interface Account {
  id: number;
  email: string;
}

/** Прогресс в базе: последнюю версию сохранения отправляем на сервер с небольшой задержкой. */
function remoteSaver() {
  let timer: number | undefined;
  let pending: string | null = null;
  const flush = (keepalive = false) => {
    if (pending === null) return;
    const body = pending;
    pending = null;
    void fetch("/api/save", { method: "PUT", headers: { "Content-Type": "application/json" }, body, keepalive }).catch(() => {
      // нет сети — сохраним при следующем ходе
      pending ??= body;
    });
  };
  return {
    push(data: string) {
      pending = data;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => flush(), 1200);
    },
    flush,
  };
}

export function useGame(account: Account | null) {
  // У каждого аккаунта своя копия сохранения в браузере; главная копия — в базе на сервере.
  const storage = useMemo(() => browserStorage(account ? `ai-rise.save.u${account.id}` : "ai-rise.save"), [account]);
  const remote = useMemo(() => (account ? remoteSaver() : null), [account]);
  const [synced, setSynced] = useState(false);
  const [imported, setImported] = useState(false);
  const [state, setState] = useState<GameState | null>(null);
  const [hasSave, setHasSave] = useState(false);
  const [screen, setScreen] = useState<Screen>("menu");
  const [lastEvents, setLastEvents] = useState<GameEvent[]>([]);
  const [savedAt, setSavedAt] = useState(0);
  const stateRef = useRef<GameState | null>(null);

  const t = useMemo(() => makeTranslator("ru", state?.profile.pronoun ?? "they"), [state?.profile.pronoun]);
  const ctx: Ctx = useMemo(() => ({ content, t }), [t]);

  useEffect(() => {
    let cancelled = false;
    setSynced(false);
    const finish = () => {
      if (cancelled) return;
      const raw = storage.read();
      setHasSave(Boolean(raw && deserialize(raw)));
      setSynced(true);
    };
    if (!account) {
      finish();
      return;
    }
    // Вход: берём прогресс из базы. Если в базе пусто, переносим туда прогресс, сыгранный в этом браузере без входа.
    fetch("/api/save", { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<{ save: { data: string } | null }>) : null))
      .then((body) => {
        if (cancelled || !body) return;
        if (body.save && deserialize(body.save.data)) storage.write(body.save.data);
        else {
          const guestStore = browserStorage("ai-rise.save");
          const guest = guestStore.read();
          if (guest && deserialize(guest)) {
            storage.write(guest);
            remote?.push(guest);
            // Гостевой прогресс переносится один раз: другой аккаунт в этом браузере его уже не получит.
            guestStore.clear();
            setImported(true);
          }
        }
      })
      .catch(() => {})
      .finally(finish);
    const onHide = () => remote?.flush(true);
    window.addEventListener("pagehide", onHide);
    return () => {
      cancelled = true;
      window.removeEventListener("pagehide", onHide);
      remote?.flush(true);
    };
  }, [storage, account, remote]);

  const dispatch = useCallback(
    (action: Action): GameEvent[] => {
      const current = stateRef.current;
      if (!current && action.type !== "newGame") return [];
      const r = apply(current as GameState, action, ctx);
      stateRef.current = r.state;
      setState(r.state);
      if (action.type !== "clearToasts" && action.type !== "readChat") setLastEvents(r.events);
      if (r.state !== current) {
        const data = serialize(r.state);
        storage.write(data);
        remote?.push(data);
        setHasSave(true);
        setSavedAt(Date.now());
      }
      return r.events;
    },
    [ctx, storage, remote],
  );

  const continueGame = useCallback(() => {
    const raw = storage.read();
    const loaded = raw ? deserialize(raw) : null;
    if (!loaded) {
      setHasSave(false);
      return;
    }
    // Сохранение могло быть сделано до выхода новых заданий: открываем те, чьи условия уже выполнены.
    refreshQuests(loaded, ctx);
    storage.write(serialize(loaded));
    remote?.push(serialize(loaded));
    stateRef.current = loaded;
    setState(loaded);
    setScreen("game");
  }, [storage, ctx, remote]);

  const startNew = useCallback(
    (profile: GameState["profile"]) => {
      dispatch({ type: "newGame", profile });
      setScreen("game");
    },
    [dispatch],
  );

  /** Сбросить игру; при выходе из аккаунта (keepSave) сохранение не трогаем, только закрываем. */
  const reset = useCallback((keepSave = false) => {
    if (!keepSave) storage.clear();
    stateRef.current = null;
    setState(null);
    setHasSave(false);
    setScreen("menu");
  }, [storage]);

  const flush = useCallback(() => remote?.flush(true), [remote]);

  return { state, screen, setScreen, hasSave, synced, imported, account, flush, dispatch, continueGame, startNew, reset, t, lastEvents, savedAt };
}

export type GameApi = ReturnType<typeof useGame>;
