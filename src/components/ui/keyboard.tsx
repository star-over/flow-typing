import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { KeyCap, KeyCapProps } from "./keycap";
import { JSX } from "react";

const keyboardVariants = cva("", { variants: {} });

export type KeyboardProps = React.ComponentProps<"div">
  & VariantProps<typeof keyboardVariants>
  & {
    physicalKeyboard: PhysicalKeyboard,
    fingerZones: FingerZones,
    symbolLayout: SymbolLayout,
  }

type RowProps = {
  row: PhysicalKeyboardItem[];
  rowIndex: number;
  symbolLayout: SymbolLayout;
  fingerZones: FingerZones;
}

function Row(props: RowProps): JSX.Element {
  const { row, rowIndex, symbolLayout, fingerZones } = props;
  const keyCaps = row.map((item, colIndex) => {
    const symbolLayoutItem = symbolLayout
      .find(({ keyCapId, shift }) => keyCapId === item.keyCapId && shift === false);

    const fingerZoneItem = fingerZones
      .find(({ keyCapId }) => keyCapId === item.keyCapId);

    const keyCapProps = {
      ...item,
      symbol: symbolLayoutItem?.symbol,
      navigationRole: fingerZoneItem?.navigationRole,
      fingerId: fingerZoneItem?.fingerId,
    };

    return KeyCap(keyCapProps)
  })


  return (
    <div className="inline-flex flex-nowrap bg-slate-100 overflow-clip">
      {keyCaps}
    </div>
  );
}

export function Keyboard(props: KeyboardProps) {
  const { physicalKeyboard, symbolLayout, fingerZones } = props;
  const keyboardGrid = physicalKeyboard
    .map((row, rowIndex) => Row({ row, rowIndex, symbolLayout, fingerZones }))

  return (
    <div>
      {keyboardGrid}
    </div>
  )
}
