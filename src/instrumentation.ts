// Запуск Telegram-бота доступа вместе с сервером игры (только на сервере и только если задан токен).
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.GAME_BOT_TOKEN && process.env.GAME_BOT_POLL !== "off") {
    const { startBot } = await import("./server/bot");
    startBot();
  }
}
