"use client";

import { useState } from "react";
import type { AvatarId, Level, Pronoun } from "@/core/types";
import { MascotHead } from "./Mascot";
import { Avatar, avatarsFor } from "./Avatar";
import type { GameApi } from "./useGame";

export function CreateCharacter({ game }: { game: GameApi }) {
  const { t } = game;
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState<AvatarId>("a1");
  const [pronoun, setPronoun] = useState<Pronoun>("they");
  const [step, setStep] = useState<"who" | "level">("who");
  const [level, setLevel] = useState<Level>("novice");
  const trimmed = name.trim().slice(0, 24);
  const looks = avatarsFor(pronoun);

  const choosePronoun = (p: Pronoun) => {
    setPronoun(p);
    const next = avatarsFor(p);
    if (!next.includes(avatar)) setAvatar(next[0] ?? "a1");
  };

  if (step === "level") {
    return (
      <main className="flex min-h-dvh items-start justify-center px-4 py-10 sm:pt-[8vh]">
        <form
          className="anim-rise w-full max-w-2xl rounded-2xl border border-line bg-surface p-6 shadow-2xl"
          onSubmit={(e) => {
            e.preventDefault();
            game.startNew({ name: trimmed || "Саша", avatar, pronoun, level });
          }}
        >
          <div className="flex items-center gap-3">
            <MascotHead mood="happy" className="h-12 w-12" />
            <div>
              <h1 className="text-2xl font-bold">{t("ui.level.title")}</h1>
              <p className="text-sm text-muted">{t("ui.level.sub")}</p>
            </div>
          </div>
          <div className="mt-6 grid gap-3" role="radiogroup" aria-label={t("ui.level.title")}>
            {LEVELS.map(({ id, icon }) => (
              <button
                type="button"
                role="radio"
                aria-checked={level === id}
                key={id}
                onClick={() => setLevel(id)}
                className={`flex items-start gap-4 rounded-2xl border p-4 text-left transition ${level === id ? "border-ai bg-ai/15 shadow-lg shadow-ai/20" : "border-line hover:border-ai/50"}`}
              >
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#8b3dff]/40 to-[#00d4ff]/30 text-2xl" aria-hidden>{icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline gap-2">
                    <span className="text-lg font-bold">{t(`ui.level.${id}`)}</span>
                    <span className="font-mono text-xs text-[#67e8f9]">{t(`ui.level.${id}.tag`)}</span>
                  </span>
                  <span className="mt-1 block text-sm leading-snug text-ink/80">{t(`ui.level.${id}.desc`)}</span>
                </span>
                <span className={`mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${level === id ? "border-ai" : "border-line"}`} aria-hidden>
                  {level === id && <span className="h-2.5 w-2.5 rounded-full bg-ai" />}
                </span>
              </button>
            ))}
          </div>
          <div className="mt-8 flex gap-3">
            <button type="button" onClick={() => setStep("who")} className="rounded-lg border border-line px-4 py-3">{t("ui.back")}</button>
            <button type="submit" className="flex-1 rounded-lg bg-ai px-4 py-3 text-lg font-semibold text-white shadow-lg shadow-ai/30 hover:brightness-110">
              {t("ui.create.start")}
            </button>
          </div>
        </form>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh items-start justify-center px-4 py-10 sm:pt-[12vh]">
      <form
        className="anim-rise w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-2xl"
        onSubmit={(e) => {
          e.preventDefault();
          setStep("level");
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
          <legend className="text-sm text-muted">{t("ui.create.pronoun")}</legend>
          <div className="mt-2 flex gap-2">
            {(["he", "she", "they"] as Pronoun[]).map((p) => (
              <button
                type="button"
                key={p}
                aria-pressed={pronoun === p}
                onClick={() => choosePronoun(p)}
                className={`flex-1 rounded-lg border px-3 py-2 transition ${pronoun === p ? "border-ai bg-ai/15 text-ink" : "border-line text-muted hover:text-ink"}`}
              >
                {t(`ui.pronoun.${p}`)}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-6">
          <legend className="text-sm text-muted">{t("ui.create.look")}</legend>
          <div className="mt-2 grid grid-cols-6 gap-2">
            {looks.map((id) => (
              <button
                type="button"
                key={id}
                aria-pressed={avatar === id}
                onClick={() => setAvatar(id)}
                className={`grid place-items-center justify-self-center rounded-full p-0.5 transition ${avatar === id ? "ring-2 ring-ai" : "opacity-70 hover:opacity-100"}`}
              >
                <Avatar id={id} size={44} label={`Вариант ${looks.indexOf(id) + 1}`} />
              </button>
            ))}
          </div>
        </fieldset>

        <div className="mt-8 flex gap-3">
          <button type="button" onClick={() => game.setScreen("menu")} className="rounded-lg border border-line px-4 py-3">{t("ui.back")}</button>
          <button type="submit" className="flex-1 rounded-lg bg-ai px-4 py-3 text-lg font-semibold text-white shadow-lg shadow-ai/30 hover:brightness-110">
            {t("ui.create.next")} →
          </button>
        </div>
      </form>
    </main>
  );
}

const LEVELS: { id: Level; icon: string }[] = [
  { id: "novice", icon: "🌱" },
  { id: "practice", icon: "⚡" },
  { id: "pro", icon: "🚀" },
]
