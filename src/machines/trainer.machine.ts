
import { TypedKey, TypingStream, VirtualKey, HandStates } from "@/interfaces/types";
import { setup, createMachine } from "xstate";

export type TrainerContext = {
  // We will fill this in as we go
  stream: TypingStream;
  cursorPosition: number;
  virtualLayout: VirtualKey[][];
  handStates: HandStates;
  lastTypedKey?: TypedKey;
};

export type TrainerEvent =
  | { type: "START" }
  | { type: "ESC" }
  | { type: "KEY_PRESS"; payload: TypedKey }
  | { type: "PAUSE" }
  | { type: "RESUME" };

// A minimal initial context for the new machine
const initialContext: TrainerContext = {
    stream: [],
    cursorPosition: 0,
    virtualLayout: [],
    handStates: {} as HandStates,
    lastTypedKey: undefined,
}

export const trainerMachine = setup({
  types: {
    context: {} as TrainerContext,
    events: {} as TrainerEvent,
    // input: {} as { text: string }, // This will be added when we need dynamic initial context
  },
  guards: {
    inProgress: ({ context }) => {
      // Checks if there are more characters to type.
      return context.stream.length > 0 && context.cursorPosition < context.stream.length;
    },
    isFinished: ({ context }) => {
      // Checks if the typing is complete.
      return context.stream.length > 0 && context.cursorPosition >= context.stream.length;
    },
  },
  // We will add actions here later
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QBcBOBDAlgOzKgdLMuthAEICeAxAMoAqAggEp0DaADALqKgAOA9rEzJM-bDxAAPRAEYAbAE58AdhkBmAKxqAHAsUyALACZlygDQgKiNcqMq5GjSYWrlB9toC+ni2iy4CAHcsZBpiVGQ6Cl4cKCoAaQBRAE0AfQAFJkSaGg5uJBABIRExCWkEIz18IwdtI212A101QwMLKwQNQ3wFBu1tZRaDGRc5b18MHDx8YOEw9AiomOw4pLTM7NyZfL5BYVFxAvLK5Xw1djVjDTl+m4U1dsQNQfxtZ7kajzkZRq8fED8UwIyGisSo6QYAFUaIk8hIivtSkdENpFK8jEZfpcFBd2HJHggbHZlA4nMoXDI3B5xgDJgF8CDlqsUhksjk4QUESVDqByo45Gd2DINHibGoPjYCV0DD0+gMhiNTDTAfTGWC1qzNqxtvC9tyyk8uvgHAoDIM8TJKXI2pYni83iTPqifk1lXTprx0ABXWCQKhsyEAWVhXF1xQOBoQpg0ryaChk-Q8HhtHXOAoManFI20BjkNnY1zd-g93t9EFojBYHN24aRvKeDhU8nUN2GXXJBIx2nwBlzhnO8g82aLQPwnp9fuyAGFq4U9RHkQhLfcztaFCZFLpBinrLZY29NMo6uv+yP6UR0CIiJgAMYV5hsUOc+d1qS79j4LTaQw-bQtS07kucgCt+xiimolSXCS3j-Ng-AQHAEgqngYaIjyb4IAAtPitpRkoBjxpU9SXGBBgaGe0wXqQlCofqi7GASRKfvIIpkTo2amhRQQhPMiygistELvWhJGGo+BJqoTjDIMuiMXuXQOI00osVxDL8VAgmvuU3wxkehhvLoihrnJdgKaxX4cQYqnjmWmnoeUCgKDGjkeBB7CicR5i4UxZlKexvScf8yEEBeV4iDedmRuoFzGhBwxkf0f4KCZzGKWRP4ODBnhAA */
  id: "trainer",
  initial: "standBy",
  context: initialContext, // Assign the initial context here
  states: {
    standBy: {
      on: {
        START: {
          target: "waitStartTyping",
        }
      },
    },

    waitStartTyping: {
      on: {
        KEY_PRESS: [{
          target: "typing",
          guard: "inProgress",
        }, {
          target: "statistic",
          guard: "isFinished"
        }]
      }
    },

    typing: {
      on: {
        PAUSE: {
          target: "paused",
        },

        KEY_PRESS: [{
          target: "typing",
          guard: "inProgress"
        }, {
          target: "statistic",
          guard: "isFinished"
        }]
      },
    },

    paused: {
      on: {
        RESUME: {
          target: "typing"
        },
        START: {
          target: "waitStartTyping",
        },

        ESC: {
          target: "statistic",
        }
      },
    },

    statistic: {
      on: {
        START: {
          target: "waitStartTyping",
        }
      }
    }
  },
});
