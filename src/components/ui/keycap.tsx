import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const markerVariants = cva(
  "absolute bottom-0.5 rounded-full",
  {
    variants: {
      navigationRole: {
        IDLE: "bg-slate-200",
        HOME: "bg-slate-500",
        PATH: "bg-slate-300",
        TARGET: "bg-lime-600",
      } satisfies Record<KeyCapNavigationRole, string>,

      homeKeyMarker: {
        BAR: "w-3 h-0.5",
        DOT: "w-1 h-1",
        NONE: "invisible",
      } satisfies Record<KeyCapHomeKeyMarker, string>,
    }
  }
);


const keyCapVariants = cva(
  `flex flex-grow items-center justify-center relative
  rounded-md border-1`,
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
        "1U": "h-8 w-8 text-2xl",
        "1.25U": "h-8 w-10 text-xs",
        "1.5U": "h-8 w-12 text-sm",
        "1.75U": "h-8 w-14 text-sm",
        "2U": "h-8 w-16 text-base",
        "5U": "h-8 w-40 text-base",
      } satisfies Record<KeyCapUnitWidth, string>,
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
      pressResult: "NEUTRAL",
      unitWidth: "1U"
    },
  });

export type KeyCapProps = React.ComponentProps<"div">
  & VariantProps<typeof keyCapVariants>
  & VariantProps<typeof markerVariants>
  & KeyCapLabel

export function KeyCap({
  visibility,
  navigationRole,
  pressResult,
  homeKeyMarker,
  label = "A",
  unitWidth,
  ...props
}: KeyCapProps) {
  return (
    <div id="main-frame"
      className={cn(keyCapVariants({ visibility, navigationRole, unitWidth, pressResult }))}
      {...props}
    >
      {/* ------- LABEL  --------- */}
      <span id="label">
        {label}
      </span>

      {/* ------- MARKER --------- */}
      <div id="marker"
        className={cn(markerVariants({ homeKeyMarker, navigationRole }))}
      />

      {/* ------- CENTER --------- */}
      <div id="center-point"
        className="absolute w-0.5 h-0.5 rounded-full bg-red-500/60"
      />
    </div>
  )
}
