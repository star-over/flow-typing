import { JSX, useReducer } from "react";
import { FlowLine } from "./flow-line";
import { TypedKey } from "@/interfaces/types";
import {
  initialTrainerState,
  reducer,
  TrainerActionTypes,
} from "@/store/trainer-store";
import { isKeyCapIdSymbol } from "@/lib/symbol-utils";
import { VirtualKeyboard } from "./virtual-keyboard";
import { Hands } from "./hands";

export type TrainerProps = React.ComponentProps<"div">

export function Trainer(
  { className, ...props }: TrainerProps
): JSX.Element {
  const [state, dispatch] = useReducer(reducer, initialTrainerState)

  const handleOnKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (isKeyCapIdSymbol(e.code)) {
      e.stopPropagation();
      e.preventDefault();

      const { stream, cursorPosition } = state;
      const targetSymbol = stream[cursorPosition].targetSymbol;
      const isCorrect = targetSymbol.keyCapId === e.code && targetSymbol.shift === e.shiftKey;

      const typedKey: TypedKey = {
        keyCapId: e.code,
        shift: e.shiftKey,
        isCorrect: isCorrect,
      };
      dispatch({ type: TrainerActionTypes.AddAttempt, payload: typedKey });
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
      <FlowLine stream={state.stream} cursorPosition={state.cursorPosition} />
      <VirtualKeyboard virtualLayout={state.virtualLayout} />
      <Hands {...state.handStates}/>
    </div>
  )
}
