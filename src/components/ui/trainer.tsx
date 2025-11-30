import { KeyboardLayoutANSI } from "@/data/keyboard-layout-ansi";
import { KeyCapId } from "@/interfaces/key-cap-id";
import { JSX, useReducer } from "react";
import { FlowLine } from "./flow-line";
import { TypedKey, TypingStream } from "@/interfaces/types";
import { addAttempt, createTypingStream } from "@/lib/stream-utils";
import { getSymbolKeyForChar } from "@/lib/symbol-utils";

const TrainerActionTypes = {
  AddAttempt: "ADD_ATTEMPT",
} as const;

type TrainerState = {
  stream: TypingStream,
  cursorPosition: number,
}

type TrainerAction =
  | { type: typeof TrainerActionTypes.AddAttempt; payload: React.KeyboardEvent<HTMLDivElement> }
  ;

const initialTrainerState: TrainerState = {
  stream: createTypingStream("hello world, this is a test."),
  cursorPosition: 0,
};

const symbolKeyCapIdSet = new Set<KeyCapId>(
  KeyboardLayoutANSI
    .flat()
    .filter((key) => key.type === "SYMBOL")
    .map((key) => key.keyCapId)
);

const isKeyCapIdSymbol = (code: string): code is KeyCapId => {
  return symbolKeyCapIdSet.has(code as KeyCapId);
};

function reducer(state: TrainerState, action: TrainerAction): TrainerState {
  switch (action.type) {
    case TrainerActionTypes.AddAttempt:
      action.payload.stopPropagation();
      action.payload.preventDefault();
      const typedKey: TypedKey = {
        keyCapId: isKeyCapIdSymbol(action.payload.code)
          ? action.payload.code
          : "Unknown",
        shift: action.payload.shiftKey,
      }
      const newStream = addAttempt({
        stream: state.stream,
        cursorPosition: state.cursorPosition,
        typedKey,
        startAt: 0, // Timing will be implemented later
        endAt: 0,
      });
      return {
        ...state,
        stream: newStream,
        cursorPosition: state.cursorPosition + 1,
      }

    default:
      return state;
  }
}

export type TrainerProps = React.ComponentProps<"div">

export function Trainer(
  { className, ...props }: TrainerProps
): JSX.Element {
  const [state, dispatch] = useReducer(reducer, initialTrainerState)

  return (
    <div
      id="trainer-frame"
      tabIndex={0} // Make the div focusable to receive keyboard events
      onKeyDownCapture={(e) => dispatch({ type: TrainerActionTypes.AddAttempt, payload: e })}
      className={className}
      {...props}
    >
      <FlowLine stream={state.stream} cursorPosition={state.cursorPosition} />
    </div>
  )
}
