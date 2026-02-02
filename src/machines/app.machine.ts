import { assign, createMachine, sendTo } from "xstate";

import { KeyCapId } from "@/interfaces/key-cap-id";
import { keyboardLayoutANSI } from '@/data/layouts/keyboard-layout-ansi'; // Import keyboardLayoutANSI

import { keyboardMachine } from "./keyboard.machine";
import { trainingMachine } from "./training.machine";
import { UserPreferences } from "@/interfaces/user-preferences";
import { TypingStream } from "@/interfaces/types";
import { generateTypingStream, lessons } from "@/lib/lesson-generator";
import { getSymbolLayout } from "@/data/layouts/layouts";

// Local types for appMachine
export interface AppContext {
  lastTrainingStream: TypingStream | null;
  currentKeyboardLayout: UserPreferences['keyboardLayout'];
}

export type AppEvent =
  | { type: 'START_TRAINING', keyboardLayout: UserPreferences['keyboardLayout'] }
  | { type: 'TO_SETTINGS' }
  | { type: 'TO_ALL_STAT' }
  | { type: 'TO_MENU' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'TRAINING.COMPLETE', stream: TypingStream }
  | { type: 'KEY_DOWN'; keyCapId: KeyCapId }
  | { type: 'KEY_UP'; keyCapId: KeyCapId }
  | { type: 'RESET_KEYBOARD' }
  | { type: 'KEYBOARD.CHARACTER_INPUT'; keys: KeyCapId[] }
  | { type: 'KEYBOARD.NAVIGATION_KEY'; key: KeyCapId };

export const appMachine = createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QEMAOqDEBpAogTQH0ARAeQHUA5AbQAYBdRUVAe1gEsAXN5gO0ZAAeiAIwAmABzCAdAE454mTQBsAFgCs6mcIA0IAJ6IAzKLVSlWyQHZDl8ROEaAvo91pMuQgFUACrQZIQFnYuXn4hBGEVGUMpUUs1Y0NxGkt4pV0DBGNTc2ErGztJJxcQN2x8ACESAEEAJSIpWpwAYRIAcQoASQAtHCI-fiDObj4A8JlLUTMJURVDKKVLB3EMoxMzCxsVUUMxNSVnV3QpNh5h5AAbNgAvU6gMAYChkNHQcOFhJRopcXm1cSU8wmilEqwQSkiZiUEMMMm2hl2cMOpWOAFswDwAK4YADKABU6niCHjatVOl0KG1HkxWMNQmMRB8YkoEvsomphHComDLCypIY1CkNALUh9kW4pOisRg8SQCDicHi8eS2jjqYFaS8wiJRF8pDQLLNVIkVGClHF+RoZKIZL9fmpLDJxWiMdjZQRqgAZT3ygl49XPEbahC2mSyGiGQFzOYGmim-SIc2WS1RG12gXiZ2oKQcABOyFOdxlpPJKqkrQAst5PYqcAHNUGGRFhDRvjDRLqlhIwS25lJLFEZPtjNtLHGszn84WePdvNVPAr68FG28RAjpJI8lHkkpxBowXCw7aW6kFLsbQcShLYGAOFwZ7AZXKKzgKJ4l3TXoIRNGpA6VMISyckm6QJuC8RSJEvIaBGNDiNsmZXsceYFmcM7NMwqKoBct5gE+BAvm+H5ak24hLP2rYdjs5jWBMPYONIEwAeIkg0Hke6Xkc2YodOUAYVhOEcHh+KEsSJYUlS9CDA29KriGKhKLECQKDR1p2KCYG-NIUQfOaogfJEdgTqgyCYje+GEe+UlPDJX7vL+-6fHuEjRJGPJ8gKKTJNEcKRqIxmmeZIm1ESJJkhJxErt+EQ2jEnxxAkvLmg4ahglpUg6fF+kfCovwBWZeFNDingvpFsnRcI2SxGm8xjo6sJpdaGWIh8sxzNanEotxU5oVAOIcMguYcA81k0su5XvJ83w0LMEa7n5cxpfB-KqCxSQSOaLETpcFz9cgw3upZZV2YgZHSGOM0mBGY52DoYGLKYUEsiosHwRIzglDwzAQHA-BuNJ40nQgdgxBdVGRhMsKWGCcxTLs8ORgsyhkROhZcJcNx3ADn7Bjl0hfK5bF5HExhgvsikKRovKwSYswTlKmLYyRckfP8sSGHGyxsRyQ48nBGVqDIEIttCdhRBOPG9UzUWTbqPxyHGAp+QaqVgXCcN5PMkgdYLE43nedzwDZgO4yo2z9ooCKw8kcaq5kSb6h2Q5DvpcEOBLPV3Px2G4dLE2MnksgvXBygthYd2ZKz+PbHkM1m2I8z5TeftA5ECRmGoF6CmIocHlEZhRHG0KwkOkQe6hdx7UNKe45VilxlyuQOi7aW7JBguVQa0LbA620XLtA0cDXpF2JaqRpI66gmGaFqXQoe7RICCQfY4QA */
  id: 'app',
  initial: 'initializing',
  invoke: {
    id: 'keyboardService',
    src: keyboardMachine,
    input: ({ self }) => ({
      parentActor: self,
      keyboardLayout: keyboardLayoutANSI // Pass layout here
    }),
  },
  context: {
    lastTrainingStream: null,
    currentKeyboardLayout: 'qwerty' // Default value
  } as AppContext,
  types: {} as {
    context: AppContext;
    events: AppEvent;
  },
  on: {
    KEY_DOWN: {
      actions: sendTo('keyboardService', ({ event }) => ({
        type: 'KEY_DOWN',
        keyCapId: (event as { type: 'KEY_DOWN'; keyCapId: KeyCapId }).keyCapId,
      })),
    },
    KEY_UP: {
      actions: sendTo('keyboardService', ({ event }) => ({
        type: 'KEY_UP',
        keyCapId: (event as { type: 'KEY_UP'; keyCapId: KeyCapId }).keyCapId,
      })),
    },
    RESET_KEYBOARD: {
      actions: sendTo('keyboardService', { type: 'RESET' } )
    },
    // Global handling for character input - forward to trainingService
    'KEYBOARD.CHARACTER_INPUT': {
      actions: sendTo('trainingService', ({ event }) => ({
        type: 'KEY_PRESS',
        keys: event.keys,
      })),
    },
    // Global handling for app-level events (TRAINING.COMPLETE)
    'TRAINING.COMPLETE': {
      actions: assign({
        lastTrainingStream: ({ event }) => event.stream
      })
    }
  },
  states: {
    initializing: {
      always: "menu", // Simulate immediate initialization
    },

    menu: {
      on: {
        START_TRAINING: {
          target: "trainingStart",
          reenter: true,
          actions: assign({
            lastTrainingStream: ({ event }) => {
              const symbolLayout = getSymbolLayout(event.keyboardLayout);
              const randomIndex = Math.floor(Math.random() * lessons.length);
              const lessonText = lessons[randomIndex];
              return generateTypingStream(lessonText, symbolLayout);
            },
            currentKeyboardLayout: ({ event }) => event.keyboardLayout // Added
          })
        },
        TO_SETTINGS: 'settings',
        TO_ALL_STAT: "allStat"
      },
    },

    training: {
      initial: 'running',
      invoke: {
        id: 'trainingService',
        src: trainingMachine,
        input: ({ context, self }) => {
          return {
            stream: context.lastTrainingStream!,
            keyboardLayout: context.currentKeyboardLayout,
            parentActor: self,
          };
        },
      },
      on: {
        'TRAINING.COMPLETE': {
          target: 'trainingComplete',
          actions: assign({
            lastTrainingStream: ({ event }) => event.stream,
          }),
        },
      },
      states: {
        running: {
          on: {
            PAUSE: 'paused',
            'KEYBOARD.NAVIGATION_KEY': {
              guard: ({ event }) => event.key === 'Escape',
              target: 'paused',
            },
          },
        },
        paused: {
          entry: sendTo('keyboardService', { type: 'RESET' }), // <-- Added this
          on: {
            RESUME: 'running',
            TO_MENU: '#app.menu',
            'KEYBOARD.NAVIGATION_KEY': [
              {
                guard: ({ event }) => event.key === 'Escape',
                target: '#app.menu',
              },
              {
                guard: ({ event }) => event.key === 'Enter',
                target: 'running',
              },
            ],
          },
        },
      },
    },

    settings: {
      on: {
        TO_MENU: "menu"
      },
    },

    trainingComplete: {
      on: {
        TO_MENU: {
          target: "menu",
          reenter: true
        },
        START_TRAINING: {
          target: "trainingStart",
          reenter: true,
          actions: assign({
            lastTrainingStream: ({ event }) => {
              const symbolLayout = getSymbolLayout(event.keyboardLayout);
              const randomIndex = Math.floor(Math.random() * lessons.length);
              const lessonText = lessons[randomIndex];
              return generateTypingStream(lessonText, symbolLayout);
            },
            currentKeyboardLayout: ({ event }) => event.keyboardLayout // Added
          })
        },
        // Handle navigation keys after training completion
        'KEYBOARD.NAVIGATION_KEY': {
          guard: ({ event }) => event.key === 'Enter',
          target: 'trainingStart',
          actions: assign({
            lastTrainingStream: ({ context }) => {
              const symbolLayout = getSymbolLayout(context.currentKeyboardLayout);
              const randomIndex = Math.floor(Math.random() * lessons.length);
              const lessonText = lessons[randomIndex];
              return generateTypingStream(lessonText, symbolLayout);
            },
            currentKeyboardLayout: ({ context }) => context.currentKeyboardLayout
          })
        }
      },
    },

    trainingStart: {
      always: "training"
    },

    allStat: {
      on: {
        TO_MENU: "menu"
      }
    }
  },
});

