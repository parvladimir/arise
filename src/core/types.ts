// Типы игрового ядра. Ядро не знает про React и про конкретные тексты:
// всё, что видит игрок, приходит из контента по ключам локализации.

export type Locale = "ru" | "en" | "de" | "uk";

/** Ключ строки в словаре локализации. */
export type TextKey = string;

export type NpcId = "dima" | "anna" | "sergey" | "olga" | "alex" | "nick" | "boris" | "vera" | "editor" | "neira" | "system";
export type AppId = "neira" | "orders" | "shop" | "skills" | "journal" | "school";
export type SlotId = "role" | "goal" | "recipient" | "audience" | "tone" | "data" | "limits" | "format" | "examples";
export type SkillId = "aiComm" | "aiLiteracy";
export type AvatarId = "a1" | "a2" | "a3" | "a4" | "a5" | "a6" | "a7" | "a8" | "a9" | "a10" | "a11" | "a12";
export type Pronoun = "he" | "she" | "they";
/** Уровень игрока: новичок проходит школу и азы, профи получает задания строже и оплату выше. */
export type Level = "novice" | "practice" | "pro";

// ---------- Контент ----------

export interface PromptCard {
  id: string;
  slot: SlotId;
  textKey: TextKey;
}

/** Условие: в каждом из перечисленных слотов выбрана одна из перечисленных карточек. */
export type When = Partial<Record<SlotId, string[]>>;

export interface SegmentVariant {
  when?: When;
  /** Пустая строка — сегмент пропускается. */
  textKey: TextKey | "";
  /** Вариант — выдумка ИИ (подсвечивается после проверки). */
  hallucination?: boolean;
}

/** Сегмент ответа «ТАКТ ИИ»: берётся первый подходящий вариант. */
export interface ResponseSegment {
  id: string;
  variants: SegmentVariant[];
}

export type Criterion =
  | { id: string; labelKey: TextKey; weight: number; kind: "cards"; when: When; hard?: boolean }
  | { id: string; labelKey: TextKey; weight: number; kind: "maxLength"; max: number; hard?: boolean }
  | { id: string; labelKey: TextKey; weight: number; kind: "noHallucination"; hard?: boolean; /** Подсказка, если причину выдумки не свести к одной карточке */ hintKey?: TextKey }
  | { id: string; labelKey: TextKey; weight: number; kind: "differsFromStage"; stage: number; slot: SlotId; hard?: boolean }
  /** Карточка в слоте совпадает с выбранной на одной из прошлых стадий (согласованность кампании). */
  | { id: string; labelKey: TextKey; weight: number; kind: "sameAsStage"; stage: number; slot: SlotId; hard?: boolean };

/** Реплика заказчика под ответом ТАКТ ИИ: показывается первая подходящая. */
export interface Reaction {
  when?: When;
  from: NpcId;
  textKey: TextKey;
}

export interface PromptStage {
  taskKey: TextKey;
  slots: SlotId[];
  /** Карточки, доступные на этой стадии. */
  cards: string[];
  /** Слоты, без которых нельзя отправить запрос. */
  required: SlotId[];
  segments: ResponseSegment[];
  criteria: Criterion[];
  /** Порог качества 0..1. */
  pass: number;
  /** Сообщение NPC после успешной стадии (кроме последней). */
  afterPass?: { from: NpcId; textKey: TextKey };
  reactions?: Reaction[];
}

export interface Reward {
  xp: number;
  /** Оплата заказа считается формулой экономики; 0 — без денег. */
  pay?: { complexity: number; client: number };
  skills?: Partial<Record<SkillId, number>>;
  achievements?: string[];
  unlockApps?: AppId[];
  unlockSlots?: SlotId[];
  rep?: number;
  milestoneKey?: TextKey;
  /** Флаги сюжета: запоминают решения игрока. */
  flags?: string[];
  /** Изменение отношений с персонажами. */
  rel?: Partial<Record<NpcId, number>>;
  /** Множитель оплаты, если у игрока есть флаг (например, скидка после сорванного срока). */
  payByFlag?: Record<string, number>;
}

export interface Choice {
  id: string;
  textKey: TextKey;
  replyKey: TextKey;
  /** Последствия выбора: флаги, отношения, репутация. */
  effects?: { flags?: string[]; rel?: Partial<Record<NpcId, number>>; rep?: number };
}

/** Мини-игра «разложи по корзинам»: факт-чек, приватность. */
export interface ClassifyItem {
  id: string;
  textKey: TextKey;
  answer: string;
  /** Вес ошибки: пропущенная выдумка весит больше ложной тревоги. */
  weight: number;
  /** Пояснение после проверки. */
  explainKey?: TextKey;
}

export type QuestDef =
  | (QuestBase & { kind: "dialog"; npc: NpcId; promptKey: TextKey; choices: Choice[] })
  | (QuestBase & { kind: "prompt"; stages: PromptStage[]; client?: NpcId })
  | (QuestBase & { kind: "purchase"; /** Какие товары закрывают задание (по умолчанию — любой). */ items?: string[] })
  | (QuestBase & {
      kind: "classify";
      client?: NpcId;
      game: "factcheck" | "privacy" | "spot";
      introKey: TextKey;
      /** Текст-источник (абзацы статьи или строки выгрузки). */
      sourceKeys: TextKey[];
      sourceTitleKey: TextKey;
      items: ClassifyItem[];
      options: { id: string; labelKey: TextKey }[];
      pass: number;
      /** Быстрый путь без мини-игры (например, «вставить всё как есть»). */
      shortcut?: { labelKey: TextKey; flags: string[]; rep: number; replyKey: TextKey };
      /** Сообщение, если игрок ошибся в конкретном пункте. */
      onMissed?: { itemId: string; from: NpcId; textKey: TextKey }[];
      /** Режим на время: секунды на всю проверку; неотмеченные пункты считаются ошибкой. */
      timer?: number;
    });

export interface QuestBase {
  id: string;
  titleKey: TextKey;
  stage: number;
  /** Задание появляется, когда выполнены все перечисленные. */
  requires: string[];
  /** Задание появляется только при этом флаге / только без этого флага. */
  requiresFlag?: string;
  requiresNoFlag?: string;
  /** Как задание приходит к игроку. */
  offer:
    | { type: "auto" }
    | { type: "message"; from: NpcId; textKey: TextKey }
    | { type: "board"; from: NpcId; textKey: TextKey };
  goalKey: TextKey;
  /** Цель, пока задание уже взято (если отличается от goalKey). */
  activeGoalKey?: TextKey;
  reward: Reward;
  /** Сообщения после выполнения: можно зависеть от качества. */
  /** Подработка: после сдачи снова появляется на доске. Не считается сюжетной целью. */
  repeatable?: boolean;
  onComplete?: { from: NpcId; textKey: TextKey; minQuality?: number; maxQuality?: number; whenSel?: When; flag?: string; noFlag?: string }[];
  hours?: number;
}

export interface ItemDef {
  id: string;
  nameKey: TextKey;
  descKey: TextKey;
  price: number;
  unlockSlots?: SlotId[];
  workHours?: number;
  /** Флаги, которые даёт покупка (например, «ТАКТ Плюс» включает самопроверку). */
  flags?: string[];
  /** Товар появляется в магазине, только когда это задание открыто. */
  requiresQuest?: string;
  /** Раздел магазина: мелочи, работа, транспорт, команда, жильё. */
  category?: ItemCategory;
  icon?: string;
  /** Сначала нужно купить этот товар (лестница целей: самокат → машина). */
  requiresItem?: string;
  /** Прибавка к оплате всех заказов: 0.1 = +10%. */
  payBoost?: number;
  /** Прибавка к опыту за заказы: 0.1 = +10%. */
  xpBoost?: number;
  /** Пассивный доход: кредиты в час реального времени, пока игрок занят другим (копится до 12 часов). */
  incomePerHour?: number;
  rep?: number;
  achievement?: string;
}

export type ItemCategory = "comfort" | "work" | "transport" | "team" | "home";

export interface SkillDef {
  id: SkillId;
  nameKey: TextKey;
  /** Число применений для уровней 1, 2, 3… */
  levels: number[];
}

/** Короткий урок перед заданием: теория, плохой и хороший пример, вывод. */
export interface LessonDef {
  id: string;
  questId: string;
  titleKey: TextKey;
  bodyKeys: TextKey[];
  badKey?: TextKey;
  goodKey?: TextKey;
  takeawayKey: TextKey;
}

/** Термин словаря: открывается, когда задание взято в работу. */
export interface GlossaryDef {
  id: string;
  termKey: TextKey;
  defKey: TextKey;
  questId: string;
}

// ---------- Школа ТАКТ ИИ: обучающие мини-игры ----------

/** Вопрос с вариантами: «правда или миф», «какой ИИ подходит», «какой промпт сильнее». */
export interface SchoolQuizItem {
  qKey: TextKey;
  /** Варианты ответа; если не заданы — берутся общие варианты модуля. */
  optionKeys?: TextKey[];
  /** Индекс верного варианта. */
  answer: number;
  explainKey: TextKey;
}

/** Сборка промпта по частям: на каждом шаге нужно выбрать кусок нужного типа. */
export interface SchoolBuildRound {
  taskKey: TextKey;
  parts: { labelKey: TextKey; pieceKey: TextKey; hintKey: TextKey }[];
  decoyKeys: TextKey[];
  resultKey: TextKey;
}

/** Найди выдумку: факты пользователя и ответ ИИ, где часть фраз придумана. */
export interface SchoolSpotRound {
  factsKey: TextKey;
  sentences: { key: TextKey; fake: boolean }[];
}

export type SchoolModule = {
  id: string;
  icon: string;
  titleKey: TextKey;
  introKey: TextKey;
  takeawayKey: TextKey;
  /** Для каких уровней модуль входит в обязательный старт. */
  core?: boolean;
} & (
  | { kind: "quiz"; optionKeys?: TextKey[]; items: SchoolQuizItem[] }
  | { kind: "build"; rounds: SchoolBuildRound[] }
  | { kind: "spot"; rounds: SchoolSpotRound[] }
);

export interface Content {
  school: SchoolModule[];
  lessons: LessonDef[];
  glossary: GlossaryDef[];
  quests: QuestDef[];
  cards: PromptCard[];
  items: ItemDef[];
  skills: SkillDef[];
  finalGoalKey: TextKey;
}

// ---------- Состояние ----------

export type QuestStatus = "available" | "active" | "done";

export interface QuestProgress {
  status: QuestStatus;
  stage: number;
  attempts: number;
  bestQuality: number;
  /** Выбор игрока на каждой стадии (для критерия differsFromStage). */
  selections: Record<number, Partial<Record<SlotId, string>>>;
  choice?: string;
  /** Сколько раз сдана подработка. */
  runs?: number;
}

export interface ChatMessage {
  id: number;
  npc: NpcId;
  from: "npc" | "player";
  textKey: TextKey;
  vars?: Record<string, string | number>;
  /** Если есть — игрок должен выбрать ответ. */
  choices?: { questId: string; options: Choice[] };
  /** Кнопка «Взять заказ». */
  offerQuest?: string;
}

export interface LedgerEntry {
  /** Ключ идемпотентности: одна выплата на ключ. */
  key: string;
  delta: number;
  reasonKey: TextKey;
  day: number;
}

export interface GameState {
  schemaVersion: number;
  profile: { name: string; avatar: AvatarId; pronoun: Pronoun; level?: Level };
  money: number;
  xp: number;
  rep: number;
  day: number;
  hour: number;
  skills: Record<SkillId, number>;
  inventory: string[];
  apps: AppId[];
  slots: SlotId[];
  quests: Record<string, QuestProgress>;
  messages: ChatMessage[];
  unread: NpcId[];
  ledger: LedgerEntry[];
  achievements: string[];
  /** Решения игрока, которые влияют на сюжет. */
  flags: string[];
  /** Отношения с персонажами: от −5 до +5. */
  relations: Partial<Record<NpcId, number>>;
  /** Прочитанные уроки. */
  lessons: string[];
  /** Всплывающие события для интерфейса (сбрасываются интерфейсом). */
  toasts: Toast[];
  nextMessageId: number;
  /** Когда последний раз забирали пассивный доход (мс). */
  incomeAt?: number;
}

export type Toast =
  | { kind: "money"; amount: number }
  | { kind: "xp"; amount: number }
  | { kind: "achievement"; id: string }
  | { kind: "skill"; skill: SkillId; level: number }
  | { kind: "unlock"; app: AppId }
  | { kind: "milestone"; textKey: TextKey };

export type Action =
  | { type: "newGame"; profile: GameState["profile"] }
  | { type: "choose"; questId: string; choiceId: string }
  | { type: "acceptQuest"; questId: string }
  | { type: "submitPrompt"; questId: string; selection: Partial<Record<SlotId, string>>; freeform?: boolean }
  | { type: "buy"; itemId: string; now?: number }
  | { type: "collectIncome"; now: number }
  | { type: "submitClassify"; questId: string; answers: Record<string, string> }
  | { type: "takeShortcut"; questId: string }
  | { type: "readChat"; npc: NpcId }
  | { type: "seeLesson"; lessonId: string }
  | { type: "finishSchool"; moduleId: string; correct: number; total: number }
  | { type: "clearToasts" };

export interface CriterionResult {
  id: string;
  labelKey: TextKey;
  weight: number;
  passed: boolean;
  hard: boolean;
}

export interface PromptResult {
  segments: { id: string; textKey: TextKey; hallucination: boolean }[];
  length: number;
  quality: number;
  criteria: CriterionResult[];
  passed: boolean;
}

export type GameEvent =
  | { type: "rejected"; reasonKey: TextKey }
  | { type: "promptResult"; questId: string; stage: number; result: PromptResult; pay: number; finished: boolean }
  | { type: "questDone"; questId: string }
  | { type: "bought"; itemId: string }
  | { type: "classifyResult"; questId: string; quality: number; passed: boolean; wrong: string[]; pay: number };
