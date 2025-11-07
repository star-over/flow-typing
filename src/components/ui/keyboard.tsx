import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { KeyCap, KeyCapProps } from "./keycap";
import { JSX } from "react";

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

type RowProps = {
  row: KeyCapProps[];
  rowIndex: number;
}
function Row({ row, rowIndex }: RowProps): JSX.Element {
  const keyCaps = row.map(({ keyCapId }) => KeyCap({ symbol: keyCapId }))

  return (
    <div
      className="inline-flex flex-nowrap bg-slate-50 overflow-clip"
      id={rowIndex.toString()}
    >
      {keyCaps}
    </div>
  );
}

export function keyboard({ physicalKeyboard }: KeyboardProps) {
  const { layout } = physicalKeyboard;
  const rows = layout.map((row, rowIndex) => Row({ row, rowIndex }))

  return (
    <div>
      <p>{rows}</p>
    </div>
  )
}
