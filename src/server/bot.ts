// Telegram-бот доступа к AI RISE: проверяет подписку на канал ТАКТ AI и выдаёт личную ссылку на игру.
// Работает внутри сервера игры (запускается из src/instrumentation.ts), читает Telegram через getUpdates.
// Настройки (deploy/.env на сервере): GAME_BOT_TOKEN, GAME_BOT_USERNAME, GAME_CHANNEL, GAME_URL, GAME_BOT_ADMINS.
// Бот должен быть администратором канала (без права публикации), иначе Telegram не покажет ему подписчиков.

import { accessDb, issueKey, type Player, type TgUser } from "./access";

const TOKEN = process.env.GAME_BOT_TOKEN ?? "";
const CHANNEL = process.env.GAME_CHANNEL ?? "@takt_news_ai";
const CHANNEL_URL = `https://t.me/${CHANNEL.replace(/^@/, "")}`;
const GAME_URL = (process.env.GAME_URL ?? "https://arise.178-104-59-10.sslip.io").replace(/\/$/, "");
const ADMINS = new Set((process.env.GAME_BOT_ADMINS ?? "").split(/[\s,]+/).filter(Boolean).map(Number));
const RECHECK_DAYS = 7;
const REMIND_DAYS = 14;
const DAY = 86400_000;

type Markup = { inline_keyboard: { text: string; url?: string; callback_data?: string }[][] };

async function api<T = unknown>(method: string, body: Record<string, unknown> | FormData, timeoutMs = 15000): Promise<T> {
  const res = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
    method: "POST",
    ...(body instanceof FormData ? { body } : { body: JSON.stringify(body), headers: { "Content-Type": "application/json" } }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const data = (await res.json()) as { ok: boolean; result?: T; description?: string; error_code?: number };
  if (!data.ok) throw Object.assign(new Error(`${method}: ${data.description}`), { code: data.error_code });
  return data.result as T;
}

const send = (chat_id: number, text: string, reply_markup?: Markup) =>
  api("sendMessage", { chat_id, text, parse_mode: "HTML", disable_web_page_preview: true, ...(reply_markup ? { reply_markup } : {}) });

/** true — подписан, false — нет, null — Telegram не дал ответа (бот не админ канала и т.п.). */
async function isSubscribed(userId: number): Promise<boolean | null> {
  try {
    const m = await api<{ status: string; is_member?: boolean }>("getChatMember", { chat_id: CHANNEL, user_id: userId });
    return ["creator", "administrator", "member"].includes(m.status) || (m.status === "restricted" && m.is_member === true);
  } catch (e) {
    console.error("[bot] getChatMember", (e as Error).message);
    return null;
  }
}

const subscribeMarkup = (): Markup => ({
  inline_keyboard: [[{ text: "Подписаться на ТАКТ AI", url: CHANNEL_URL }], [{ text: "Я подписался ✓", callback_data: "check" }]],
});

async function grant(chatId: number, user: TgUser, source: string | null) {
  const ok = await isSubscribed(user.id);
  if (ok === null) {
    await send(chatId, "Не получилось проверить подписку, Telegram не ответил. Попробуй через минуту.", {
      inline_keyboard: [[{ text: "Проверить ещё раз", callback_data: "check" }]],
    });
    for (const a of ADMINS) await send(a, "⚠️ Бот не может проверить подписку. Он точно администратор канала " + CHANNEL + "?").catch(() => {});
    return;
  }
  if (!ok) {
    await send(
      chatId,
      "<b>AI RISE</b> — игра, в которой учишься работать с нейросетями: от первого промпта до своей ИИ-компании.\n\n" +
        "Игра бесплатная. Нужна только подписка на канал <b>ТАКТ AI</b>: там новости ИИ без воды, разборы и новые главы игры.\n\n" +
        "Подпишись и нажми «Я подписался».",
      subscribeMarkup(),
    );
    return;
  }
  const key = issueKey(user, source);
  await send(
    chatId,
    "Подписка есть, спасибо! 🎮\n\nВот твоя личная ссылка на <b>AI RISE</b>. Открой её на телефоне или компьютере: игра запомнит браузер, и дальше заходить можно просто по адресу игры.\n\n" +
      "Ссылка именная, не пересылай её. Друзьям лучше дай этого бота.",
    { inline_keyboard: [[{ text: "Играть в AI RISE ▶", url: `${GAME_URL}/api/access?k=${key}` }]] },
  );
}

async function stats(chatId: number) {
  const d = accessDb();
  const n = (sql: string, ...p: number[]) => (d.prepare(sql).get(...p) as { n: number }).n;
  const now = Date.now();
  const bySource = d.prepare("SELECT COALESCE(source, '—') AS s, COUNT(*) AS n FROM tg_players GROUP BY s ORDER BY n DESC LIMIT 10").all() as { s: string; n: number }[];
  await send(
    chatId,
    [
      "<b>AI RISE — игроки из Telegram</b>",
      `Всего получили ссылку: ${n("SELECT COUNT(*) AS n FROM tg_players")}`,
      `Открыли игру: ${n("SELECT COUNT(*) AS n FROM tg_players WHERE opened_at > 0")}`,
      `Сейчас подписаны: ${n("SELECT COUNT(*) AS n FROM tg_players WHERE subscribed = 1")}`,
      `Новых за сутки: ${n("SELECT COUNT(*) AS n FROM tg_players WHERE created_at > ?", now - DAY)}`,
      `Новых за неделю: ${n("SELECT COUNT(*) AS n FROM tg_players WHERE created_at > ?", now - 7 * DAY)}`,
      "",
      "Откуда пришли: " + (bySource.map((r) => `${r.s} ${r.n}`).join(", ") || "—"),
      "",
      "/export — выгрузка базы в CSV",
    ].join("\n"),
  );
}

async function exportCsv(chatId: number) {
  const rows = accessDb().prepare("SELECT * FROM tg_players ORDER BY created_at").all() as unknown as Player[];
  const iso = (t: number) => (t ? new Date(t).toISOString().slice(0, 16).replace("T", " ") : "");
  const q = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = ["tg_id,username,name,source,subscribed,got_link,opened_game,last_check"];
  for (const r of rows) lines.push([r.tg_id, r.username, r.name, r.source, r.subscribed, iso(r.created_at), iso(r.opened_at), iso(r.checked_at)].map(q).join(","));
  const form = new FormData();
  form.set("chat_id", String(chatId));
  form.set("document", new Blob(["﻿" + lines.join("\n")], { type: "text/csv" }), `ai-rise-players-${new Date().toISOString().slice(0, 10)}.csv`);
  await api("sendDocument", form, 30000);
}

type Update = {
  update_id: number;
  message?: { chat: { id: number; type: string }; from?: TgUser; text?: string };
  callback_query?: { id: string; from: TgUser; message?: { chat: { id: number } }; data?: string };
};

async function handle(u: Update) {
  if (u.callback_query) {
    const cb = u.callback_query;
    await api("answerCallbackQuery", { callback_query_id: cb.id }).catch(() => {});
    if (cb.data === "check" && cb.message) await grant(cb.message.chat.id, cb.from, null);
    return;
  }
  const m = u.message;
  if (!m?.from || m.chat.type !== "private") return;
  const text = (m.text ?? "").trim();
  if (ADMINS.has(m.from.id) && text === "/stats") return stats(m.chat.id);
  if (ADMINS.has(m.from.id) && text === "/export") return exportCsv(m.chat.id);
  const source = text.startsWith("/start ") ? text.slice(7).replace(/[^\w-]/g, "").slice(0, 32) || null : null;
  await grant(m.chat.id, m.from, source);
}

/** Раз в неделю перепроверяем подписку; отписавшимся раз в две недели мягко напоминаем. Доступ не отнимаем. */
async function recheck() {
  const d = accessDb();
  const now = Date.now();
  const due = d.prepare("SELECT * FROM tg_players WHERE checked_at < ? ORDER BY checked_at LIMIT 30").all(now - RECHECK_DAYS * DAY) as unknown as Player[];
  for (const p of due) {
    const ok = await isSubscribed(p.tg_id);
    if (ok === null) return;
    d.prepare("UPDATE tg_players SET subscribed = ?, checked_at = ? WHERE tg_id = ?").run(ok ? 1 : 0, now, p.tg_id);
    if (!ok && p.reminded_at < now - REMIND_DAYS * DAY) {
      await send(
        p.tg_id,
        "Привет! Похоже, ты отписался от канала ТАКТ AI. Игра остаётся с тобой, но новые главы, бонусы и разборы выходят именно там. Возвращайся 🙂",
        { inline_keyboard: [[{ text: "Вернуться в ТАКТ AI", url: CHANNEL_URL }]] },
      ).catch(() => {});
      d.prepare("UPDATE tg_players SET reminded_at = ? WHERE tg_id = ?").run(now, p.tg_id);
    }
    await new Promise((r) => setTimeout(r, 300));
  }
}

let started = false;

export function startBot() {
  if (started || !TOKEN) return;
  started = true;
  const d = accessDb();
  const getOffset = () => Number((d.prepare("SELECT v FROM bot_state WHERE k = 'offset'").get() as { v: string } | undefined)?.v ?? 0);
  const setOffset = (v: number) => d.prepare("INSERT INTO bot_state (k, v) VALUES ('offset', ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v").run(String(v));

  void (async () => {
    await api("setMyCommands", { commands: [{ command: "start", description: "Получить доступ к игре AI RISE" }] }).catch(() => {});
    console.log("[bot] started");
    for (;;) {
      try {
        const updates = await api<Update[]>("getUpdates", { offset: getOffset(), timeout: 25, allowed_updates: ["message", "callback_query"] }, 35000);
        for (const u of updates) {
          setOffset(u.update_id + 1);
          await handle(u).catch((e) => console.error("[bot] update", (e as Error).message));
        }
      } catch (e) {
        console.error("[bot] poll", (e as Error).message);
        await new Promise((r) => setTimeout(r, 5000));
      }
    }
  })();

  setTimeout(() => void recheck().catch(() => {}), 60_000);
  setInterval(() => void recheck().catch(() => {}), 6 * 3600_000);
}
