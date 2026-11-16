// Разбор публичной ленты Telegram-канала (страница t.me/s/<канал>).
// Ключи и бот не нужны: это та же страница, что открывается в браузере.

export interface TgPost {
  id: number;
  url: string;
  /** Заголовок поста: первая непустая строка, не длиннее 140 знаков. */
  title: string;
  date: string | null;
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", laquo: "«", raquo: "»", mdash: "—", ndash: "–", hellip: "…" };

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const code = e[1]?.toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

/** HTML текста поста → обычный текст с переносами строк. */
export function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div)>/gi, "\n")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/[ \t]+/g, " ")
    .trim();
}

export function postTitle(text: string, max = 140): string {
  const line = text.split("\n").map((l) => l.trim()).find((l) => l.replace(/[^\p{L}\p{N}]/gu, "").length >= 3) ?? "";
  // Хештеги и подписи в конце строки заголовку не нужны
  const clean = line
    .replace(/(\s#[\p{L}\p{N}_]+)+\s*$/u, "")
    .replace(/^[^\p{L}\p{N}«"(]+/u, "")
    .trim();
  return clean.length > max ? clean.slice(0, max - 1).trimEnd() + "…" : clean;
}

/** Служебные и закреплённые посты — не новости. */
const SKIP = /pinned|закрепил|добро пожаловать/i;

export function parseTgChannel(html: string, channel: string): TgPost[] {
  const posts: TgPost[] = [];
  const blocks = html.split(/(?=<div class="tgme_widget_message_wrap)/);
  for (const b of blocks) {
    const idm = b.match(new RegExp(`data-post="${channel}/(\\d+)"`, "i"));
    const tm = b.match(/<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/);
    if (!idm || !tm) continue;
    if (/service_message/.test(b)) continue;
    const title = postTitle(htmlToText(tm[1]!));
    if (!title || SKIP.test(title)) continue;
    const id = Number(idm[1]);
    const dm = b.match(/<time[^>]*datetime="([^"]+)"/);
    posts.push({ id, url: `https://t.me/${channel}/${id}`, title, date: dm?.[1] ?? null });
  }
  const seen = new Set<number>();
  return posts.filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true))).sort((a, b) => b.id - a.id);
}
