"use client";
// Персонаж: на первом входе игра стартует сразу (имя из Telegram), а настроить имя, обращение и внешность
// можно потом в ⚙ «Персонаж». Уровень игрок выбирает ответом Диме в первом разговоре.

import { useState } from "react";
import { createPortal } from "react-dom";
import type { AvatarId, Pronoun } from "@/core/types";
import { DEMO_COOKIE, demoBonusFrom } from "@/core/demo";
import { Avatar, avatarsFor } from "./Avatar";
import type { GameApi } from "./useGame";

/** ₵ из демо-заказа на промо-странице: забираем один раз и стираем куку. */
export function takeDemoBonus(): number {
  const raw = document.cookie.split("; ").find((c) => c.startsWith(`${DEMO_COOKIE}=`))?.split("=")[1];
  if (raw === undefined) return 0;
  document.cookie = `${DEMO_COOKIE}=; path=/; max-age=0`;
  return demoBonusFrom(raw);
}

/** Имя для старта без анкеты: первое слово имени из Telegram. */
export const startName = (game: GameApi) => (game.account?.name ?? "").trim().split(/\s+/)[0]?.slice(0, 24) || "Саша";

/** Сразу в игру: без анкеты, с именем из Telegram и ₵ из демо. */
export function quickStart(game: GameApi) {
  game.startNew({ name: startName(game), avatar: "a1", pronoun: "they", level: "novice" }, takeDemoBonus());
}

export interface ProfileValue {
  name: string;
  avatar: AvatarId;
  pronoun: Pronoun;
}

export function ProfileForm({
  game,
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  game: GameApi;
  initial: ProfileValue;
  submitLabel: string;
  onSubmit: (v: ProfileValue) => void;
  onCancel: () => void;
}) {
  const { t } = game;
  const [name, setName] = useState(initial.name);
  const [avatar, setAvatar] = useState<AvatarId>(initial.avatar);
  const [pronoun, setPronoun] = useState<Pronoun>(initial.pronoun);
  const looks = avatarsFor(pronoun);

  const choosePronoun = (p: Pronoun) => {
    setPronoun(p);
    const next = avatarsFor(p);
    if (!next.includes(avatar)) setAvatar(next[0] ?? "a1");
  };

  return (
    <form
      className="anim-rise w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-2xl"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ name: name.trim().slice(0, 24) || "Саша", avatar, pronoun });
      }}
    >
      <h1 className="text-2xl font-bold">{t("ui.create.title")}</h1>

      <label className="mt-6 block text-sm text-muted" htmlFor="name">{t("ui.create.name")}</label>
      <input
        id="name"
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
        <button type="button" onClick={onCancel} className="rounded-lg border border-line px-4 py-3">{t("ui.back")}</button>
        <button type="submit" className="flex-1 rounded-lg bg-ai px-4 py-3 text-lg font-semibold text-white shadow-lg shadow-ai/30 hover:brightness-110">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

/** «Новая игра» из меню: короткая анкета без выбора уровня (его спросит Дима). */
export function CreateCharacter({ game }: { game: GameApi }) {
  return (
    <main className="flex min-h-dvh items-start justify-center px-4 py-10 sm:pt-[12vh]">
      <ProfileForm
        game={game}
        initial={{ name: startName(game) === "Саша" ? "" : startName(game), avatar: "a1", pronoun: "they" }}
        submitLabel={`${game.t("ui.create.start")} →`}
        onCancel={() => game.setScreen("menu")}
        onSubmit={(v) => game.startNew({ ...v, level: "novice" }, takeDemoBonus())}
      />
    </main>
  );
}

/** ⚙ → «Персонаж»: поменять имя, обращение и внешность по ходу игры. */
export function ProfileEditor({ game, onClose }: { game: GameApi; onClose: () => void }) {
  const p = game.state?.profile;
  if (!p) return null;
  // Через портал: шапка игры создаёт свой слой, и окно внутри неё оказалось бы под содержимым.
  return createPortal(
    <div className="fixed inset-0 z-[100] grid place-items-start justify-center overflow-y-auto bg-black/70 px-4 py-10 backdrop-blur-sm" role="dialog" aria-modal>
      <ProfileForm
        game={game}
        initial={{ name: p.name, avatar: p.avatar, pronoun: p.pronoun }}
        submitLabel="Сохранить"
        onCancel={onClose}
        onSubmit={(v) => {
          game.dispatch({ type: "setProfile", ...v });
          onClose();
        }}
      />
    </div>,
    document.body,
  );
}
