import { JSX, useReducer } from "react";
import { FlowLine } from "./flow-line";
import { FingerId, KeyCapId, TypedKey } from "@/interfaces/types";
import {
  initialTrainerState,
  reducer,
  TrainerActionTypes,
} from "@/store/trainer-store";
import { isTextKey, getKeyCapIdsForChar, isShiftRequired, getFingerByKeyCap } from "@/lib/symbol-utils";
import { HandsExt } from "./hands-ext"; // Import HandsExt
import { fingerLayoutASDF } from "@/data/finger-layout-asdf"; // Import fingerLayoutASDF

export type TrainerProps = React.ComponentProps<"div">

export function Trainer(
  { className, ...props }: TrainerProps
): JSX.Element {
  const [state, dispatch] = useReducer(reducer, initialTrainerState)

  const handleOnKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (isTextKey(e.code)) {
      e.stopPropagation();
      e.preventDefault();

      const { stream, cursorPosition } = state;
      const targetSymbol = stream[cursorPosition].targetSymbol;

      const requiredKeyCapIds = getKeyCapIdsForChar(targetSymbol);
      const primaryKey = requiredKeyCapIds?.find(id => !id.includes('Shift')) || requiredKeyCapIds?.[0];
      const shiftNeeded = isShiftRequired(targetSymbol);
      
      const isCorrect = e.code === primaryKey && e.shiftKey === shiftNeeded;

      const typedKey: TypedKey = {
        keyCapId: e.code,
        shift: e.shiftKey,
        isCorrect: isCorrect,
      };
      dispatch({ type: TrainerActionTypes.AddAttempt, payload: typedKey });
    }
  }

  // Generate highlightedFingerKeys for HandsExt
  const targetSymbol = state.stream[state.cursorPosition].targetSymbol;
  const requiredKeyCapIds = getKeyCapIdsForChar(targetSymbol) || [];

  const highlightedFingerKeys: Partial<Record<FingerId, KeyCapId[]>> = {};
  requiredKeyCapIds.forEach(keyCapId => {
    const fingerId = getFingerByKeyCap(keyCapId, fingerLayoutASDF);
    if (fingerId) {
      if (!highlightedFingerKeys[fingerId]) {
        highlightedFingerKeys[fingerId] = [];
      }
      highlightedFingerKeys[fingerId]?.push(keyCapId);
    }
  });

  return (
    <div
      id="trainer-frame"
      tabIndex={0} // Make the div focusable to receive keyboard events
      onKeyDownCapture={handleOnKey}
      className={className}
      {...props}
    >
      <FlowLine stream={state.stream} cursorPosition={state.cursorPosition} />
      <HandsExt
        highlightedFingerKeys={highlightedFingerKeys}
        handStates={state.handStates}
      />
    </div>
  )
}
