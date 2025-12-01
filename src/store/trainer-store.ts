import { fingerLayoutASDF } from "@/data/finger-layout-asdf";
import { keyboardLayoutANSI } from "@/data/keyboard-layout-ansi";
import { symbolLayoutEnQwerty } from "@/data/symbol-layout-en-qwerty";
import { FingerLayout, KeyboardLayout, SymbolLayout, TypedKey, TypingStream, VirtualKey } from "@/interfaces/types";
import { addAttempt, createTypingStream } from "@/lib/stream-utils";
import { findPath } from "@/lib/virtual-layout";


export const TrainerActionTypes = {
  AddAttempt: "ADD_ATTEMPT",
} as const;


export type TrainerState = {
  stream: TypingStream;
  cursorPosition: number;

  keyboardLayout: KeyboardLayout,
  symbolLayout: SymbolLayout,
  fingerLayout: FingerLayout,

  virtualLayout: VirtualKey[][]
};

export type TrainerAction = {
  type: typeof TrainerActionTypes.AddAttempt;
  payload: TypedKey;
};

const keyboardLayout = keyboardLayoutANSI;
const symbolLayout = symbolLayoutEnQwerty;
const fingerLayout = fingerLayoutASDF;
const cursorPosition = 0;
const stream = createTypingStream("hello world, this is a test.");
const virtualLayout = findPath({
  keyboardLayout,
  symbolLayout,
  fingerLayout,
  targetSymbol: stream[cursorPosition].targetSymbol.symbol,
})

export const initialTrainerState: TrainerState = {
  stream: createTypingStream("hello world, this is a test."),
  cursorPosition,
  keyboardLayout,
  symbolLayout,
  fingerLayout,
  virtualLayout,
};

export function reducer(
  state: TrainerState,
  action: TrainerAction,
): TrainerState {
  switch (action.type) {
    case TrainerActionTypes.AddAttempt:
      const newStream = addAttempt({
        stream: state.stream,
        cursorPosition: state.cursorPosition,
        typedKey: action.payload,
        startAt: 0, // Timing will be implemented later
        endAt: 0,
      });
      const newCursorPosition = state.cursorPosition + 1;
      const newVirtualLayout = findPath({
        keyboardLayout,
        symbolLayout,
        fingerLayout,
        targetSymbol: newStream[newCursorPosition].targetSymbol.symbol,
      })
      return {
        ...state,
        stream: newStream,
        cursorPosition: newCursorPosition,
        virtualLayout: newVirtualLayout
      };
    default:
      return state;
  }
}
