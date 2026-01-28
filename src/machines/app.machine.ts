import { assign, createMachine, sendTo } from "xstate";

import { KeyCapId } from "@/interfaces/key-cap-id";

import { keyboardMachine } from "./keyboard.machine";
import { trainingMachine } from "./training.machine";
import { UserPreferences } from "@/interfaces/user-preferences";
import { TypingStream } from "@/interfaces/types";
import { generateTypingStream, lessons } from "@/lib/lesson-generator";
import { getSymbolLayout } from "@/data/layouts";

// Local types for appMachine
export interface AppContext {
  lastTrainingStream: TypingStream | null;
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
  | { type: 'KEYBOARD.RECOGNIZED'; keys: KeyCapId[] };

export const appMachine = createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QEMAOqDEBpAogTQH0ARAeQHUA5AbQAYBdRUVAe1gEsAXN5gO0ZAAeiAIwAmABzCAdAE454mTQBsAFgCs6mcIA0IAJ6IAzKLVSlWyQHZDl8ROEaAvo91pMuQgFUACrQZIQFnYuXn4hBGEVGUMpUUs1Y0NxGkt4pV0DBGNTc2ErGztJJxcQN2x8ACESAEEAJSIpWpwAYRIAcQoASQAtHCI-fiDObj4A8JlLUTMJURVDKKVLB3EMoxMzCxsVUUMxNSVnV3QpNh5h5AAbNgAvU6gMAYChkNHQcOFhJRopcXm1cSU8wmilEqwQSkiZiUEMMMm2hl2cMOpWOAFswDwAK4YADKABU6niCHjatVOl0KG1HkxWMNQmMRB8YkoEvsomphHComDLCypIY1CkNALUh9kW4pOisRg8SQCDicHi8eS2jjqYFaS8wiJRF8pDQLLNVIkVGClHF+RoZKIZL9fmpLDJxWiMdjZQRqgAZT3ygl49XPEbahC2mSyGiGQFzOYGmim-SIc2WS1RG12gXiZ2oKQcABOyFOdxlpPJKqkrQAst5PYqcAHNUGGRFhDRvjDRLqlhIwS25lJLFEZPtjNtLHGszn84WePdvNVPAr68FG28RAjpJI8lHkkpxBowXCw7aW6kFLsbQcShLYGAOFwZ7AZXKKzgKJ4l3TXoIRNGpA6VMISyckm6QJuC8RSJEvIaBGNDiNsmZXsceYFmcM7NMwqKoBct5gE+BAvm+H5ak24hLP2rYdjs5jWBMPYONIEwAeIkg0Hke6Xkc2YodOUAYVhOEcHh+KEsSJYUlS9CDA29KriGKhKLECQKDR1p2KCYG-NIUQfOaogfJEdgTqgyCYje+GEe+UlPDJX7vL+-6fHuEjRJGPJ8gKKTJNEcKRqIxmmeZIm1ESJJkhJxErt+EQ2jEnxxAkvLmg4ahglpUg6fF+kfCovwBWZeFNDingvpFsnRcI2SxGm8xjo6sJpdaGWIh8sxzNanEotxU5oVAOIcMguYcA81k0su5XvJ83w0LMEa7n5cxpfB-KqCxSQSOaLETpcFz9cgw3upZZV2YgZHSGOM0mBGY52DoYGLKYUEsiosHwRIzglDwzAQHA-BuNJ40nQgdgxBdVGRhMsKWGCcxTLs8ORgsyhkROhZcJcNx3ADn7Bjl0hfK5bF5HExhgvsikKRovKwSYswTlKmLYyRckfP8sSGHGyxsRyQ48nBGVqDIEIttCdhRBOPG9UzUWTbqPxyHGAp+QaqVgXCcN5PMkgdYLE43nedzwDZgO4yo2z9ooCKw8kcaq5kSb6h2Q5DvpcEOBLPV3Px2G4dLE2MnksgvXBygthYd2ZKz+PbHkM1m2I8z5TeftA5ECRmGoF6CmIocHlEZhRHG0KwkOkQe6hdx7UNKe45VilxlyuQOi7aW7JBguVQa0LbA620XLtA0cDXpF2JaqRpI66gmGaFqXQoe7RICCQfY4QA */
  id: 'app',
  initial: 'initializing',
  invoke: {
    id: 'keyboardService',
    src: keyboardMachine,
    input: ({ self }) => ({ parentActor: self }), // Pass the app machine's actor reference
  },
  context: {
    lastTrainingStream: null
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
    'KEYBOARD.RECOGNIZED': {
      actions: sendTo('trainingService', ({ event }) => ({
        type: 'KEY_PRESS',
        keys: (event as { type: 'KEYBOARD.RECOGNIZED'; keys: KeyCapId[] }).keys,
      })),
    },
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
            }
          })
        },

        TO_SETTINGS: 'settings',
        TO_ALL_STAT: "allStat"
      },
    },

    training: {
      invoke: {
        id: 'trainingService',
        src: trainingMachine,

        input: ({ context, event, self }) => {
          const keyboardLayout = (event.type === 'START_TRAINING') ? event.keyboardLayout : 'qwerty';
          return {
            stream: context.lastTrainingStream!,
            keyboardLayout,
            parentActor: self
          };
        },
      },
      on: {
        'TRAINING.COMPLETE': {
            target: 'trainingComplete',
            actions: assign({
              lastTrainingStream: ({ event }) => event.stream
            })
        },
        PAUSE: {
          target: "pause",
          reenter: true
        }
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
            }
          })
        }
      },
    },

    pause: {
      on: {
        TO_MENU: "menu",
        START_TRAINING: {
          target: "trainingStart",
          actions: assign({
            lastTrainingStream: ({ event }) => {
              const symbolLayout = getSymbolLayout(event.keyboardLayout);
              const randomIndex = Math.floor(Math.random() * lessons.length);
              const lessonText = lessons[randomIndex];
              return generateTypingStream(lessonText, symbolLayout);
            }
          })
        },
        RESUME: "training"
      }
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
