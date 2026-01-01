import { KEY_CAP_IDS } from "@/interfaces/key-cap-id";

export type KeyCapId = typeof KEY_CAP_IDS[number]; // Re-export KeyCapId

export type KeyCapLabel = { symbol?: string };
/** Маркер для обозначения клавиш на 'домашнем' ряду (F и J). */
export type KeyCapHomeKeyMarker = "BAR" | "DOT" | "NONE";
/**
 * Определяет навигационную роль клавиши в текущем упражнении.
 * Используется для визуальных подсказок пользователю.
 */
export type KeyCapNavigationRole =
  /** Клавиша не участвует в текущей навигации. */
  | "IDLE"
  /** Исходная позиция пальца для текущего нажатия (якорная клавиша). */
  | "HOME"
  /** Клавиша находится на пути движения пальца от 'HOME' к 'TARGET'. */
  | "PATH"
  /** Целевая клавиша, которую необходимо нажать. */
  | "TARGET";

/** Результат нажатия клавиши пользователем. */
export type KeyCapPressResult =
  /** Нейтральное состояние, нажатие еще не оценено. */
  | "NEUTRAL"
  /** Нажатие было правильным. */
  | "CORRECT"
  /** Нажатие было ошибочным. */
  | "INCORRECT";

/** Стандартные размеры ширины клавиш, выраженные в "юнитах" (1U ~ 19мм). */
export type KeyCapUnitWidth = "1U" | "1.25U" | "1.5U" | "1.75U" | "2U" | "5U";
/** Группа цвета клавиши для визуального разделения. */
export type KeyCapColorGroup = "PRIMARY" | "SECONDARY" | "ACCENT";
/**
 * Функциональный тип клавиши.
 * @see /TASKS.md
 */
export type KeyCapType =
  /** Клавиша, вводящая символ (буква, цифра, знак). */
  | "SYMBOL"
  /** Системная/управляющая клавиша (Enter, Backspace, Tab). */
  | "SYSTEM"
  /** Клавиша-модификатор (Shift, Alt, Ctrl). */
  | "MODIFIER";

/** Размер символа (легенды) на клавише. */
export type KeyCapSymbolSize = "MD" | "SM" | "XS";
/** Видимость UI элемента. */
export type Visibility = "INVISIBLE" | "VISIBLE";

// --- Finger and Hand Types ---

/** Константы для идентификаторов пальцев левой руки. */
export const LEFT_HAND_FINGER_IDS = ["L1", "L2", "L3", "L4", "L5", "LB"] as const;
/** Константы для идентификаторов пальцев правой руки. */
export const RIGHT_HAND_FINGER_IDS = ["R1", "R2", "R3", "R4", "R5", "RB"] as const;

/** Идентификаторы пальцев левой руки. */
export type LeftHandFingerId = typeof LEFT_HAND_FINGER_IDS[number];
/** Идентификаторы пальцев правой руки. */
export type RightHandFingerId = typeof RIGHT_HAND_FINGER_IDS[number];

/**
 * Уникальный идентификатор пальца.
 * L/R - левая/правая рука.
 * 1: Большой (Thumb)
 * 2: Указательный (Index)
 * 3: Средний (Middle)
 * 4: Безымянный (Ring)
 * 5: Мизинец (Little)
 * B: Основание кисти (Base)
 */
export type FingerId = LeftHandFingerId | RightHandFingerId;

/** Состояние отдельного пальца. */
export type FingerState = "IDLE" | "ACTIVE" | "INACTIVE" | "INCORRECT";

/** Объединение всех идентификаторов пальцев и кистей. */
export type HandFingerId = FingerId;

// --- FlowLine Types ---

/** Состояние компонента FlowLine. */
export type FlowLineState = "START" | "TYPING" | "PAUSE" | "END"
/** Тип курсора в FlowLine. */
export type FlowLineCursorType = "RECTANGLE" | "UNDERSCORE" | "VERTICAL"
/** Состояние отдельного символа в FlowLine. */
export type FlowLineSymbolType = "PENDING" | "CORRECT" | "INCORRECT" | "INCORRECTS" | "CORRECTED"
/** Размер шрифта в FlowLine. */
export type FlowLineSize = "XS" | "SM" | "MD" |"LG" | "XL"
/** Режим отображения курсора в FlowLine. */
export type FlowLineCursorMode = "HALF" | "THIRD" | "QUARTER" | "DINAMIC"

// --- Typing Stream and Attempts ---

/**
 * Представляет одно конкретное нажатие клавиши пользователем.
 * Эта структура данных является частью "Попытки" (`StreamAttempt`).
 */
export type TypedKey = {
  /** Идентификатор нажатой физической клавиши (например, `KeyA`). */
  keyCapId: KeyCapId;
  /** Была ли зажата клавиша Shift во время нажатия. */
  shift: boolean;
  /** Было ли это нажатие правильным для целевого символа. */
  isCorrect: boolean;
};

/**
 * Представляет одну попытку пользователя набрать целевой символ.
 * Включает в себя информацию о нажатой клавише и времени.
 */
export type StreamAttempt = {
  /** Данные о нажатой клавише. */
  typedKey: TypedKey;
  /** Время начала нажатия (timestamp). */
  startAt: number;
  /** Время окончания нажатия (timestamp). */
  endAt: number;
};

/**
 * Расширенное представление одного символа в упражнении.
 * Включает сам символ и историю попыток его набора.
 */
export type StreamSymbol = {
  /** Целевой символ, который пользователь должен набрать. */
  targetSymbol: string;
  /** Массив всех попыток набора этого символа. */
  attempts: StreamAttempt[];
};

/**
 * Поток символов для набора. Представляет собой полное упражнение.
 * Является источником данных для `FlowLine`.
 */
export type TypingStream = StreamSymbol[];

// --- Layout Types ---

/** Описывает одну физическую клавишу: ее геометрию и базовый тип. */
export type PhysicalKey = {
  keyCapId: KeyCapId;
  unitWidth?: KeyCapUnitWidth;
  symbolSize?: KeyCapSymbolSize;
  homeKeyMarker?: KeyCapHomeKeyMarker;
  colorGroup?: KeyCapColorGroup;
  type: KeyCapType;
};
/**
 * Физический макет клавиатуры (холост).
 * Описывает геометрию: расположение, размер и форму клавиш в виде двумерного массива.
 */
export type KeyboardLayout =  PhysicalKey[][];

/** Описывает привязку пальца к клавише. */
export type FingerKey = {
  fingerId: FingerId;
  isHomeKey?: boolean;
};
/**
 * Пальцевый макет (инструкция).
 * Определяет, каким пальцем следует нажимать каждую клавишу.
 * Представляет собой объект, где ключ - `KeyCapId`, значение - `FingerKey`.
 */
export type FingerLayout = Partial<Record<KeyCapId, FingerKey>>;

/**
 * Символьный макет (слой краски).
 * Определяет, какой символ (`'a'`, `'!'`) или их комбинация соответствует каждой физической клавише.
 * Представляет собой объект, где ключ - символ, а значение - массив `KeyCapId`, необходимых для его набора.
 */
export type SymbolLayout = Record<string, KeyCapId[]>;

// --- Virtual Keyboard ---

/**
 * Описывает одну виртуальную клавишу, готовую для отображения в UI.
 * Это финальная, "ожившая" модель, объединяющая информацию
 * из `PhysicalKey`, `SymbolLayout` и `FingerLayout`, а также динамическое UI-состояние.
 */
export type VirtualKey = {
  // --- From PhysicalKey ---
  keyCapId: KeyCapId;
  unitWidth?: KeyCapUnitWidth;
  symbolSize?: KeyCapSymbolSize;
  homeKeyMarker?: KeyCapHomeKeyMarker;
  colorGroup?: KeyCapColorGroup;

  // --- From SymbolLayout ---
  /** Символ, отображаемый на клавише в текущем состоянии (с учетом Shift). */
  symbol: string;

  // --- From FingerLayout ---
  fingerId: FingerId;
  isHomeKey?: boolean;

  // --- UI State ---
  /** Индекс ряда клавиши в `VirtualLayout`. */
  rowIndex?: number,
  /** Индекс колонки клавиши в `VirtualLayout`. */
  colIndex?: number,
  /** Видимость клавиши в данный момент. */
  visibility?: Visibility;
  /** Результат последнего нажатия на эту клавишу. */
  pressResult?: KeyCapPressResult;
  /** Навигационная роль клавиши в текущем упражнении. */
  navigationRole?: KeyCapNavigationRole;
};
/**
 * Виртуальный макет клавиатуры.
 * Представляет собой полную, готовую к рендерингу модель клавиатуры
 * в виде двумерного массива `VirtualKey`.
 */
export type VirtualLayout = VirtualKey[][];

/**
 * Объект, описывающий состояние всех пальцев и кистей.
 * Ключ - `FingerId`, значение - `FingerState`.
 */
export type HandStates = {
  [F in FingerId]: FingerState;
};
