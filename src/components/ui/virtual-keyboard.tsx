import { VirtualKey } from "@/interfaces/types";
import { KeyCap } from "./keycap";
import { JSX } from "react";
import { KeyCapId } from "@/interfaces/key-cap-id";

export type VirtualKeyboardProps = React.ComponentProps<"div">
  & {
    virtualLayout: VirtualKey[][];
    targetKeyCapId?: KeyCapId;
  }

type VirtualRowProps = React.ComponentProps<"div">
  & {
    row: VirtualKey[];
    targetKeyCapId?: KeyCapId;
  }

export function VirtualKeyboard({ virtualLayout, targetKeyCapId }: VirtualKeyboardProps): JSX.Element {
  const rows = virtualLayout.map((row: VirtualKey[], rowIndex: number) => (
    <VirtualRow row={row} key={rowIndex} targetKeyCapId={targetKeyCapId} />
  ));

  return (
    <div className="flex flex-col w-fit gap-0.5">
      {rows}
    </div>
  )
};

function VirtualRow({ row, targetKeyCapId }: VirtualRowProps): JSX.Element {
  const keyCaps = row.map((virtualKey) => {
    const navigationRole = virtualKey.keyCapId === targetKeyCapId ? "TARGET" : "IDLE";
    return <KeyCap key={virtualKey.keyCapId} {...virtualKey} navigationRole={navigationRole} />
  });

  return (
    <div className="flex flex-nowrap gap-0.5">
      {keyCaps}
    </div>
  );
};
