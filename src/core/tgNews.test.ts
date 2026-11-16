import { describe, expect, it } from "vitest";
import { parseTgChannel, postTitle } from "./tgNews";

const html = `
<div class="tgme_widget_message_wrap js-widget_message_wrap"><div class="tgme_widget_message text_not_supported_wrap js-widget_message" data-post="takt_news_ai/41" data-view="x">
<div class="tgme_widget_message_text js-message_text" dir="auto"><i class="emoji" style="background-image:url('//x')"><b>🔥</b></i> <b>Gemini 3 вышел &mdash; что это значит для вас</b><br/><br/>Коротко: модель стала быстрее.<br/><a href="?q=%23новичку">#новичку</a></div>
<a class="tgme_widget_message_date" href="https://t.me/takt_news_ai/41"><time datetime="2026-11-15T18:00:00+00:00" class="time">18:00</time></a></div></div>
<div class="tgme_widget_message_wrap js-widget_message_wrap"><div class="tgme_widget_message js-widget_message" data-post="takt_news_ai/42">
<div class="tgme_widget_message_text js-message_text" dir="auto">Claude Code: плагины &amp; скиллы #вышло #практику<br/>Подробности внутри.</div>
<time datetime="2026-11-16T08:00:00+00:00"></time></div></div>
<div class="tgme_widget_message_wrap js-widget_message_wrap"><div class="tgme_widget_message js-widget_message" data-post="takt_news_ai/43"><div class="tgme_widget_message_photo_wrap"></div></div></div>`;

describe("лента Telegram-канала", () => {
  it("достаёт посты с текстом, новые сначала, без хештегов в заголовке", () => {
    const posts = parseTgChannel(html, "takt_news_ai");
    expect(posts.map((p) => p.id)).toEqual([42, 41]);
    expect(posts[0]).toMatchObject({ title: "Claude Code: плагины & скиллы", url: "https://t.me/takt_news_ai/42", date: "2026-11-16T08:00:00+00:00" });
    expect(posts[1]!.title).toBe("🔥 Gemini 3 вышел — что это значит для вас");
  });

  it("длинный заголовок обрезается многоточием", () => {
    expect(postTitle("а".repeat(200), 20)).toHaveLength(20);
  });

  it("пустая или чужая страница даёт пустой список", () => {
    expect(parseTgChannel("<html></html>", "takt_news_ai")).toEqual([]);
  });
});
