/**
* @file Компонент `KeyCap` для отображения одной физической клавиши.
 * @description Этот компонент является базовым строительным блоком для виртуальной клавиатуры.
 * Он отвечает за визуализацию клавиши, ее символа, маркеров (например, для домашнего ряда)
 * и динамических состояний (видимость, результат нажатия, навигационная роль).
 */
import { cva, type VariantProps } from "class-variance-authority"

import { FingerId, KeyCapColorGroup, KeyCapHomeKeyMarker, KeyCapId, KeyCapLabel, KeyCapNavigationArrow, KeyCapNavigationRole, KeyCapPressResult, KeyCapSymbolSize, KeyCapUnitWidth, Visibility } from "@/interfaces/types";
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


      /** Размер символа на клавише. */
      symbolSize: {
        "MD": "[&_.keycap-label]:text-xl",
        "SM": "[&_.keycap-label]:text-sm",
        "XS": "[&_.keycap-label]:text-xs",
      } satisfies Record<KeyCapSymbolSize, string>,

      /** Ширина клавиши в юнитах (1U ~ 19мм). */
      unitWidth: {
        "1U": "w-8",
        "1.25U": "w-11",
        "1.5U": "w-13",
        "1.75U": "w-15",
        "2U": "w-19",
        "2.5U": "w-24",
        "3U": "w-18",
        "5U": "w-38",
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
      } satisfies Partial<Record<KeyCapHomeKeyMarker, string>>,



      /** Идентификатор пальца, ответственного за эту клавишу. */
      fingerId: {
        L1: "bg-stone-50   border-stone-300   outline-stone-300 ring-stone-400",
        R1: "bg-stone-50   border-stone-300   outline-stone-300",
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
      } satisfies Partial<Record<FingerId, string>>,


      /** Навигационная роль клавиши по движению к целевой клавише. */
      navigationRole: {
        NONE: "text-slate-300",
        PATH: "text-lime-600 bg-slate-100 ",
        TARGET: "text-lime-700  bg-slate-200 outline-2 outline-green-700",
      } satisfies Record<KeyCapNavigationRole, string>,

      /** Стрелка направления движения пальца к клавише. */
      navigationArrow: {
        NONE: '[&_.keycap-path-arrow]:invisible',
        UP: `[&_.keycap-path-arrow]:rotate-0
                [&_.keycap-path-arrow]:-top-1/2
                [&_.keycap-path-arrow]:left-1/2
                [&_.keycap-path-arrow]:-translate-x-1/2`,
        DOWN: `[&_.keycap-path-arrow]:rotate-180
                [&_.keycap-path-arrow]:-bottom-1/2
                [&_.keycap-path-arrow]:left-1/2
                [&_.keycap-path-arrow]:-translate-x-1/2`,
        LEFT: `[&_.keycap-path-arrow]:-rotate-90
                [&_.keycap-path-arrow]:top-1/2
                [&_.keycap-path-arrow]:-left-1/2
                [&_.keycap-path-arrow]:-translate-y-1/2`,
        RIGHT: `[&_.keycap-path-arrow]:rotate-90
                [&_.keycap-path-arrow]:top-1/2
                [&_.keycap-path-arrow]:-right-1/2
                [&_.keycap-path-arrow]:-translate-y-1/2`,
      } satisfies Record<KeyCapNavigationArrow, string>,

      /** Результат нажатия клавиши. */
      pressResult: {
        NEUTRAL: "animate-none",
        CORRECT: "animate-bounce",
        INCORRECT: "bg-red-400 text-red-700",
      } satisfies Record<KeyCapPressResult, string>,

      /** Флаг, указывающий, является ли клавиша частью домашнего ряда. */
      isHomeKey: {
        true: "ring-4",
        false: "ring-0",
      },
    },
    compoundVariants: [
      {
        visibility: "INVISIBLE",
        centerPointVisibility: "VISIBLE",
        class: "[&_.keycap-center-point]:invisible",
      },
    ],

    defaultVariants: {
      visibility: "VISIBLE",
      centerPointVisibility: "INVISIBLE",
      navigationRole: "NONE",
      unitWidth: "1U",
      symbolSize: "MD",
      colorGroup: "PRIMARY",
      pressResult: "NEUTRAL",
      homeKeyMarker: "NONE",
      navigationArrow: "NONE",
      isHomeKey: false,
    },
  });

/** Пропсы для компонента `KeyCap`. */
export type KeyCapProps = React.ComponentProps<"div">
  & VariantProps<typeof keyCapVariants>
  & KeyCapLabel
  & { keyCapId: KeyCapId };

/**
 * Компонент `KeyCap` отображает одну клавишу виртуальной клавиатуры.
 * @param props Пропсы компонента.
 * @param props.visibility - Определяет видимость клавиши.
 * @param props.centerPointVisibility - Определяет видимость центральной точки.
 * @param props.navigationRole - Определяет навигационную роль клавиши.
 * @param props.navigationArrow - Определяет направление стрелки для движения пальца к целевой клавише..
 * @param props.unitWidth - Определяет ширину клавиши.
 * @param props.colorGroup - Определяет цветовую группу клавиши.
 * @param props.pressResult - Определяет результат нажатия клавиши.
 * @param props.symbolSize - Определяет размер символа на клавише.
 * @param props.homeKeyMarker - Определяет тип маркера домашнего ряда.
 * @param props.isHomeKey - Флаг, указывающий, является ли клавиша домашней.
 * @param props.fingerId - Идентификатор пальца, связанного с клавишей.
 * @param props.symbol - Символ, отображаемый на клавише.
 * @param props.keyCapId - Уникальный идентификатор клавиши.
 *
 * @architectural_notes
 * - **data-keycap-id**: Этот атрибут добавляется в DOM для уникальной идентификации
 *   каждой клавиши. Он используется для поиска конкретной клавиши (например,
 *   домашней клавиши пальца) в логике позиционирования других компонентов.
 * - **keycap-center-point**: Этот невидимый `div` в центре клавиши служит "якорем"
 *   для выравнивания. Его координаты считываются для точного совмещения
 *   клавиатурного кластера с соответствующим пальцем в компоненте `HandsExt`.
 *
 * @returns Элемент JSX, представляющий клавишу.
 */
export function KeyCap({
  visibility,
  centerPointVisibility,
  navigationRole,
  navigationArrow: navigationArrow,
  unitWidth,
  colorGroup,
  pressResult,
  symbolSize,
  homeKeyMarker,
  isHomeKey,
  fingerId,
  symbol = "A",
  keyCapId,
  ...props
}: KeyCapProps) {
  return (
    <div
      data-keycap-id={keyCapId}
      className={cn(
        keyCapVariants({
          visibility,
          centerPointVisibility,
          homeKeyMarker,
          isHomeKey,
          fingerId,
          navigationRole,
          navigationArrow: navigationArrow,
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
        className="keycap-center-point absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
          w-0.5 h-0.5 rounded-full bg-red-400"
      />

      {/* ------- ARROW --------- */}
      <div className='keycap-path-arrow absolute z-10'>

        <svg width="26" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
          <mask id="path-1-inside-1_119_57" fill="white">
            <path fillRule="evenodd" clipRule="evenodd" d="M27 21L13.5 0L0 21H5.70578V28H20.9231V21H27Z" />
          </mask>
          <path fillRule="evenodd" clipRule="evenodd" d="M27 21L13.5 0L0 21H5.70578V28H20.9231V21H27Z" fill="#27AE60" fillOpacity="0.7" />
          <path fillRule="evenodd" clipRule="evenodd" d="M27 21L13.5 0L0 21H5.70578V28H20.9231V21H27Z" fill="url(#paint0_linear_119_57)" fillOpacity="0.8" />
          <path d="M13.5 0L14.3412 -0.540758L13.5 -1.84926L12.6588 -0.540758L13.5 0ZM27 21V22H28.8317L27.8412 20.4592L27 21ZM0 21L-0.841178 20.4592L-1.83167 22H0V21ZM5.70578 21H6.70578V20H5.70578V21ZM5.70578 28H4.70578V29H5.70578V28ZM20.9231 28V29H21.9231V28H20.9231ZM20.9231 21V20H19.9231V21H20.9231ZM12.6588 0.540758L26.1588 21.5408L27.8412 20.4592L14.3412 -0.540758L12.6588 0.540758ZM0.841178 21.5408L14.3412 0.540758L12.6588 -0.540758L-0.841178 20.4592L0.841178 21.5408ZM5.70578 20H0V22H5.70578V20ZM6.70578 28V21H4.70578V28H6.70578ZM20.9231 27H5.70578V29H20.9231V27ZM19.9231 21V28H21.9231V21H19.9231ZM27 20H20.9231V22H27V20Z" fill="#2A9852" fillOpacity="0.2" mask="url(#path-1-inside-1_119_57)" />
          <defs>
            <linearGradient id="paint0_linear_119_57" x1="13.5" y1="0" x2="13.5" y2="28" gradientUnits="userSpaceOnUse">
              <stop stopColor="#24FF00" />
              <stop offset="1" stopColor="white" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  )
}
