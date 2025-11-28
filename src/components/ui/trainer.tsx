import { KeyboardLayoutANSI } from "@/data/keyboard-layout-ansi";
import { KeyCapId } from "@/interfaces/key-cap-id";
import { JSX, useState } from "react";

const symbolKeyCapIdSet = new Set<KeyCapId>(
  KeyboardLayoutANSI
    .flat()
    .filter((key) => key.type === "SYMBOL")
    .map((key) => key.keyCapId)
);

const isKeyCapIdSymbol = (code: string): code is KeyCapId => {
  return symbolKeyCapIdSet.has(code as KeyCapId);
};

const keyProcess = (e: React.KeyboardEvent<HTMLDivElement>) => {
  if (isKeyCapIdSymbol(e.code)) {
    console.log( e.code, e.shiftKey ? "shift" : "")
    // e.stopPropagation();
    // e.preventDefault();
  }
}

export type TrainerProps = React.ComponentProps<"div">

export function Trainer(
  { className, ...props }: TrainerProps
): JSX.Element {
  console.log(symbolKeyCapIdSet);
  return (
    <div
      tabIndex={0} // Make the div focusable to receive keyboard events
      // onKeyDown={(e) =>  keyProcess(e)}
      // onKeyUp={(e) =>  keyProcess(e)}
      onKeyDownCapture={(e) => keyProcess(e)}
      // onKeyUpCapture={(e) => keyProcess(e)}
      className={className}
      {...props}
    >
      A
    </div>
  )
}
