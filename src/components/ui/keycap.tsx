/**
 * @file Компонент `KeyCap` для отображения одной физической клавиши.
 * @description Этот компонент является базовым строительным блоком для виртуальной клавиатуры.
 * Он отвечает за визуализацию клавиши, ее символа, маркеров (например, для домашнего ряда)
 * и динамических состояний (видимость, результат нажатия, навигационная роль).
 */
import { cva, type VariantProps } from "class-variance-authority"

import { FingerId,KeyCapColorGroup, KeyCapHomeKeyMarker, KeyCapLabel, KeyCapNavigationRole, KeyCapPressResult, KeyCapSymbolSize, KeyCapUnitWidth, Visibility } from "@/interfaces/types";
import { cn } from "@/lib/utils"

/**
 * Варианты стилей для компонента `KeyCap` на основе CVA (Class Variance Authority).
 * Определяет, как клавиша должна выглядеть в зависимости от ее состояния и свойств.
 */
const keyCapVariants = cva(
  `flex items-center justify-center relative rounded-sm h-8 
  [&_.keycap-marker]:bg-slate-500`,
  {
    variants: {
      /** Видимость клавиши. */
      visibility: {
        VISIBLE: "visible",
        INVISIBLE: "invisible",
      } satisfies Record<Visibility, string>,

      /** Видимость центральной точки (используется для отладки или специальных маркеров). */
      centerPointVisibility: {
        VISIBLE: "[&_.keycap-center-point]:visible",
        INVISIBLE: "[&_.keycap-center-point]:invisible",
      } satisfies Record<Visibility, string>,

      /** Результат нажатия клавиши. */
      pressResult: {
        NEUTRAL: "animate-none",
        CORRECT: "animate-bounce",
        INCORRECT: "animate-pulse bg-red-200 text-red-700",
      } satisfies Record<KeyCapPressResult, string>,

      /** Размер символа на клавише. */
      symbolSize: {
        "MD": "[&_.keycap-label]:text-xl",
        "SM": "[&_.keycap-label]:text-sm",
        "XS": "[&_.keycap-label]:text-xs",
      } satisfies Record<KeyCapSymbolSize, string>,

      /** Ширина клавиши в юнитах (1U ~ 19мм). */
      unitWidth: {
        "1U":    "w-8",
        "1.25U": "w-11",
        "1.5U":  "w-13",
        "1.75U": "w-15",
        "2U":    "w-19",
        "5U":    "w-42",
      } satisfies Record<KeyCapUnitWidth, string>,

      /** Цветовая группа клавиши. */
      colorGroup: {
        PRIMARY: "",
        SECONDARY: "bg-stone-100 text-stone-400 border-stone-300 outline-stone-300",
        ACCENT: "bg-orange-50 text-orange-400 border-orange-200 outline-orange-300",
      } satisfies Record<KeyCapColorGroup, string>,

      /** Маркер для домашнего ряда (например, черточка или точка). */
      homeKeyMarker: {
        BAR: "",
        DOT: "[&_.keycap-marker]:w-1 [&_.keycap-marker]:h-1",
        NONE: "[&_.keycap-marker]:invisible",
      } satisfies Record<KeyCapHomeKeyMarker, string>,

      /** Флаг, указывающий, является ли клавиша частью домашнего ряда. */
      isHomeKey: {
        true: "border-2",
        false: "border-0",
      },

      /** Идентификатор пальца, ответственного за эту клавишу. */
      fingerId: {
        L1: "bg-stone-50 border-stone-300 outline-stone-300",
        R1: "bg-stone-50 border-stone-300 outline-stone-300",

        L5: "bg-purple-50  border-purple-300  outline-purple-300 ",
        L4: "bg-indigo-50  border-indigo-300  outline-indigo-300 ",
        L3: "bg-sky-50     border-sky-300     outline-sky-300    ",
        L2: "bg-rose-50    border-rose-300    outline-rose-300   ",
        R2: "bg-amber-50   border-amber-300   outline-amber-300  ",
        R3: "bg-sky-50     border-sky-300     outline-sky-300    ",
        R4: "bg-indigo-50  border-indigo-300  outline-indigo-300 ",
        R5: "bg-purple-50  border-purple-300  outline-purple-300 ",

        LB: "",
        RB: "",
      } satisfies Record<FingerId, string>,

      /** Навигационная роль клавиши. */
      navigationRole: {
        IDLE:   "text-slate-300",
        HOME:   "",
        PATH:   "text-lime-600 bg-green-100 ",
        TARGET: "text-lime-700  bg-green-300 outline-2 outline-green-700",
      } satisfies Record<KeyCapNavigationRole, string>,
    },

    compoundVariants: [
      {
        navigationRole: ["HOME", "TARGET"],
        pressResult: "INCORRECT",
        class: "outline-red-300",
      },
      {
        visibility: "INVISIBLE",
        centerPointVisibility: "VISIBLE",
        class: "[&_.keycap-center-point]:invisible",
      },
    ],

    defaultVariants: {
      visibility: "VISIBLE",
      centerPointVisibility: "INVISIBLE",
      navigationRole: "IDLE",
      unitWidth: "1U",
      symbolSize: "MD",
      colorGroup: "PRIMARY",
      pressResult: "NEUTRAL",
      homeKeyMarker: "NONE",
      isHomeKey: false,
    },
  });

/** Пропсы для компонента `KeyCap`. */
export type KeyCapProps = React.ComponentProps<"div">
  & VariantProps<typeof keyCapVariants>
  & KeyCapLabel

/**
 * Компонент `KeyCap` отображает одну клавишу виртуальной клавиатуры.
 * @param props Пропсы компонента.
 * @param props.visibility - Определяет видимость клавиши.
 * @param props.centerPointVisibility - Определяет видимость центральной точки.
 * @param props.navigationRole - Определяет навигационную роль клавиши.
 * @param props.unitWidth - Определяет ширину клавиши.
 * @param props.colorGroup - Определяет цветовую группу клавиши.
 * @param props.pressResult - Определяет результат нажатия клавиши.
 * @param props.symbolSize - Определяет размер символа на клавише.
 * @param props.homeKeyMarker - Определяет тип маркера домашнего ряда.
 * @param props.isHomeKey - Флаг, указывающий, является ли клавиша домашней.
 * @param props.fingerId - Идентификатор пальца, связанного с клавишей.
 * @param props.symbol - Символ, отображаемый на клавише.
 * @returns Элемент JSX, представляющий клавишу.
 */
export function KeyCap({
  visibility,
  centerPointVisibility,
  navigationRole,
  unitWidth,
  colorGroup,
  pressResult,
  symbolSize,
  homeKeyMarker,
  isHomeKey,
  fingerId,
  symbol = "A",
  ...props
}: KeyCapProps) {
  return (
    <div
      className={cn(
        keyCapVariants({
          visibility,
          centerPointVisibility,
          homeKeyMarker,
          isHomeKey,
          fingerId,
          navigationRole,
          unitWidth,
          symbolSize,
          colorGroup,
          pressResult
        })
      )}
      {...props}
    >
      {/* ------- LABEL  --------- */}
      <span className="keycap-label">
        {symbol}
      </span>

      {/* ------- MARKER --------- */}
      <div
        className="keycap-marker absolute bottom-0.5 w-3 h-0.5 rounded-full"
      />

      {/* ------- CENTER --------- */}
      <div
        className="keycap-center-point absolute top-1/2 left-1/2 -translate-x-1/2
          -translate-y-1/2 w-0.5 h-0.5 rounded-full bg-red-400"
      />
    </div>
  )
}
