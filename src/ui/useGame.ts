"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { content } from "@/content";
import { makeTranslator } from "@/content/i18n";
import { apply, type Ctx } from "@/core/engine";
import { browserStorage, deserialize, serialize } from "@/core/save";
import type { Action, GameEvent, GameState } from "@/core/types";

export type Screen = "menu" | "create" | "game";

export function useGame() {
  const storage = useMemo(() => browserStorage(), []);
  const [state, setState] = useState<GameState | null>(null);
  const [hasSave, setHasSave] = useState(false);
  const [screen, setScreen] = useState<Screen>("menu");
  const [lastEvents, setLastEvents] = useState<GameEvent[]>([]);
  const [savedAt, setSavedAt] = useState(0);
  const stateRef = useRef<GameState | null>(null);

  const t = useMemo(() => makeTranslator("ru", state?.profile.pronoun ?? "they"), [state?.profile.pronoun]);
  const ctx: Ctx = useMemo(() => ({ content, t }), [t]);

  useEffect(() => {
    const raw = storage.read();
    setHasSave(Boolean(raw && deserialize(raw)));
  }, [storage]);

  const dispatch = useCallback(
    (action: Action): GameEvent[] => {
      const current = stateRef.current;
      if (!current && action.type !== "newGame") return [];
      const r = apply(current as GameState, action, ctx);
      stateRef.current = r.state;
      setState(r.state);
      if (action.type !== "clearToasts" && action.type !== "readChat") setLastEvents(r.events);
      if (r.state !== current) {
        storage.write(serialize(r.state));
        setHasSave(true);
        setSavedAt(Date.now());
      }
      return r.events;
    },
    [ctx, storage],
  );

  const continueGame = useCallback(() => {
    const raw = storage.read();
    const loaded = raw ? deserialize(raw) : null;
    if (!loaded) {
      setHasSave(false);
      return;
    }
    stateRef.current = loaded;
    setState(loaded);
    setScreen("game");
  }, [storage]);

  const startNew = useCallback(
    (profile: GameState["profile"]) => {
      dispatch({ type: "newGame", profile });
      setScreen("game");
    },
    [dispatch],
  );

  const reset = useCallback(() => {
    storage.clear();
    stateRef.current = null;
    setState(null);
    setHasSave(false);
    setScreen("menu");
  }, [storage]);

  return { state, screen, setScreen, hasSave, dispatch, continueGame, startNew, reset, t, lastEvents, savedAt };
}

export type GameApi = ReturnType<typeof useGame>;
