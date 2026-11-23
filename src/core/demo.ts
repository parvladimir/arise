// Демо-заказ на промо-странице: можно сыграть без входа. Чистые данные и подсчёт, без интерфейса.
// Заработанные в демо ₵ переходят в новую игру (кука DEMO_COOKIE, см. api/access и CreateCharacter).

export const DEMO_COOKIE = "arise_demo";
export const DEMO_PER_PICK = 50;
export const DEMO_BONUS = DEMO_PER_PICK * 3;

export type DemoSlot = "role" | "task" | "format";

export interface DemoOption {
  id: string;
  text: string;
  good: boolean;
  /** Почему эта карточка слабая: показываем после ответа ИИ. */
  why?: string;
}

export interface DemoRow {
  slot: DemoSlot;
  label: string;
  hint: string;
  options: DemoOption[];
}

export const DEMO_CLIENT = {
  name: "Кофейня «Зерно»",
  message: "Привет! Запускаем тыквенный латте, до воскресенья скидка 20%. Нужен пост для нашего Telegram-канала. Мы на Садовой, 5.",
};

// Порядок вариантов перемешан, чтобы верный не был всегда первым.
export const DEMO_ROWS: DemoRow[] = [
  {
    slot: "role",
    label: "Кем быть ИИ",
    hint: "Роль задаёт тон и стиль ответа",
    options: [
      { id: "r-none", text: "Ты ИИ", good: false, why: "Без роли ИИ пишет сухо, как справочник." },
      { id: "r-smm", text: "Ты SMM-менеджер уютной кофейни", good: true },
      { id: "r-poet", text: "Ты великий поэт", good: false, why: "Поэт напишет красиво, но не продающий пост." },
    ],
  },
  {
    slot: "task",
    label: "Что сделать",
    hint: "Задача и факты, которых ИИ сам не знает",
    options: [
      { id: "t-short", text: "Напиши пост про кофе", good: false, why: "ИИ не знал про латте, скидку и адрес и придумал общие слова." },
      { id: "t-guess", text: "Напиши рекламу нового напитка", good: false, why: "Какого напитка? Без фактов ИИ угадывает." },
      { id: "t-full", text: "Пост про тыквенный латте: скидка 20% до воскресенья, Садовая, 5", good: true },
    ],
  },
  {
    slot: "format",
    label: "Какой нужен ответ",
    hint: "Формат: длина, вид, концовка",
    options: [
      { id: "f-tg", text: "До 300 знаков, 2 эмодзи, в конце позвать в гости", good: true },
      { id: "f-any", text: "Как хочешь", good: false, why: "Без формата ИИ сам решает длину и стиль и часто выдаёт полотно, которое не дочитают." },
      { id: "f-long", text: "Подробно, на страницу", good: false, why: "Для поста в канале страница текста слишком много." },
    ],
  },
];

export type DemoPicks = Partial<Record<DemoSlot, string>>;

const pick = (picks: DemoPicks, slot: DemoSlot) => DEMO_ROWS.find((r) => r.slot === slot)?.options.find((o) => o.id === picks[slot]);

export const demoComplete = (picks: DemoPicks) => DEMO_ROWS.every((r) => pick(picks, r.slot));

export interface DemoResult {
  good: number;
  reward: number;
  answer: string;
  /** Пояснения к слабым карточкам. */
  notes: string[];
}

const ANSWERS = {
  perfect:
    "🎃 Осень пришла в «Зерно»! Новый тыквенный латте с корицей и нежной пенкой уже ждёт тебя. До воскресенья скидка 20%. Заходи на Садовую, 5, согреем! ☕",
  vague:
    "Кофе — один из самых популярных напитков в мире. Он бодрит, поднимает настроение и помогает начать день. Приходите к нам за вкусным кофе!",
  dry: "Тыквенный латте. Скидка 20% до воскресенья. Адрес: Садовая, 5.",
  poet: "Шуршит листва, и тыква спит в саду,\nА я к тебе за латте в «Зерно» приду…\nСо скидкой двадцать (до воскресенья, чу!),\nНа Садовой, пять, я счастье получу.",
  long:
    "Дорогие гости! Мы рады сообщить вам, что в нашей кофейне «Зерно» появился новый напиток — тыквенный латте. Его история начинается с осенних традиций… Тыквенный латте готовится на основе эспрессо, молока и тыквенного пюре со специями: корицей, мускатным орехом, гвоздикой и имбирём. Каждый из этих ингредиентов… (и ещё 2000 знаков)",
};

/** Ответ «Нейры» и награда за собранный промпт. Слабые карточки дают узнаваемо слабый ответ. */
export function demoResult(picks: DemoPicks): DemoResult {
  const role = pick(picks, "role");
  const task = pick(picks, "task");
  const format = pick(picks, "format");
  const chosen = [role, task, format].filter((o): o is DemoOption => Boolean(o));
  const good = chosen.filter((o) => o.good).length;
  const answer = !task?.good
    ? ANSWERS.vague
    : !format?.good
      ? ANSWERS.long
      : role?.id === "r-poet"
        ? ANSWERS.poet
        : !role?.good
          ? ANSWERS.dry
          : ANSWERS.perfect;
  return { good, reward: good * DEMO_PER_PICK, answer, notes: chosen.filter((o) => !o.good && o.why).map((o) => o.why as string) };
}

/** Сколько ₵ принести в новую игру из куки демо (защита от подделки: только 0…DEMO_BONUS). */
export function demoBonusFrom(raw: string | undefined | null): number {
  const n = Math.floor(Number(raw));
  return Number.isFinite(n) ? Math.max(0, Math.min(DEMO_BONUS, n)) : 0;
}

/** Промпт, собранный из карточек, как его увидит игрок. */
export const demoPrompt = (picks: DemoPicks) =>
  DEMO_ROWS.map((r) => pick(picks, r.slot)?.text)
    .filter(Boolean)
    .join(". ") + (demoComplete(picks) ? "." : "");
