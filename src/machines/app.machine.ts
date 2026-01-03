import { createMachine, sendTo } from "xstate";

import { KeyCapId } from "@/interfaces/key-cap-id";
import { AppContext, AppEvent } from "@/interfaces/types"; // Import types from interfaces
import { generateLesson } from "@/lib/lesson-generator";

import { keyboardMachine } from "./keyboard.machine";
import { trainingMachine } from "./training.machine";

export const appMachine = createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QEMAOqB0BLAdlgLlsgDZYBeuUAxANoAMAuoqKgPawFas7MgAeiAJwBmQRkEAOAIwB2AKxy6AFhkA2eTIA0IAJ6IJAJgyqFciYLqqJwmUuFyAvg+1pMWCMTBUAygBUAggBKvgD6voH+AJIAcjEA4vRMSCBsHITcvAIIgkpKGEqqdBLW6jJ0NkraeggywnQYZdYGEnKCCqpKUk4u6NgeXnEA8mHD3gCivr7x3om8qZwZyVkiYpKyCspqGlWIwgb10gaKwqJydVKOziCufZ5UAGqRYwDqIX7+vjOMc+wLPEuIKQGToYYqCAxtKSqfYdSq6RCdPLFKQ5PaCC6CdHda69fAAJ2QuEoVAg3DA2BwADdWABrcn4wl4HBQbxgPGUrAAYzAs2S83S-1AWQMNgwdCkdWESgk8nsbR2CCUmIwwIKEgK8jaqhE2JuDKJzKobLxrDxGFQxGQ+AAZqaALYYfVMllsjnc3ksX4CzKIVSyFWFJQQqy1JRFBV+oyCDooqTq4QSSyXHqYJ3EgCKAFVIqFwlFYtEEt8+V6uIL+L7+QZA8GZVLw-DFeixYoZIm5NDxYZdb1YGB8IRmbAqAAhfwAYQA0iMQgBZMbRTMelKlxZCoSicTSeSKFTqORaRs2eqqBN0AwXSy5VloyHuYWD4K3DsdTmfzxfL-lln0IIEgsEQnIUIwrkCrCCYLYdEccbKHIBTJjiqYEgaUDjqwdoWv2XjvMEYQRDE8Sfqu5bCqK4qStKsqtHICpwaoYpWOY1hSqo2rCHejrIc6aEYZ4+BeERaTfgCCAijIYoSuUlFnNRCr7PUoiCGoFzgUq3ZXDcxqmqOE7Tr4wzvkuxaekJa4Vtkm5rDumz7oe1R+lI+Snmc0brBYShOFcOCsBAcC8K4PymSRiAALSqAqIVyOImKSHIgFKrIdAITcRKECQ5CUIFfw-ocGBAuBOQmAYxUqAq0gYHsEJHHYIguclvTuI4WXeiJUgqSqdRBnUMgWOYYFlKCSWYhc6rKHYqgcWmzLNcJ66KgmKpSHQkh0PILSQgqSoKdYbanLkxU2BxfYDpQ8AlkFOUXg0kjycV56lGB1YYB2MLgUc2oXuxGm9o++BnSZ2WtUGeQoqIMhAvsoP9cIFVDYmbVtMIcaTVxlA8Zh-EzWZWRBnJbX5GGS3lKtIhdhxYl4ljwUINYjl1OKcZnFYIhSBG+Onpe0aQsUEieQ4QA */
  id: 'app',
  initial: 'initializing',
  invoke: {
    id: 'keyboardService',
    src: keyboardMachine,
    input: ({ self }) => ({ parentActor: self }), // Pass the app machine's actor reference
  },
  context: {
    user: null,
    settings: {
      theme: 'dark',
    },
  } as AppContext,
  types: {} as {
    context: AppContext;
    events: AppEvent;
  },
  on: {
    'KEY_DOWN': {
      actions: sendTo('keyboardService', ({ event }) => ({
        type: 'KEY_DOWN',
        keyCapId: (event as { type: 'KEY_DOWN'; keyCapId: KeyCapId }).keyCapId,
      })),
    },
    'KEY_UP': {
      actions: sendTo('keyboardService', ({ event }) => ({
        type: 'KEY_UP',
        keyCapId: (event as { type: 'KEY_UP'; keyCapId: KeyCapId }).keyCapId,
      })),
    },
    'KEYBOARD.RECOGNIZED': {
      actions: sendTo('trainingService', ({ event }) => ({
        type: 'KEY_PRESS',
        keys: (event as { type: 'KEYBOARD.RECOGNIZED'; keys: KeyCapId[] }).keys,
      })),
    },
  },
  states: {
    initializing: {
      always: 'idle', // Simulate immediate initialization
    },
    idle: {
      on: {
        START_TRAINING: 'training',
        GO_TO_SETTINGS: 'settings',
        VIEW_STATS: 'stats', // Added transition
      },
    },
    training: {
      invoke: {
        id: 'trainingService',
        src: trainingMachine,
        input: {
          stream: generateLesson(),
        },
        // When the invoked machine is done, go to trainingComplete
        onDone: 'trainingComplete',
        // If the invoked machine has an error, go to the error state
        onError: 'error',
      },
      on: {
        // Event to exit training from the outside
        QUIT_TRAINING: 'idle',
      },
    },
    settings: {
      on: {
        BACK_TO_MENU: 'idle',
      },
    },
    stats: {
      on: {
        BACK_TO_MENU: 'idle',
      },
    },
    trainingComplete: {
      on: {
        START_TRAINING: 'training'
      },

      always: 'idle'
    },
    error: {
      // From error state, we can allow going back to the menu
      on: {
        BACK_TO_MENU: 'idle',
      },
    },
  },
});