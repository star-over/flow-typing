import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const keyCapVariants = cva(
  "flex items-center justify-center relative rounded-sm border-1 h-8 [&_#marker]:bg-slate-300",
  {
    variants: {
      visibility: {
        VISIBLE: "visible",
        INVISIBLE: "invisible",
      } satisfies Record<Visibility, string>,

      centerPointVisibility: {
        VISIBLE: "[&_#center-point]:visible",
        INVISIBLE: "[&_#center-point]:invisible",
      } satisfies Record<Visibility, string>,


      pressResult: {
        NEUTRAL: "animate-none",
        CORRECT: "animate-bounce",
        INCORRECT: "animate-pulse bg-red-200 text-red-700 border-red-300",
      } satisfies Record<KeyCapPressResult, string>,

      symbolSize: {
        "MD": "[&_#label]:text-xl",
        "SM": "[&_#label]:text-sm",
        "XS": "[&_#label]:text-xs",
      } satisfies Record<KeyCapSymbolSize, string>,

      unitWidth: {
        "1U":    "w-8",
        "1.25U": "w-11",
        "1.5U":  "w-13",
        "1.75U": "w-15",
        "2U":    "w-19",
        "5U":    "w-42",
      } satisfies Record<KeyCapUnitWidth, string>,

      navigationRole: {
        IDLE: "bg-slate-50 text-slate-400 border-slate-200 ",
        HOME: "bg-lime-50 text-slate-400 border-slate-300 outline-1 outline-slate-300",
        PATH: "bg-lime-50 text-slate-400 border-slate-300",
        TARGET: "bg-lime-100 text-lime-700 border-lime-300 outline-1 outline-lime-300",
      } satisfies Record<KeyCapNavigationRole, string>,

      colorGroup: {
        PRIMARY: "",
        SECONDARY: "bg-stone-100 text-stone-400 border-stone-300 outline-stone-300",
        ACCENT: "bg-orange-50 text-orange-400 border-orange-200 outline-orange-300",
      } satisfies Record<KeyCapColorGroup, string>,

      homeKeyMarker: {
        BAR: "",
        DOT: "[&_#marker]:w-1 [&_#marker]:h-1",
        NONE: "[&_#marker]:invisible",
      } satisfies Record<KeyCapHomeKeyMarker, string>,
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
        class: "[&_#center-point]:invisible",
      },
      // {
      //   visibility: "INVISIBLE",
      //   homeKeyMarker: ["BAR", "DOT"],
      //   class: "[&_#marker]:invisible",
      // },
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
  symbol = "A",
  ...props
}: KeyCapProps) {
  return (
    <div id="main-frame"
      className={cn(keyCapVariants({ visibility, centerPointVisibility, homeKeyMarker, navigationRole, unitWidth, symbolSize, colorGroup, pressResult }))}
      {...props}
    >
      {/* ------- LABEL  --------- */}
      <span id="label">
        {symbol}
      </span>

      {/* ------- MARKER --------- */}
      <div id="marker"
        className="absolute bottom-0.5 w-3 h-0.5 rounded-full"
      />

      {/* ------- CENTER --------- */}
      <div id="center-point"
        className="absolute top-1/2 left-1/2 -translate-x-1/2
          -translate-y-1/2 w-0.5 h-0.5 rounded-full bg-red-400"
      />
    </div>
  )
}
