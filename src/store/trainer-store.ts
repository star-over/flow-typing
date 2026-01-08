import { fingerLayoutASDF } from "@/data/finger-layout-asdf";
import {
  HandStates,
  TypedKey,
  TypingStream,
} from "@/interfaces/types";
import { getHandStates } from "@/lib/hand-utils";
import { addAttempt, createTypingStream } from "@/lib/stream-utils";

export const TrainerActionTypes = {
  AddAttempt: "ADD_ATTEMPT",
} as const;

export type TrainerState = {
  stream: TypingStream;
  cursorPosition: number;
  handStates: HandStates;
  lastTypedKey?: TypedKey; // Track the last typed key for error indication
};

export type TrainerAction = {
  type: typeof TrainerActionTypes.AddAttempt;
  payload: TypedKey;
};

// Layouts are static and don't need to be in the state
const fingerLayout = fingerLayoutASDF;

export function createInitialState(text: string): TrainerState {
  const cursorPosition = 0;
  const stream = createTypingStream(text);
  const targetSymbol = stream[cursorPosition].targetSymbol;
  const handStates = getHandStates(targetSymbol, undefined, fingerLayout);

  return {
    stream,
    cursorPosition,
    handStates,
  };
}

export const initialTrainerState: TrainerState = createInitialState(
  "hello world, this is a test.",
);

export function reducer(
  state: TrainerState,
  action: TrainerAction,
): TrainerState {
  switch (action.type) {
    case TrainerActionTypes.AddAttempt: {
      const typedKey = action.payload;

      const newStream = addAttempt({
        stream: state.stream,
        cursorPosition: state.cursorPosition,
        typedKey: typedKey,
        startAt: 0, // Timing will be implemented later
        endAt: 0,
      });

      // Update hand states with error indication logic
      const currentTargetSymbol = state.stream[state.cursorPosition].targetSymbol;
      const newHandStates = getHandStates(
        currentTargetSymbol,
        typedKey, // Pass the typed key for error indication
        fingerLayout,
      );

      // If the attempt was incorrect, just update the stream and hand states
      // but keep the cursor and derived state the same.
      if (!typedKey.isCorrect) {
        return {
          ...state,
          stream: newStream,
          handStates: newHandStates,
          lastTypedKey: typedKey,
        };
      }

      // Prevent moving cursor out of bounds after a correct attempt
      if (state.cursorPosition >= newStream.length - 1) {
        return {
          ...state,
          stream: newStream,
          lastTypedKey: typedKey,
        };
      }

      // If correct, advance the cursor and calculate new derived state
      const newCursorPosition = state.cursorPosition + 1;
      const newTargetSymbol = newStream[newCursorPosition].targetSymbol;
      const nextHandStates = getHandStates(
        newTargetSymbol,
        undefined, // No error on correct typing
        fingerLayout,
      );

      return {
        ...state,
        stream: newStream,
        cursorPosition: newCursorPosition,
        handStates: nextHandStates,
        lastTypedKey: typedKey,
      };
    }
    default:
      return state;
  }
}
