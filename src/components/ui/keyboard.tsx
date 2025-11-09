import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { KeyCap, KeyCapProps } from "./keycap";
import { JSX } from "react";


const keyboardVariants = cva("", { variants: {} });

export type KeyboardProps = React.ComponentProps<"div">
  & VariantProps<typeof keyboardVariants>
  & {
    physicalKeyboard: KeyboardLayout, // Renamed
    fingerLayout: FingerLayout, // Renamed
    symbolLayout: SymbolLayout, // Type is now SymbolKey[]
  }

type RowProps = {
  row: PhysicalKey[]; // Renamed
  rowIndex: number;
  symbolLayout: SymbolLayout; // Renamed, and now correctly SymbolKey[]
  fingerLayout: FingerLayout; // Renamed
}

function Row(props: RowProps): JSX.Element {
  const { row, rowIndex, symbolLayout, fingerLayout } = props;
  const keyCaps = row.map((item: PhysicalKey, colIndex: number) => { // Added explicit types
    const symbolLayoutItem: SymbolKey | undefined = symbolLayout
      .find((symbolKey: SymbolKey) => symbolKey.keyCapId === item.keyCapId && symbolKey.shift === false); // Fixed destructuring and access

    const fingerZoneItem: FingerKey | undefined = fingerLayout
      .find((fingerKey: FingerKey) => fingerKey.keyCapId === item.keyCapId); // Fixed destructuring and access

    const keyCapProps = {
      ...item,
      symbol: symbolLayoutItem?.symbol,
      navigationRole: fingerZoneItem?.navigationRole,
      fingerId: fingerZoneItem?.fingerId,
    };

    return KeyCap(keyCapProps)
  })


  return (
    <div className="flex flex-nowrap gap-0.5">
      {keyCaps}
    </div>
  );
}

export function Keyboard(props: KeyboardProps) {
  const { physicalKeyboard, symbolLayout, fingerLayout: fingerZones } = props;
  const keyboardGrid = physicalKeyboard
    .map((row: PhysicalKey[], rowIndex: number) => Row({ row, rowIndex, symbolLayout, fingerLayout: fingerZones })) // Added explicit types

  return (
    <div className="flex flex-col w-fit gap-0.5">
      {keyboardGrid}
    </div>
  )
}
