import { beforeEach, describe, expect, it } from "vitest";
import { content } from "@/content";
import { makeTranslator } from "@/content/i18n";
import { newGameState } from "@/core/engine";
import { serialize } from "@/core/save";
import { createSession, deleteSession, hashPassword, loadSave, login, register, resetAttempts, storeSave, tooManyAttempts, userFromToken, verifyPassword } from "./auth";
import { openDb, setDb } from "./db";

beforeEach(() => {
  setDb(openDb(":memory:"));
  resetAttempts();
});

describe("аккаунты", () => {
  it("пароль хранится только как хеш и проверяется", () => {
    const h = hashPassword("секрет123");
    expect(h).not.toContain("секрет123");
    expect(verifyPassword("секрет123", h)).toBe(true);
    expect(verifyPassword("секрет124", h)).toBe(false);
  });

  it("регистрация, повтор почты и вход", () => {
    const u = register(" Vova@Example.com ", "password1");
    expect(u).toMatchObject({ email: "vova@example.com" });
    expect(register("vova@example.com", "password2")).toBe("taken");
    expect(register("не почта", "password1")).toBe("badEmail");
    expect(register("a@b.co", "short")).toBe("shortPassword");
    expect(login("VOVA@example.com", "password1")).toMatchObject({ email: "vova@example.com" });
    expect(login("vova@example.com", "wrong-pass")).toBe("wrongLogin");
    expect(login("nobody@example.com", "password1")).toBe("wrongLogin");
  });

  it("сессия по токену и выход", () => {
    const u = register("a@b.co", "password1") as { id: number };
    const { token } = createSession(u.id);
    expect(userFromToken(token)).toMatchObject({ id: u.id });
    expect(userFromToken("чужой")).toBeNull();
    deleteSession(token);
    expect(userFromToken(token)).toBeNull();
  });

  it("сохранение: принимается только настоящее сохранение игры", () => {
    const u = register("a@b.co", "password1") as { id: number };
    expect(loadSave(u.id)).toBeNull();
    const state = newGameState({ name: "Саша", avatar: "a1", pronoun: "they" }, { content, t: makeTranslator() });
    expect(storeSave(u.id, serialize(state))).toBe(true);
    expect(JSON.parse(loadSave(u.id)!.data).profile.name).toBe("Саша");
    expect(storeSave(u.id, "{\"hack\":1}")).toBe(false);
    expect(storeSave(u.id, "x".repeat(600 * 1024))).toBe(false);
  });

  it("защита от перебора: после 10 попыток — пауза", () => {
    for (let i = 0; i < 10; i++) expect(tooManyAttempts("k", 1000)).toBe(false);
    expect(tooManyAttempts("k", 1000)).toBe(true);
    expect(tooManyAttempts("k", 1000 + 16 * 60 * 1000)).toBe(false);
  });
});
