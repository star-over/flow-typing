/**
 * ВНИМАНИЕ!
 * Этот файл содержит не только определения типов, но и важные JSDoc-комментарии,
 * которые описывают семантику и назначение этих типов.
 * При рефакторинге или добавлении новых типов, пожалуйста, сохраняйте
 * существующие комментарии. Они являются частью документации и единого языка проекта.
 */
import { UserPreferences } from '@/interfaces/user-preferences';
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

/** Результат нажатия клавиши пользователем. */
export const KEY_CAP_PRESS_RESULTS = [
  "NONE", // Нейтральное состояние, нажатие еще не оценено.
  "CORRECT", // Нажатие было правильным.
  "ERROR", // Нажатие было ошибочным.
] as const;
export type KeyCapPressResult = typeof KEY_CAP_PRESS_RESULTS[number];

/** Стандартные размеры ширины клавиш, выраженные в "юнитах" (1U ~ 19мм). */
export const KEY_CAP_UNIT_WIDTHS = ["1U", "1.25U", "1.5U", "1.75U", "2U", "2.5U", "3U", "5U"] as const;
export type KeyCapUnitWidth = typeof KEY_CAP_UNIT_WIDTHS[number];

/** Группа цвета клавиши для визуального разделения. */
export type KeyCapColorGroup = "PRIMARY" | "SECONDARY" | "ACCENT";

/**
 * Функциональный тип клавиши.
 * @see /TASKS.md
 */
export type KeyCapType = "SYMBOL" | "SYSTEM" | "MODIFIER";

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
export const LEFT_HAND_FINGERS = ["L1", "L2", "L3", "L4", "L5"] as const;
/** Константы для идентификаторов пальцев правой руки. */
export const RIGHT_HAND_FINGERS = ["R1", "R2", "R3", "R4", "R5"] as const;
/** Константы для идентификаторов ладони левой руки. */
export const LEFT_HAND_BASE = "LB" as const;
/** Константы для идентификаторов ладони правой руки. */
export const RIGHT_HAND_BASE = "RB" as const;

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
export type FingerId = typeof LEFT_HAND_FINGERS[number] | typeof RIGHT_HAND_FINGERS[number] | typeof LEFT_HAND_BASE | typeof RIGHT_HAND_BASE;

/** Состояние отдельного пальца. */
export const FINGER_STATES = ["NONE", "TARGET", "INACTIVE", "ERROR"] as const;
export type FingerState = typeof FINGER_STATES[number];

/** Идентификаторы сторон рук. */
export const HAND_SIDES = ["LEFT", "RIGHT"] as const;
export type HandSide = typeof HAND_SIDES[number];

// --- FlowLine Types ---

/** Тип курсора в FlowLine. */
export const FLOW_LINE_CURSOR_TYPES = ["RECTANGLE", "UNDERSCORE", "VERTICAL"] as const;
export type FlowLineCursorType = typeof FLOW_LINE_CURSOR_TYPES[number];

/** Состояние отдельного символа в FlowLine. */
// TODO: Rename INCORRECTS to ERRORS
export const FLOW_LINE_SYMBOL_TYPES = [
  "PENDING",    // Еще не был напечатан пользователем, он только показан, ожидается взаимодействие с пользователем
  "CORRECT",    // Был напечатан пользователем корректно с первой попытки
  "CORRECTED",  // Был напечатан пользователем корректно не с первой попытки
  "ERROR",      // Был напечатан пользователем не корректно один раз
  "INCORRECTS", // Был напечатан пользвателем не корректно несколько раз
] as const;
export type FlowLineSymbolType = typeof FLOW_LINE_SYMBOL_TYPES[number];

/** Размер шрифта в FlowLine. */
export const FLOW_LINE_SIZES = ["XS", "SM", "MD", "LG", "XL"] as const;
export type FlowLineSize = typeof FLOW_LINE_SIZES[number];

/** Режим отображения курсора в FlowLine. */
export const FLOW_LINE_CURSOR_MODES = ["HALF", "THIRD", "QUARTER", "DINAMIC"] as const;
export type FlowLineCursorMode = typeof FLOW_LINE_CURSOR_MODES[number];

// --- Typing Stream and Attempts ---

/**
 * Представляет одну попытку пользователя набрать целевой символ.
 * Включает в себя информацию о нажатой клавише и времени.
 */
export type StreamAttempt = {
  pressedKeyCups: KeyCapId[];   // Данные о нажатом сочетании клавише. Необходимые клавиши для набора (напр., ['KeyF', 'ShiftRight'])
  startAt?: number;              //Время начала нажатия (timestamp).
  endAt?: number;                //Время окончания нажатия (timestamp).
};

/**
 * Расширенное представление одного "шага" в упражнении.
 * Включает сам символ и заранее вычисленные целевые клавиши.
 */
export interface StreamSymbol {
  targetSymbol: string;       //Целевой символ для отображения (напр., 'F').
  targetKeyCaps: KeyCapId[];  // Необходимые клавиши для набора (напр., ['KeyF', 'ShiftRight'])
  attempts: StreamAttempt[];  //Массив всех попыток набора этого символа.
}

/**
 * Поток символов для набора. Представляет собой полное упражнение.
 * Является источником данных для `FlowLine`.
 */
export type TypingStream = StreamSymbol[];

// --- Layout Types ---

/** Описывает одну физическую клавишу: ее геометрию и базовый тип. */
export type PhysicalKey = {
  keyCapId: KeyCapId;                   // (напр. 'KeyF'
  label: string;                        // Надпись на клавише (напр. 'F')
  unitWidth?: KeyCapUnitWidth;          // Ширина клавиши
  symbolSize?: KeyCapSymbolSize;        // Размер надписи
  homeKeyMarker?: KeyCapHomeKeyMarker;  // Тип Home Маркета
  colorGroup?: KeyCapColorGroup;        // Цветовая группа
  type: KeyCapType;                     // Тип: буквенная, системная или текстовая клавиша
};
/**
 * Физический макет клавиатуры (холост).
 * Описывает геометрию: расположение, размер и форму клавиш в виде двумерного массива.
 */
export type KeyboardLayout = PhysicalKey[][];

/**
 * Пальцевый макет (инструкция).
 * Определяет, каким пальцем следует нажимать каждую клавишу.
 * Представляет собой объект, где ключ - `KeyCapId`, значение - `FingerKey`.
 */
export type FingerLayout = {
  keyCapId: KeyCapId;
  fingerId: FingerId;
  isHomeKey?: boolean;
}[];

/**
 * Символьный макет (слой краски).
 * Определяет, какой символ (`'a'`, `'!'`) или их комбинация соответствует каждой физической клавише.
 * Представляет собой массив объектов, где каждый объект содержит символ и массив `KeyCapId`, необходимых для его набора.
 */
export type SymbolLayout = {
  symbol: string;
  keyCaps: KeyCapId[];
}[];

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
  type: KeyCapType;

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

// --- i18n ---
export type Locale = 'en' | 'ru';

export type Dictionary = {
  title: string;
  app: {
    title: string;
    app_state: string;
    loading: string;
    start_training: string;
    settings: string; // This refers to the app settings UI button
    stats: string;
    lesson_complete: string;
    back_to_menu: string;
    stats_screen_title: string;
    error_title: string;
    start_again: string;
    pause: string;
    resume: string;
    welcome: string;
  };
  user_preferences: { // Renamed from settings
    title: string;
    language_label: string;
    keyboard_layout_label: string;
    language_placeholder: string;
    keyboard_layout_placeholder: string;
    back_button: string;
  };
  stats_card: {
    title: string;
    cpm: string;
    wpm: string;
    accuracy: string;
    duration: string;
  };
};

// New interfaces for user settings metadata
export interface SettingOption<T> {
  value: T;
  labelCode: string; // i18n code for the option's label
}

export interface SettingMetadata<T> {
  key: keyof UserPreferences; // The key used in UserPreferences (e.g., 'language', 'keyboardLayout')
  storageKey: string; // The key used for storage (e.g., in localStorage or DB)
  labelCode: string; // i18n code for the setting's display name
  descriptionCode: string; // i18n code for a detailed description of the setting
  type: 'string' | 'number' | 'boolean' | 'enum'; // Type of the setting value
  defaultValue: T; // The default value for this setting
  options?: SettingOption<T>[]; // Optional: for 'enum' types, a list of available options
  categoryCode?: string; // Optional: i18n code for grouping settings (e.g., 'general', 'appearance')
  componentType?: 'select' | 'checkbox' | 'range' | 'text'; // Optional: Hint for UI component
}

// --- HandsScene ViewModel ---

// --- HandsScene ViewModel ---

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
 * Итоговая модель представления для сцены с руками: словарь состояний для всех 12 элементов.
 * @see /VisualContract.md
 */
export type HandsSceneViewModel = Record<FingerId, {
  fingerState: FingerState;
  keyCapStates?: Partial<Record<KeyCapId, KeySceneState>>;
}>;
