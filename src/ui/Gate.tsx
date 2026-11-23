// Промо-страница перед игрой: сразу демо-заказ без входа, потом как получить доступ (подписка на ТАКТ AI через Telegram-бота).
// Показывается, пока в браузере нет личного ключа из бота (см. src/server/access.ts).

import { existsSync } from "node:fs";
import { join } from "node:path";
import { Mascot, TaktLogo } from "./Mascot";
import { GateDemo } from "./GateDemo";
import { GateLogin } from "./GateLogin";

const PROMO_VIDEO = "/promo/ai-rise.mp4";
/** Счётчик игроков показываем, когда цифра уже убеждает. */
const SHOW_PLAYERS_FROM = 100;

const POINTS = [
  { icon: "✦", title: "Промпты на живых задачах", text: "Письмо хозяину, SMS для автосервиса, реклама для кафе. Каждый заказ учит писать запросы так, чтобы нейросеть понимала с первого раза." },
  { icon: "◆", title: "Как устроен ИИ", text: "Уроки в Школе ТАКТ: токены, контекст, галлюцинации, роли. Коротко, с примерами и сразу в деле." },
  { icon: "▲", title: "Карьера с нуля до студии", text: "Берёшь заказы, зарабатываешь, покупаешь технику, самокат, машину и растишь свою ИИ-студию." },
  { icon: "●", title: "Навык, который пригодится", text: "После игры ты пишешь промпты осознанно: роль, контекст, формат, ограничения. Это то, за что сегодня платят." },
];

const STEPS = ["Открой бота ТАКТ AI в Telegram", "Подпишись на канал «ТАКТ все про ИИ»", "Получи личную ссылку на игру и гайд «10 нейросетей» в подарок"];

const plural = (n: number) => (n % 10 === 1 && n % 100 !== 11 ? "человек" : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? "человека" : "человек");

export function Gate({ botUrl, demoUrl, players = 0, igUrl, bad }: { botUrl: string; demoUrl: string; players?: number; igUrl?: string; bad?: boolean }) {
  const hasVideo = existsSync(join(process.cwd(), "public", PROMO_VIDEO));
  return (
    <main className="menu-bg relative min-h-dvh overflow-hidden px-4 pb-16 pt-4 sm:px-8">
      <header className="mx-auto flex max-w-5xl items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <TaktLogo className="h-7" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted">ТАКТ AI</span>
        </div>
        <a href="#login" className="rounded-full border border-white/15 px-3 py-1.5 text-sm font-semibold transition hover:border-white/30">
          Уже играю →
        </a>
      </header>

      <div className="mx-auto mt-6 flex max-w-5xl flex-col items-center gap-8 lg:flex-row lg:items-start lg:gap-14">
        <section className="w-full max-w-xl text-center lg:pt-6 lg:text-left">
          <h1 className="menu-title text-5xl font-black leading-[0.95] tracking-tight sm:text-7xl">
            <span className="block">AI</span>
            <span className="menu-title-rise block">RISE</span>
          </h1>
          <p className="mx-auto mt-4 max-w-md text-lg lg:mx-0">
            Сосед сделал с ИИ за минуту то, над чем ты сидишь три часа. <b>Научись так же</b> и дорасти до своей ИИ-студии.
          </p>
          {players >= SHOW_PLAYERS_FROM && (
            <p className="mt-3 text-sm text-muted">
              🔥 Уже играют <b className="text-ink">{players.toLocaleString("ru-RU")}</b> {plural(players)}
            </p>
          )}

          {bad && (
            <p role="alert" className="mx-auto mt-5 max-w-md rounded-xl border border-bad/40 bg-bad/10 px-4 py-3 text-sm lg:mx-0">
              Эта ссылка не подошла. Возьми свежую у бота: он пришлёт её заново за пару секунд.
            </p>
          )}

          <p className="mt-5 hidden text-sm text-muted lg:block">Справа первый заказ. Сыграй его прямо здесь, без входа →</p>
        </section>

        <section className="w-full max-w-md">
          <GateDemo botUrl={demoUrl} />
        </section>
      </div>

      <section className="mx-auto mt-12 max-w-5xl">
        <div className="flex flex-col items-center gap-8 lg:flex-row lg:items-start lg:gap-14">
          <div className="w-full max-w-xl text-center lg:text-left">
            <h2 className="text-2xl font-bold">Как попасть в игру</h2>
            <p className="mt-2 text-sm text-muted">Бесплатно. Нужна только подписка на канал ТАКТ AI. В подарок гайд «10 нейросетей для новичка».</p>
            <ol className="mx-auto mt-4 grid max-w-md gap-2 text-left lg:mx-0">
              {STEPS.map((s, i) => (
                <li key={s} className="flex items-center gap-3 rounded-xl border border-white/10 bg-surface/70 px-4 py-3 text-sm">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ai/20 font-bold text-ai">{i + 1}</span>
                  {s}
                </li>
              ))}
            </ol>
            <div className="mt-5 flex flex-col items-center gap-3 sm:flex-row lg:items-start">
              <a
                href={botUrl}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-ai px-6 py-3 text-base font-bold text-white shadow-lg shadow-ai/30 transition hover:brightness-110"
              >
                ✈ Получить доступ в Telegram
              </a>
              {igUrl && (
                <a
                  href={igUrl}
                  className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-white/15 px-5 py-3 text-sm font-semibold text-ink/90 transition hover:border-white/30"
                >
                  ТАКТ AI в Instagram ↗
                </a>
              )}
            </div>
          </div>
          <div className="w-full max-w-md">
            {hasVideo ? (
              <video
                src={PROMO_VIDEO}
                className="mx-auto aspect-[9/16] w-full max-w-xs rounded-3xl border border-white/10 bg-black shadow-2xl shadow-ai/20"
                controls
                playsInline
                muted
                autoPlay
                loop
                preload="metadata"
              />
            ) : (
              <div className="flex justify-center">
                <Mascot pose="wave" className="h-72" />
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto mt-14 grid max-w-5xl gap-3 sm:grid-cols-2">
        {POINTS.map((p) => (
          <article key={p.title} className="rounded-2xl border border-white/10 bg-surface/70 p-5">
            <h2 className="flex items-center gap-2 text-base font-bold">
              <span className="text-ai">{p.icon}</span>
              {p.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{p.text}</p>
          </article>
        ))}
      </section>

      <section id="login" className="mx-auto mt-10 max-w-md scroll-mt-6">
        <GateLogin botUrl={botUrl} />
        <p className="mt-4 text-center text-sm text-muted">
          Игра переехала на game.taktai.de. Если ты уже играл, но видишь эту страницу, открой ссылку из бота ещё раз или войди по почте: прогресс на месте.
        </p>
      </section>
    </main>
  );
}
