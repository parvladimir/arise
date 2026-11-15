// Локализация: словарь по ключам + подстановка {var} и форм обращения {g:он|она|они}.

import type { Locale, Pronoun, TextKey } from "@/core/types";
import { ru } from "./locales/ru";

const dictionaries: Partial<Record<Locale, Record<string, string>>> = { ru };

const pronounIndex: Record<Pronoun, number> = { he: 0, she: 1, they: 2 };

export function makeTranslator(locale: Locale = "ru", pronoun: Pronoun = "they") {
  const dict = dictionaries[locale] ?? ru;
  return (key: TextKey, vars?: Record<string, string | number>): string => {
    const template = dict[key] ?? ru[key] ?? key;
    return template
      .replace(/\{g:([^}]*)\}/g, (_, forms: string) => {
        const list = forms.split("|");
        return list[pronounIndex[pronoun]] ?? list[0] ?? "";
      })
      .replace(/\{(\w+)\}/g, (m, name: string) => (vars && name in vars ? String(vars[name]) : m));
  };
}

export function hasKey(key: TextKey, locale: Locale = "ru"): boolean {
  return key in (dictionaries[locale] ?? {});
}
