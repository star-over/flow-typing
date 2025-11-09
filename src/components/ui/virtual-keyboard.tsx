import { VirtualKey } from "@/interfaces/types";
import { KeyCap } from "./keycap";
import { JSX } from "react";

export type VirtualKeyboardProps = React.ComponentProps<"div">
  & { virtualLayout: VirtualKey[][]; }

type VirtualRowProps = React.ComponentProps<"div">
  & { row: VirtualKey[]; }

export function VirtualKeyboard({ virtualLayout }: VirtualKeyboardProps): JSX.Element {
  const rows = virtualLayout.map((row: VirtualKey[], rowIndex: number) => (
    <VirtualRow row={row} key={rowIndex} />
  ));

  return (
    <div className="flex flex-col w-fit gap-0.5">
      {rows}
    </div>
  )
};

function VirtualRow({ row }: VirtualRowProps): JSX.Element {
  const keyCaps = row.map((virtualKey) => (
    <KeyCap key={virtualKey.keyCapId} {...virtualKey} />
  ));

  return (
    <div className="flex flex-nowrap gap-0.5">
      {keyCaps}
    </div>
  );
};
