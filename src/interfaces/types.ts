/**
 * ВНИМАНИЕ!
 * Этот файл содержит не только определения типов, но и важные JSDoc-комментарии,
 * которые описывают семантику и назначение этих типов.
 * При рефакторинге или добавлении новых типов, пожалуйста, сохраняйте
 * существующие комментарии. Они являются частью документации и единого языка проекта.
 */
import { KEY_CAP_IDS } from "@/interfaces/key-cap-id";

export type KeyCapId = typeof KEY_CAP_IDS[number]; // Re-export KeyCapId

export type KeyCapLabel = { symbol?: string };

/** Маркер для обозначения клавиш на 'домашнем' ряду (F и J). */
export const KEY_CAP_HOME_KEY_MARKERS = ["NONE", "BAR", "DOT"] as const;
export type KeyCapHomeKeyMarker = typeof KEY_CAP_HOME_KEY_MARKERS[number];

/**
 * Определяет навигационную роль клавиши в текущем упражнении.
 * Используется для визуальных подсказок пользователю.
 */
export const KEY_CAP_NAVIGATION_ROLES = [
  "NONE", // Клавиша не участвует в текущей навигации.
  "PATH", // Клавиша находится на пути движения пальца к 'TARGET'.
  "TARGET", // Целевая клавиша, которую необходимо нажать.
] as const;
export type KeyCapNavigationRole = typeof KEY_CAP_NAVIGATION_ROLES[number];


/**
 * Определяет навигационную роль клавиши в текущем упражнении.
 * Используется для визуальных стрелок направления движения пальца к клавише
 */
export const KEY_CAP_NAVIGATION_ARROWS = [
  "NONE",   // Стрелка не отображается.
  "UP",     // Отображается стрелка c верху.
  "RIGHT",  // Отображается стрелка с права.
  "DOWN",   // Отображается стрелка с низу.
  "LEFT",   // Отображается стрелка с лева.
] as const;
export type KeyCapNavigationArrow = typeof KEY_CAP_NAVIGATION_ARROWS[number];

// TODO: Rename NEUTRAL to IDLE for consistency
/** Результат нажатия клавиши пользователем. */
export const KEY_CAP_PRESS_RESULTS = [
  "NEUTRAL", // Нейтральное состояние, нажатие еще не оценено.
  "CORRECT", // Нажатие было правильным.
  "INCORRECT", // Нажатие было ошибочным.
] as const;
export type KeyCapPressResult = typeof KEY_CAP_PRESS_RESULTS[number];

/** Стандартные размеры ширины клавиш, выраженные в "юнитах" (1U ~ 19мм). */
export const KEY_CAP_UNIT_WIDTHS = ["1U", "1.25U", "1.5U", "1.75U", "2U", "2.5U", "3U", "5U"] as const;
export type KeyCapUnitWidth = typeof KEY_CAP_UNIT_WIDTHS[number];

/** Группа цвета клавиши для визуального разделения. */
export const KEY_CAP_COLOR_GROUPS = ["PRIMARY", "SECONDARY", "ACCENT"] as const;
export type KeyCapColorGroup = typeof KEY_CAP_COLOR_GROUPS[number];

/**
 * Функциональный тип клавиши.
 * @see /TASKS.md
 */
export const KEY_CAP_TYPES = [
  "SYMBOL", // Клавиша, вводящая символ (буква, цифра, знак).
  "SYSTEM", // Системная/управляющая клавиша (Enter, Backspace, Tab).
  "MODIFIER", // Клавиша-модификатор (Shift, Alt, Ctrl).
] as const;
export type KeyCapType = typeof KEY_CAP_TYPES[number];

/** A key that can modify the output of another key (e.g., Shift, Ctrl). */
export type ModifierKey = 'shift' | 'ctrl' | 'alt' | 'meta';

/** Размер символа (легенды) на клавише. */
export const KEY_CAP_SYMBOL_SIZES = ["MD", "SM", "XS"] as const;
export type KeyCapSymbolSize = typeof KEY_CAP_SYMBOL_SIZES[number];

/** Видимость UI элемента. */
export const VISIBILITY_STATES = ["INVISIBLE", "VISIBLE"] as const;
export type Visibility = typeof VISIBILITY_STATES[number];

// --- Finger and Hand Types ---

/** Константы для идентификаторов пальцев левой руки. */
export const LEFT_HAND_FINGER_IDS = ["L1", "L2", "L3", "L4", "L5"] as const;
/** Константы для идентификаторов пальцев правой руки. */
export const RIGHT_HAND_FINGER_IDS = ["R1", "R2", "R3", "R4", "R5"] as const;
/** Константы для идентификаторов ладони левой руки. */
export const LEFT_HAND_BASE = "LB" as const;
/** Константы для идентификаторов ладони правой руки. */
export const RIGHT_HAND_BASE = "RB" as const;

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
export type FingerId = LeftHandFingerId | RightHandFingerId | typeof LEFT_HAND_BASE | typeof RIGHT_HAND_BASE;

/** Состояние отдельного пальца. */
export const FINGER_STATES = ["IDLE", "ACTIVE", "INACTIVE", "INCORRECT"] as const;
export type FingerState = typeof FINGER_STATES[number];

/** Объединение всех идентификаторов пальцев и кистей. */
export type HandFingerId = FingerId | typeof LEFT_HAND_BASE | typeof RIGHT_HAND_BASE;

// --- FlowLine Types ---

/** Состояние компонента FlowLine. */
export const FLOW_LINE_STATES = ["START", "TYPING", "PAUSE", "END"] as const;
export type FlowLineState = typeof FLOW_LINE_STATES[number];

/** Тип курсора в FlowLine. */
export const FLOW_LINE_CURSOR_TYPES = ["RECTANGLE", "UNDERSCORE", "VERTICAL"] as const;
export type FlowLineCursorType = typeof FLOW_LINE_CURSOR_TYPES[number];

/** Состояние отдельного символа в FlowLine. */
export const FLOW_LINE_SYMBOL_TYPES = ["PENDING", "CORRECT", "INCORRECT", "INCORRECTS", "CORRECTED"] as const;
export type FlowLineSymbolType = typeof FLOW_LINE_SYMBOL_TYPES[number];

/** Размер шрифта в FlowLine. */
export const FLOW_LINE_SIZES = ["XS", "SM", "MD", "LG", "XL"] as const;
export type FlowLineSize = typeof FLOW_LINE_SIZES[number];

/** Режим отображения курсора в FlowLine. */
export const FLOW_LINE_CURSOR_MODES = ["HALF", "THIRD", "QUARTER", "DINAMIC"] as const;
export type FlowLineCursorMode = typeof FLOW_LINE_CURSOR_MODES[number];

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
 * Расширенное представление одного "шага" в упражнении.
 * Включает сам символ и заранее вычисленные целевые клавиши.
 */
export interface StreamSymbol {
  /** Целевой символ для отображения (напр., 'F'). */
  targetSymbol: string;
  /** Необходимые клавиши для набора (напр., ['KeyF', 'ShiftRight']). */
  requiredKeyCapIds: KeyCapId[];
  /** Массив всех попыток набора этого символа. */
  attempts: StreamAttempt[];
}

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
  /** Стрелка направления движения пальца к клавише. */
  navigationArrow?: KeyCapNavigationArrow;
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

// --- XState Machine Types ---

// App Machine Types
export interface AppContext {
  user: { name: string } | null;
  settings: {
    theme: 'dark' | 'light';
  };
}

export type AppEvent =
  | { type: 'START_TRAINING' }
  | { type: 'QUIT_TRAINING' }
  | { type: 'GO_TO_SETTINGS' }
  | { type: 'VIEW_STATS' }
  | { type: 'BACK_TO_MENU' }
  | { type: 'KEY_DOWN'; keyCapId: KeyCapId }
  | { type: 'KEY_UP'; keyCapId: KeyCapId }
  | { type: 'KEYBOARD.RECOGNIZED'; keys: KeyCapId[] };

// Keyboard Machine Types
export interface KeyboardMachineContext {
  pressedKeys: Set<KeyCapId>;
  // parentActor will be typed as ActorRefFrom<AppMachine> in keyboard.machine.ts
}

export type KeyboardMachineEvent =
  | { type: "KEY_DOWN"; keyCapId: KeyCapId }
  | { type: "KEY_UP"; keyCapId: KeyCapId }
  | { type: "RESET" };

// Training Machine Types
export interface TrainingContext {
  stream: TypingStream;
  currentIndex: number;
  pressedKeys: KeyCapId[] | null;
  errors: number;
  targetKeyCapId: KeyCapId | undefined;
  targetFingerId: FingerId | undefined;
  shiftRequired: boolean;
}

export type TrainingEvent =
  | { type: 'KEY_PRESS'; keys: KeyCapId[] }
  | { type: 'PAUSE_TRAINING' }
  | { type: 'RESUME_TRAINING' };

// --- HandsScene ViewModel ---

/**
 * Полное визуальное состояние одной клавиши в сцене.
 * @see /VisualContract.md
 */
export interface KeySceneState {
  visibility: Visibility;
  navigationRole: KeyCapNavigationRole;
  navigationArrow: KeyCapNavigationArrow;
  pressResult: KeyCapPressResult;
}

/**
 * Описывает полное состояние одного пальца и его "среза" сцены.
 * @see /VisualContract.md
 */
export interface FingerSceneState {
  fingerState: FingerState;
  keyCapStates?: Partial<Record<KeyCapId, KeySceneState>>;
}

/**
 * Итоговая модель представления для сцены с руками: словарь состояний для всех 12 элементов.
 * @see /VisualContract.md
 */
export type HandsSceneViewModel = Record<FingerId, FingerSceneState>;
