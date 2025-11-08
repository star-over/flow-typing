import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const symbolSizeVariants = cva("",
  {
    variants : {
      symbolSize: {
        "MD": "text-xl",
        "SM": "text-sm",
        "XS": "text-xs",
      } satisfies Record<KeyCapSymbolSize, string>,
    },
    defaultVariants: {
      symbolSize: "MD",
    },
  },
);

const markerVariants = cva("absolute bottom-0.5 rounded-full",
  {
    variants: {
      homeKeyMarker: {
        BAR: "w-3 h-0.5",
        DOT: "w-1 h-1",
        NONE: "invisible",
      } satisfies Record<KeyCapHomeKeyMarker, string>,
    },
    defaultVariants: {
      homeKeyMarker: "NONE",
    },
  }
);

const centerPointVariants = cva(
  `absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 
  w-0.5 h-0.5 rounded-full bg-red-500/80`,
  {
    variants: {
      centerPointVisibility: {
        VISIBLE: "visible",
        INVISIBLE: "invisible",
      } satisfies Record<Visibility, string>
    },
    defaultVariants: {
      centerPointVisibility: "INVISIBLE",
    }
  }
);

const keyCapVariants = cva(
  "flex items-center justify-center relative rounded-sm border-1 h-8",
  {
    variants: {
      visibility: {
        INVISIBLE: "invisible",
        VISIBLE: "visible",
      } satisfies Record<Visibility, string>,

      navigationRole: {
        IDLE: "bg-slate-50 text-slate-300 border-slate-200",
        HOME: "bg-lime-50 text-slate-400 border-slate-300 outline-2 outline-slate-300",
        PATH: "bg-lime-50 text-slate-400 border-slate-300",
        TARGET: "bg-lime-100 text-lime-700 border-lime-300 outline-2 outline-lime-300",
      } satisfies Record<KeyCapNavigationRole, string>,

      pressResult: {
        NEUTRAL: "animate-none",
        CORRECT: "animate-bounce",
        INCORRECT: "animate-pulse bg-red-200 text-red-700 border-red-300",
      } satisfies Record<KeyCapPressResult, string>,

      unitWidth: {
        "1U":    "w-8",
        "1.25U": "w-11",
        "1.5U":  "w-13",
        "1.75U": "w-15",
        "2U":    "w-19",
        "5U":    "w-42",
      } satisfies Record<KeyCapUnitWidth, string>,

      colorGroup: {
        PRIMARY: "bg-slate-50 text-slate-300 border-slate-200",
        SECONDARY: "bg-slate-150 text-slate-400 border-slate-400",
        ACCENT: "bg-orange-50 text-orange-300 border-orange-200",
      } satisfies Record<KeyCapColorGroup, string>,
    },

    compoundVariants: [
      {
        navigationRole: ["HOME", "TARGET"],
        pressResult: "INCORRECT",
        class: "outline-red-300",
      },
    ],

    defaultVariants: {
      visibility: "VISIBLE",
      navigationRole: "IDLE",
      unitWidth: "1U",
      colorGroup: "PRIMARY",
      pressResult: "NEUTRAL",
    },
  });




export type KeyCapProps = React.ComponentProps<"div">
  & VariantProps<typeof keyCapVariants>
  & VariantProps<typeof markerVariants>
  & VariantProps<typeof centerPointVariants>
  & VariantProps<typeof symbolSizeVariants>
  & KeyCapLabel

export function KeyCap({
  visibility,
  navigationRole,
  unitWidth,
  colorGroup,
  pressResult,
  symbolSize,
  homeKeyMarker,
  centerPointVisibility,
  symbol = "A",
  ...props
}: KeyCapProps) {
  return (
    <div id="main-frame"
      className={cn(keyCapVariants({ visibility, navigationRole, unitWidth, colorGroup, pressResult }))}
      {...props}
    >
      {/* ------- LABEL  --------- */}
      <span id="label"
        className={cn(symbolSizeVariants({ symbolSize }))}
      >
        {symbol}
      </span>

      {/* ------- MARKER --------- */}
      <div id="marker"
        className={cn(markerVariants({ homeKeyMarker }))}
      />

      {/* ------- CENTER --------- */}
      <div id="center-point"
        className={cn(centerPointVariants({ centerPointVisibility }))}
      />
    </div>
  )
}
