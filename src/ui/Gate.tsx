// Промо-страница перед игрой: что даёт AI RISE и как получить доступ (подписка на ТАКТ AI через Telegram-бота).
// Показывается, пока в браузере нет личного ключа из бота (см. src/server/access.ts).

import { existsSync } from "node:fs";
import { join } from "node:path";
import { Mascot, TaktLogo } from "./Mascot";

const PROMO_VIDEO = "/promo/ai-rise.mp4";

const POINTS = [
  { icon: "✦", title: "Промпты на живых задачах", text: "Письмо хозяину, SMS для автосервиса, реклама для кафе. Каждый заказ учит писать запросы так, чтобы нейросеть понимала с первого раза." },
  { icon: "◆", title: "Как устроен ИИ", text: "Уроки в Школе ТАКТ: токены, контекст, галлюцинации, роли. Коротко, с примерами и сразу в деле." },
  { icon: "▲", title: "Карьера с нуля до агентства", text: "Берёшь заказы, зарабатываешь, покупаешь технику и жильё, растишь своё ИИ-агентство." },
  { icon: "●", title: "Навык, который пригодится", text: "После игры ты пишешь промпты осознанно: роль, контекст, формат, ограничения. Это то, за что сегодня платят." },
];

const STEPS = ["Открой бота ТАКТ AI в Telegram", "Подпишись на канал «ТАКТ все про ИИ»", "Получи личную ссылку на игру и гайд «10 нейросетей» в подарок"];

export function Gate({ botUrl, igUrl, bad }: { botUrl: string; igUrl?: string; bad?: boolean }) {
  const hasVideo = existsSync(join(process.cwd(), "public", PROMO_VIDEO));
  return (
    <main className="menu-bg relative min-h-dvh overflow-hidden px-4 pb-16 pt-8 sm:px-8">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-10 lg:flex-row lg:items-start lg:gap-14">
        <section className="w-full max-w-xl text-center lg:pt-6 lg:text-left">
          <div className="flex items-center justify-center gap-3 lg:justify-start">
            <TaktLogo className="h-9" />
            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">ТАКТ AI представляет</span>
          </div>
          <h1 className="menu-title mt-5 text-6xl font-black leading-[0.95] tracking-tight sm:text-7xl">
            <span className="block">AI</span>
            <span className="menu-title-rise block">RISE</span>
          </h1>
          <p className="mx-auto mt-5 max-w-md text-lg text-muted lg:mx-0">
            Игра, в которой учишься работать с нейросетями: от первого промпта до своей ИИ-компании.
          </p>

          {bad && (
            <p role="alert" className="mx-auto mt-5 max-w-md rounded-xl border border-bad/40 bg-bad/10 px-4 py-3 text-sm lg:mx-0">
              Эта ссылка не подошла. Возьми свежую у бота: он пришлёт её заново за пару секунд.
            </p>
          )}

          <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row lg:items-start">
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
          <p className="mt-3 text-sm text-muted">Бесплатно. Нужна только подписка на канал ТАКТ AI. В подарок ещё и гайд «10 нейросетей для новичка».</p>

          <ol className="mx-auto mt-8 grid max-w-md gap-2 text-left lg:mx-0">
            {STEPS.map((s, i) => (
              <li key={s} className="flex items-center gap-3 rounded-xl border border-white/10 bg-surface/70 px-4 py-3 text-sm">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ai/20 font-bold text-ai">{i + 1}</span>
                {s}
              </li>
            ))}
          </ol>
        </section>

        <section className="w-full max-w-md">
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
        </section>
      </div>

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

      <p className="mx-auto mt-10 max-w-5xl text-center text-sm text-muted">
        Уже играл и заходил в аккаунт? Войди через бота ещё раз: ссылка та же, прогресс на месте.
      </p>
    </main>
  );
}
