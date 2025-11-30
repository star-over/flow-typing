import { KeyboardLayoutANSI } from "@/data/keyboard-layout-ansi";
import { KeyCapId } from "@/interfaces/key-cap-id";
import { JSX, useReducer } from "react";
import { FlowLine } from "./flow-line";
import { TypingStream } from "@/interfaces/types";
import { createTypingStream } from "@/lib/stream-utils";

const TrainerActionTypes = {
  KeyDown: 'KEY_DOWN',
} as const;

type TrainerState = {
  text: string;
  stream: TypingStream,
  cursorPosition: number,
}

type TrainerAction =
  | { type: typeof TrainerActionTypes.KeyDown; payload: string }
  ;

const initialTrainerState: TrainerState = {
  text: "low low",
  stream: createTypingStream("hello"),
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
    case TrainerActionTypes.KeyDown:
      return {
        ...state,
        text: state.text + action.payload
      };
    default:
      return state;
  }
}

export type TrainerProps = React.ComponentProps<"div">

export function Trainer(
  { className, ...props }: TrainerProps
): JSX.Element {
  const [state, dispatch] = useReducer(reducer, initialTrainerState)

  const handleOnKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    console.log(e)
    if (isKeyCapIdSymbol(e.code)) {
      e.stopPropagation();
      e.preventDefault();
      dispatch({ type: TrainerActionTypes.KeyDown, payload: e.key });
    }
  }

  return (
    <div
      id="trainer-frame"
      tabIndex={0} // Make the div focusable to receive keyboard events
      onKeyDownCapture={handleOnKey}
      className={className}
      {...props}
    >
      {state.text}
      {/* <FlowLine></FlowLine> */}
    </div>
  )
}
