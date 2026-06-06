/**
 * ВНИМАНИЕ!
 * Этот файл содержит не только определения типов, но и важные JSDoc-комментарии,
 * которые описывают семантику и назначение этих типов.
 * При рефакторинге или добавлении новых типов, пожалуйста, сохраняйте
 * существующие комментарии. Они являются частью документации и единого языка проекта.
 */
import { z } from 'zod';
import type { KEY_CAP_IDS } from "@/interfaces/key-cap-id";

export type KeyCapId = typeof KEY_CAP_IDS[number]; // Re-export KeyCapId

/** Языки, на которых пишутся тексты упражнений (BCP 47). */
export const TEXT_LANGUAGES = ['en', 'ru'] as const;
export type TextLanguage = typeof TEXT_LANGUAGES[number];

/** Языки интерфейса (UI). */
export const INTERFACE_LANGUAGES = ['en', 'ru'] as const;
export type InterfaceLanguage = typeof INTERFACE_LANGUAGES[number];

export interface KeyCapLabel { symbol?: string }

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

/** Функциональный тип клавиши. */
export type KeyCapType = "SYMBOL" | "SYSTEM" | "MODIFIER";

/**
 * Размер легенды клавиши — intrinsic-свойство данных раскладки.
 * Выбирается по длине надписи ('A' = MD, 'Ctrl' = SM, 'BackSpace' = XS) и
 * назначается в `PhysicalLayout`. Это НЕ пользовательский UI-масштаб —
 * для масштабирования всего тренажёра используется иной механизм.
 */
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
 * Полный список всех идентификаторов пальцев (10 пальцев + 2 ладони).
 * Используется для типизированного итерирования по `HandsSceneViewModel`
 * без `for...in` + `as FingerId` каста.
 */
export const FINGER_IDS = [
  ...LEFT_HAND_FINGERS,
  ...RIGHT_HAND_FINGERS,
  LEFT_HAND_BASE,
  RIGHT_HAND_BASE,
] as const;

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
export type FingerId = typeof FINGER_IDS[number];

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
export const FLOW_LINE_SYMBOL_TYPES = [
  "PENDING",    // Еще не был напечатан пользователем, он только показан, ожидается взаимодействие с пользователем
  "CORRECT",    // Был напечатан пользователем корректно с первой попытки
  "CORRECTED",  // Был напечатан пользователем корректно не с первой попытки
  "ERROR",      // Был напечатан пользователем не корректно один раз
  "ERRORS", // Был напечатан пользвателем не корректно несколько раз
] as const;
export type FlowLineSymbolType = typeof FLOW_LINE_SYMBOL_TYPES[number];

/** Режим отображения курсора в FlowLine. */
export const FLOW_LINE_CURSOR_MODES = ["HALF", "THIRD", "QUARTER", "DINAMIC"] as const;
export type FlowLineCursorMode = typeof FLOW_LINE_CURSOR_MODES[number];

// --- Typing Stream and Attempts ---

/**
 * Представляет одну попытку пользователя набрать целевой символ.
 * Включает в себя информацию о нажатой клавише и времени.
 */
export interface StreamAttempt {
  pressedKeyCaps: KeyCapId[];   // Данные о нажатом сочетании клавише. Необходимые клавиши для набора (напр., ['KeyF', 'ShiftRight'])
  startAt?: number;              //Время начала нажатия (timestamp).
  endAt?: number;                //Время окончания нажатия (timestamp).
}

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

/**
 * Описывает одну физическую клавишу: её геометрию (координаты `x`/`y` и ширину `w`
 * в U-юнитах, 1U ~ 19мм), надпись и базовый тип.
 *
 * `x` — позиция левого края клавиши от левого края клавиатуры в U;
 * `y` — номер ряда (целое 0..N для стандартных клавиатур);
 * `w` — ширина клавиши в U (1, 1.25, 1.5, 1.75, 2, 2.25, 2.75, 5, 6.25 ...).
 *
 * Ряды как первоклассная сущность здесь отсутствуют: 2D-восстановление —
 * через group-by `y` + sort-by `x` в `keyboard-scene.ts`.
 */
export interface PhysicalKey {
  keyCapId: KeyCapId;                   // (напр. 'KeyF')
  x: number;                            // Позиция левого края в U
  y: number;                            // Номер ряда
  w: number;                            // Ширина клавиши в U
  label: string;                        // Надпись на колпачке (напр. 'F', '1 !', 'Shift L')
  symbolSize?: KeyCapSymbolSize;        // Размер надписи
  homeKeyMarker?: KeyCapHomeKeyMarker;  // Физический маркер home-ряда (BAR/DOT на F и J)
  colorGroup?: KeyCapColorGroup;        // Цветовая группа
  type: KeyCapType;                     // Тип: буквенная, системная или модификатор
}
/**
 * Физический макет клавиатуры (холст).
 * Плоский список клавиш с геометрией. Инвариант железа — не зависит от выбора пользователя.
 */
export type PhysicalLayout = PhysicalKey[];

/** Идентификатор физического макета (форм-фактор). */
export type PhysicalLayoutId = 'ansi';

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

/** Идентификатор пальцевого макета (схема постановки рук). */
export type FingerLayoutId = 'asdf';

/**
 * Символьный макет (слой краски).
 * Определяет, какой символ (`'a'`, `'!'`) или их комбинация соответствует каждой физической клавише.
 * Представляет собой массив объектов, где каждый объект содержит символ и массив `KeyCapId`, необходимых для его набора.
 */
export type SymbolLayout = {
  symbol: string;
  keyCaps: KeyCapId[];
}[];

/** Идентификатор символьного макета (то, что пользователь выбирает в настройках). */
export const SYMBOL_LAYOUT_IDS = ['qwerty', 'йцукен'] as const;
export type SymbolLayoutId = typeof SYMBOL_LAYOUT_IDS[number];

// --- Keyboard Scene (render-ready view-model of the keyboard) ---

/**
 * Одна клавиша в render-готовой модели клавиатурной сцены.
 * Это финальная, «ожившая» сущность, объединяющая информацию
 * из `PhysicalKey`, `SymbolLayout` и `FingerLayout`, а также динамическое UI-состояние.
 */
export interface KeyboardSceneKey {
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
  /** Индекс ряда клавиши в `KeyboardSceneViewModel`. */
  rowIndex?: number,
  /** Индекс колонки клавиши в `KeyboardSceneViewModel`. */
  colIndex?: number,
  /** Видимость клавиши в данный момент. */
  visibility?: Visibility;
  /** Результат последнего нажатия на эту клавишу. */
  pressResult?: KeyCapPressResult;
  /** Навигационная роль клавиши в текущем упражнении. */
  navigationRole?: KeyCapNavigationRole;
  /** Стрелка направления движения пальца к клавише. */
  navigationArrow?: KeyCapNavigationArrow;
}
/**
 * Виртуальный макет клавиатуры.
 * Представляет собой полную, готовую к рендерингу модель клавиатуры
 * в виде двумерного массива `KeyboardSceneKey`.
 */
export type KeyboardSceneViewModel = KeyboardSceneKey[][];

/**
 * Объект, описывающий состояние всех пальцев и кистей.
 * Ключ - `FingerId`, значение - `FingerState`.
 */
export type HandStates = Record<FingerId, FingerState>;

// --- Symbol Layout Descriptor (запись реестра раскладок) ---

export const SymbolLayoutDescriptorSchema = z.object({
  symbolLayoutId: z.enum(SYMBOL_LAYOUT_IDS),
  textLanguage: z.enum(TEXT_LANGUAGES),
  isDefaultForTextLanguages: z.array(z.enum(TEXT_LANGUAGES)),
  symbolLayout: z.custom<SymbolLayout>(
    (val) => Array.isArray(val) && val.every(
      (e: unknown) =>
        typeof e === 'object' && e !== null &&
        typeof (e as { symbol: unknown }).symbol === 'string' &&
        Array.isArray((e as { keyCaps: unknown }).keyCaps)
    ),
    'symbolLayout must be SymbolLayout array'
  ),
})
.refine(
  (d) => d.isDefaultForTextLanguages.includes(d.textLanguage),
  { message: 'descriptor must be default for its own textLanguage' }
)
.refine(
  (d) => d.isDefaultForTextLanguages.every(
    lang => lang === d.textLanguage || d.textLanguage.startsWith(lang + '-')
  ),
  { message: 'isDefaultForTextLanguages must contain only textLanguage or its ancestors' }
);

export type SymbolLayoutDescriptor = z.infer<typeof SymbolLayoutDescriptorSchema>;

export const SymbolLayoutRegistrySchema = z.array(SymbolLayoutDescriptorSchema)
  .superRefine((registry, ctx) => {
    // Не больше одной дефолтной раскладки на язык
    const defaultCounts = new Map<TextLanguage, string[]>();
    for (const d of registry) {
      for (const lang of d.isDefaultForTextLanguages) {
        const list = defaultCounts.get(lang) ?? [];
        list.push(d.symbolLayoutId);
        defaultCounts.set(lang, list);
      }
    }
    for (const [lang, ids] of defaultCounts) {
      if (ids.length > 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Multiple default layouts for textLanguage='${lang}': ${ids.join(', ')}`,
        });
      }
    }
    // Покрытие TEXT_LANGUAGES хотя бы одной раскладкой
    const covered = new Set(registry.flatMap(d => [
      d.textLanguage, ...d.isDefaultForTextLanguages
    ]));
    for (const lang of TEXT_LANGUAGES) {
      if (!covered.has(lang)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `No layout covers textLanguage='${lang}'`,
        });
      }
    }
  });

// --- i18n ---
import type en from '../../dictionaries/en.json';

export type Dictionary = typeof en;

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

import type { AnyActorRef } from 'xstate';
/**
 * Универсальный тип ссылки на родительский XState-актор.
 * Используется в input child-машин (keyboardMachine, trainingMachine), которые
 * шлют события "вверх" через `sendTo(parentActor, ...)` — у нас нет нужды знать
 * точный тип родителя в этих машинах, поэтому используем встроенный `AnyActorRef`.
 */
export type ParentActor = AnyActorRef;
