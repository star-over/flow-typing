import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Visibility, KeyCapPressResult, KeyCapSymbolSize, KeyCapUnitWidth, KeyCapNavigationRole, KeyCapColorGroup, KeyCapHomeKeyMarker, KeyCapLabel, FingerId } from "@/interfaces/types";

const keyCapVariants = cva(
  `flex items-center justify-center relative rounded-sm h-8 
  [&_.keycap-marker]:bg-slate-500`,
  {
    variants: {
      visibility: {
        VISIBLE: "visible",
        INVISIBLE: "invisible",
      } satisfies Record<Visibility, string>,

      centerPointVisibility: {
        VISIBLE: "[&_.keycap-center-point]:visible",
        INVISIBLE: "[&_.keycap-center-point]:invisible",
      } satisfies Record<Visibility, string>,

      pressResult: {
        NEUTRAL: "animate-none",
        CORRECT: "animate-bounce",
        INCORRECT: "animate-pulse bg-red-200 text-red-700",
      } satisfies Record<KeyCapPressResult, string>,

      symbolSize: {
        "MD": "[&_.keycap-label]:text-xl",
        "SM": "[&_.keycap-label]:text-sm",
        "XS": "[&_.keycap-label]:text-xs",
      } satisfies Record<KeyCapSymbolSize, string>,

      unitWidth: {
        "1U":    "w-8",
        "1.25U": "w-11",
        "1.5U":  "w-13",
        "1.75U": "w-15",
        "2U":    "w-19",
        "5U":    "w-42",
      } satisfies Record<KeyCapUnitWidth, string>,

      colorGroup: {
        PRIMARY: "",
        SECONDARY: "bg-stone-100 text-stone-400 border-stone-300 outline-stone-300",
        ACCENT: "bg-orange-50 text-orange-400 border-orange-200 outline-orange-300",
      } satisfies Record<KeyCapColorGroup, string>,

      homeKeyMarker: {
        BAR: "",
        DOT: "[&_.keycap-marker]:w-1 [&_.keycap-marker]:h-1",
        NONE: "[&_.keycap-marker]:invisible",
      } satisfies Record<KeyCapHomeKeyMarker, string>,

      isHomeKey: {
        true: "border-2",
        false: "border-0",
      },

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

export type KeyCapProps = React.ComponentProps<"div">
  & VariantProps<typeof keyCapVariants>
  & KeyCapLabel

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
