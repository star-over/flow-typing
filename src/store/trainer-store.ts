import { TypedKey, TypingStream } from "@/interfaces/types";
import { addAttempt, createTypingStream } from "@/lib/stream-utils";

export const TrainerActionTypes = {
  AddAttempt: "ADD_ATTEMPT",
} as const;

export type TrainerState = {
  stream: TypingStream;
  cursorPosition: number;
};

export type TrainerAction = {
  type: typeof TrainerActionTypes.AddAttempt;
  payload: TypedKey;
};

export const initialTrainerState: TrainerState = {
  stream: createTypingStream("hello world, this is a test."),
  cursorPosition: 0,
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
      return {
        ...state,
        stream: newStream,
        cursorPosition: state.cursorPosition + 1,
      };
    default:
      return state;
  }
}
