// Типы игрового ядра. Ядро не знает про React и про конкретные тексты:
// всё, что видит игрок, приходит из контента по ключам локализации.

export type Locale = "ru" | "en" | "de" | "uk";

/** Ключ строки в словаре локализации. */
export type TextKey = string;

export type NpcId = "dima" | "anna" | "sergey" | "neira" | "system";
export type AppId = "neira" | "orders" | "shop" | "skills" | "journal";
export type SlotId = "role" | "goal" | "recipient" | "audience" | "tone" | "data" | "limits" | "format" | "examples";
export type SkillId = "aiComm" | "aiLiteracy";
export type AvatarId = "a1" | "a2" | "a3" | "a4" | "a5" | "a6";
export type Pronoun = "he" | "she" | "they";

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

/** Сегмент ответа «Нейры»: берётся первый подходящий вариант. */
export interface ResponseSegment {
  id: string;
  variants: SegmentVariant[];
}

export type Criterion =
  | { id: string; labelKey: TextKey; weight: number; kind: "cards"; when: When; hard?: boolean }
  | { id: string; labelKey: TextKey; weight: number; kind: "maxLength"; max: number; hard?: boolean }
  | { id: string; labelKey: TextKey; weight: number; kind: "noHallucination"; hard?: boolean }
  | { id: string; labelKey: TextKey; weight: number; kind: "differsFromStage"; stage: number; slot: SlotId; hard?: boolean };

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
}

export interface Choice {
  id: string;
  textKey: TextKey;
  replyKey: TextKey;
}

export type QuestDef =
  | (QuestBase & { kind: "dialog"; npc: NpcId; promptKey: TextKey; choices: Choice[] })
  | (QuestBase & { kind: "prompt"; stages: PromptStage[]; client?: NpcId })
  | (QuestBase & { kind: "purchase" });

export interface QuestBase {
  id: string;
  titleKey: TextKey;
  stage: number;
  /** Задание появляется, когда выполнены все перечисленные. */
  requires: string[];
  /** Как задание приходит к игроку. */
  offer:
    | { type: "auto" }
    | { type: "message"; from: NpcId; textKey: TextKey }
    | { type: "board"; from: NpcId; textKey: TextKey };
  goalKey: TextKey;
  reward: Reward;
  /** Сообщения после выполнения: можно зависеть от качества. */
  onComplete?: { from: NpcId; textKey: TextKey; minQuality?: number; maxQuality?: number }[];
  hours?: number;
}

export interface ItemDef {
  id: string;
  nameKey: TextKey;
  descKey: TextKey;
  price: number;
  unlockSlots?: SlotId[];
  workHours?: number;
}

export interface SkillDef {
  id: SkillId;
  nameKey: TextKey;
  /** Число применений для уровней 1, 2, 3… */
  levels: number[];
}

export interface Content {
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
  profile: { name: string; avatar: AvatarId; pronoun: Pronoun };
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
  /** Всплывающие события для интерфейса (сбрасываются интерфейсом). */
  toasts: Toast[];
  nextMessageId: number;
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
  | { type: "submitPrompt"; questId: string; selection: Partial<Record<SlotId, string>> }
  | { type: "buy"; itemId: string }
  | { type: "readChat"; npc: NpcId }
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
  | { type: "bought"; itemId: string };
