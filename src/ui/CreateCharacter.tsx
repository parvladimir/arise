"use client";

import { useState } from "react";
import type { AvatarId, Pronoun } from "@/core/types";
import { AVATARS, Avatar } from "./Avatar";
import type { GameApi } from "./useGame";

export function CreateCharacter({ game }: { game: GameApi }) {
  const { t } = game;
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState<AvatarId>("a1");
  const [pronoun, setPronoun] = useState<Pronoun>("they");
  const trimmed = name.trim().slice(0, 24);

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <form
        className="anim-rise w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-2xl"
        onSubmit={(e) => {
          e.preventDefault();
          game.startNew({ name: trimmed || "Саша", avatar, pronoun });
        }}
      >
        <h1 className="text-2xl font-bold">{t("ui.create.title")}</h1>

        <label className="mt-6 block text-sm text-muted" htmlFor="name">{t("ui.create.name")}</label>
        <input
          id="name"
          autoFocus
          value={name}
          maxLength={24}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("ui.create.namePlaceholder")}
          className="mt-2 w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-lg outline-none focus:border-ai"
        />

        <fieldset className="mt-6">
          <legend className="text-sm text-muted">{t("ui.create.look")}</legend>
          <div className="mt-2 grid grid-cols-6 gap-2">
            {AVATARS.map((id) => (
              <button
                type="button"
                key={id}
                aria-pressed={avatar === id}
                onClick={() => setAvatar(id)}
                className={`rounded-full p-0.5 transition ${avatar === id ? "ring-2 ring-ai" : "opacity-70 hover:opacity-100"}`}
              >
                <Avatar id={id} size={44} label={`Вариант ${id.slice(1)}`} />
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-6">
          <legend className="text-sm text-muted">{t("ui.create.pronoun")}</legend>
          <div className="mt-2 flex gap-2">
            {(["he", "she", "they"] as Pronoun[]).map((p) => (
              <button
                type="button"
                key={p}
                aria-pressed={pronoun === p}
                onClick={() => setPronoun(p)}
                className={`flex-1 rounded-lg border px-3 py-2 transition ${pronoun === p ? "border-ai bg-ai/15 text-ink" : "border-line text-muted hover:text-ink"}`}
              >
                {t(`ui.pronoun.${p}`)}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="mt-8 flex gap-3">
          <button type="button" onClick={() => game.setScreen("menu")} className="rounded-lg border border-line px-4 py-3">{t("ui.back")}</button>
          <button type="submit" className="flex-1 rounded-lg bg-ai px-4 py-3 text-lg font-semibold text-white shadow-lg shadow-ai/30 hover:brightness-110">
            {t("ui.create.start")}
          </button>
        </div>
      </form>
    </main>
  );
}
