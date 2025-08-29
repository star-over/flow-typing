import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const keyboardVariants = cva(
  "",
  {
    variants: {

    }
  }
);

export type KeyboardProps = React.ComponentProps<"div">
  & VariantProps<typeof keyboardVariants>
  & {
    physicalKeyboard: PhysicalKeyboard,
    fingerZones: FingerZones,
    symbolLayout: SymbolLayout,
  }

export function keyboard({ }: KeyboardProps) {
  return (
    <div>
      <p>hello</p>
    </div>
  )
}
