import { KeyCapId } from "@/interfaces/key-cap-id";
import { isTextKey } from "@/lib/symbol-utils";
import { assign, createMachine } from "xstate";

export interface KeyboardMachineContext {
  pressedKeys: Set<KeyCapId>;
  onRecognize: (keys: KeyCapId[]) => void;
}

export type KeyboardMachineEvent =
  | { type: "KEY_DOWN"; keyCapId: KeyCapId }
  | { type: "KEY_UP"; keyCapId: KeyCapId }
  | { type: "RESET" };

export const keyboardMachine = createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QGswE8BGB7AhgJwgGIBpAUQE0B9AVQAUBtABgF1FQAHLWASwBdusAOzYgAHogBMEgOwA6RgBYlANmWMAnNKUT1EgDQg0iALQBGAKwAOWRMbmAzIx2WpC5QvMBfTwdSZcBIQASqQAyqQAKkysSCCcPPxCIuII5hKy0tKm9i7K9lrSltL6hiYW1rYOTuouEm4e3r7o2PhEZFQAIgDyAOoActEi8XwCwrEp+XLZmZaqdcoSytkGRghmVjZ2js6u7l4+IH4tge2U3f30pjEcXCNJ44jK0sqyljn2Oc6mlj8rZRuVbY1XYNA5HAIQWQAG24sF4YEE3EEUEIg1iw0SY1AEzkWXUjkYllMCnU5mk5nMfwQ2XMNk05mJOQWplUlkah2aENkeDAAGMsFBEQAvSColhDW6Y5KIBTPWQKCQshSKSyy1X2KnmF4MxQybKOZ4K7wHQRYCBwETg1oShKjaVrKSyJbSdQKUzu8xuxUSDWlB0eWRpFxKyyMZ5h5Tsq0EWTcCBQsA2u5YsSSWmfOw-VVWQqZKnGAM-OqEjymCSe+wSKOc1rQ2HwxHIpNSh4INz2eQLRZazRl8zqKnZdJZCRFdTudzEz3V-y1nn8wXcEUQZt21s5Co5RQKSumYpafOFlzK7N9nf2fbeIA */
  id: "keyboard",
  // tsTypes: {} as import("./keyboard.machine.typegen").Typegen0,
  schemas: {
    context: {} as KeyboardMachineContext,
    events: {} as KeyboardMachineEvent,
  },
  initial: "idle",
  context: {
    pressedKeys: new Set<KeyCapId>(),
    onRecognize: (_keys: KeyCapId[]) => {},
  },
  on: {
    // Общие обработчики для всех состояний
    KEY_UP: {
      target: ".listening", // Переоцениваем состояние
      actions: "removeKeyCapId",
    },
    RESET: {
      target: ".idle",
      actions: "clearKeys",
    },
    KEY_DOWN: [
      {
        target: ".recognized",
        guard: "isTextKeyGuard",
        actions: ["addKeyCapId"],
      },
      {
        target: ".listening",
        // This transition is taken if the guard on the first one fails.
        actions: ["addKeyCapId"],
      },
    ],
  },
  states: {
    idle: {
      entry: "clearKeys",
    },
    listening: {
      // Если после KEY_UP не осталось клавиш, переходим в idle
      always: [
        {
          guard: "areKeysEmpty",
          target: "idle",
        },
      ],
    },
    recognized: {
      entry: ["recognizePressedKeys"],
      always: {
        target: "listening",
      },
    },
  },
},
{
  actions: {
    addKeyCapId: assign(({
      context,
      event
    }) => {
      if (event.type !== "KEY_DOWN") {
        return {};
      }
      const newSet = new Set(context.pressedKeys);
      newSet.add(event.keyCapId);
      return {
        pressedKeys: newSet,
      };
    }),
    removeKeyCapId: assign(({
      context,
      event
    }) => {
      if (event.type !== "KEY_UP") {
        return {};
      }
      const newSet = new Set(context.pressedKeys);
      newSet.delete(event.keyCapId);
      return {
        pressedKeys: newSet,
      };
    }),
    clearKeys: assign((_) => ({
      pressedKeys: new Set<KeyCapId>(),
    })),
    recognizePressedKeys: ({
      context
    }) => {
      context.onRecognize(Array.from(context.pressedKeys));
    },
  },
  guards: {
    isTextKeyGuard: ({
      event
    }) => {
      if (event.type !== "KEY_DOWN") return false;
      return isTextKey(event.keyCapId);
    },
    areKeysEmpty: ({
      context
    }) => context.pressedKeys.size === 0,
  },
});

