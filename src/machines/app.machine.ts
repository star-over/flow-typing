import { assign, sendTo, setup } from "xstate";

import type { KeyCapId } from "@/interfaces/key-cap-id";
import type { SymbolLayoutId, TypingStream } from "@/interfaces/types";
import { physicalLayoutANSI } from '@/data/layouts/physical-layout-ansi';
import { getSymbolLayout } from "@/data/layouts/layouts";
import { generateTypingStream, defaultDrillTexts } from "@/lib/typing-stream";

import { keyboardMachine } from "./keyboard.machine";
import { trainingMachine } from "./training.machine";

export interface AppContext {
  lastTrainingStream: TypingStream | null;
  currentSymbolLayoutId: SymbolLayoutId;
}

export type AppEvent =
  | { type: 'START_TRAINING'; symbolLayoutId: SymbolLayoutId }
  | { type: 'TO_SETTINGS' }
  | { type: 'TO_ALL_STAT' }
  | { type: 'TO_MENU' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'TRAINING.COMPLETE'; stream: TypingStream }
  | { type: 'KEY_DOWN'; keyCapId: KeyCapId }
  | { type: 'KEY_UP'; keyCapId: KeyCapId }
  | { type: 'RESET_KEYBOARD' }
  | { type: 'KEYBOARD.CHARACTER_INPUT'; keys: KeyCapId[] }
  | { type: 'KEYBOARD.NAVIGATION_KEY'; key: KeyCapId };

export const appMachine = setup({
  types: {
    context: {} as AppContext,
    events: {} as AppEvent,
  },
  actors: {
    keyboardService: keyboardMachine,
    trainingService: trainingMachine,
  },
  actions: {
    // Единственное место, где рождается новый TypingStream. Используется
    // во всех трёх точках старта/рестарта тренировки.
    startNewTrainingStream: assign((_, params: { symbolLayoutId: SymbolLayoutId }) => {
      const symbolLayout = getSymbolLayout(params.symbolLayoutId);
      const randomIndex = Math.floor(Math.random() * defaultDrillTexts.length);
      const drillText = defaultDrillTexts[randomIndex]!;
      return {
        lastTrainingStream: generateTypingStream(drillText, symbolLayout),
        currentSymbolLayoutId: params.symbolLayoutId,
      };
    }),
    storeCompletedStream: assign((_, params: { stream: TypingStream }) => ({
      lastTrainingStream: params.stream,
    })),
  },
  guards: {
    isEscape: ({ event }) =>
      event.type === 'KEYBOARD.NAVIGATION_KEY' && event.key === 'Escape',
    isEnter: ({ event }) =>
      event.type === 'KEYBOARD.NAVIGATION_KEY' && event.key === 'Enter',
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QEMAOqDEBpAogTQH0ARAeQHUA5AbQAYBdRUVAe1gEsAXN5gO0ZAAeiAIwAmABzCAdAE454mTQBsAFgCs6mcIA0IAJ6IAzKLVSlWyQHZDl8ROEaAvo91pMuQgFUACrQZIQFnYuXn4hBGEVGUMpUUs1Y0NxGkt4pV0DBGNTc2ErGztJJxcQN2x8ACESAEEAJSIpWpwAYRIAcQoASQAtHCI-fiDObj4A8JlLUTMJURVDKKVLB3EMoxMzCxsVUUMxNSVnV3QpNh5h5AAbNgAvU6gMAYChkNHQcOFhJRopcXm1cSU8wmilEqwQSkiZiUEMMMm2hl2cMOpWOAFswDwAK4YADKABU6niCHjatVOl0KG1HkxWMNQmMRB8YkoEvsomphHComDLCypIY1CkNALUh9kW4pOisRg8SQCDicHi8eS2jjqYFaS8wiJRF8pDQLLNVIkVGClHF+RoZKIZL9fmpLDJxWiMdjZQRqgAZT3ygl49XPEbahC2mSyGiGQFzOYGmim-SIc2WS1RG12gXiZ2oKQcABOyFOdxlpPJKqkrQAst5PYqcAHNUGGRFhDRvjDRLqlhIwS25lJLFEZPtjNtLHGszn84WePdvNVPAr68FG28RAjpJI8lHkkpxBowXCw7aW6kFLsbQcShLYGAOFwZ7AZXKKzgKJ4l3TXoIRNGpA6VMISyckm6QJuC8RSJEvIaBGNDiNsmZXsceYFmcM7NMwqKoBct5gE+BAvm+H5ak24hLP2rYdjs5jWBMPYONIEwAeIkg0Hke6Xkc2YodOUAYVhOEcHh+KEsSJYUlS9CDA29KriGKhKLECQKDR1p2KCYG-NIUQfOaogfJEdgTqgyCYje+GEe+UlPDJX7vL+-6fHuEjRJGPJ8gKKTJNEcKRqIxmmeZIm1ESJJkhJxErt+EQ2jEnxxAkvLmg4ahglpUg6fF+kfCovwBWZeFNDingvpFsnRcI2SxGm8xjo6sJpdaGWIh8sxzNanEotxU5oVAOIcMguYcA81k0su5XvJ83w0LMEa7n5cxpfB-KqCxSQSOaLETpcFz9cgw3upZZV2YgZHSGOM0mBGY52DoYGLKYUEsiosHwRIzglDwzAQHA-BuNJ40nQgdgxBdVGRhMsKWGCcxTLs8ORgsyhkROhZcJcNx3ADn7Bjl0hfK5bF5HExhgvsikKRovKwSYswTlKmLYyRckfP8sSGHGyxsRyQ48nBGVqDIEIttCdhRBOPG9UzUWTbqPxyHGAp+QaqVgXCcN5PMkgdYLE43nedzwDZgO4yo2z9ooCKw8kcaq5kSb6h2Q5DvpcEOBLPV3Px2G4dLE2MnksgvXBygthYd2ZKz+PbHkM1m2I8z5TeftA5ECRmGoF6CmIocHlEZhRHG0KwkOkQe6hdx7UNKe45VilxlyuQOi7aW7JBguVQa0LbA620XLtA0cDXpF2JaqRpI66gmGaFqXQoe7RICCQfY4QA */
  id: 'app',
  initial: 'initializing',
  invoke: {
    id: 'keyboardService',
    src: 'keyboardService',
    input: ({ self }) => ({
      parentActor: self,
      physicalLayout: physicalLayoutANSI,
    }),
  },
  context: {
    lastTrainingStream: null,
    currentSymbolLayoutId: 'qwerty',
  },
  on: {
    KEY_DOWN: {
      actions: sendTo('keyboardService', ({ event }) => ({
        type: 'KEY_DOWN',
        keyCapId: event.keyCapId,
      })),
    },
    KEY_UP: {
      actions: sendTo('keyboardService', ({ event }) => ({
        type: 'KEY_UP',
        keyCapId: event.keyCapId,
      })),
    },
    RESET_KEYBOARD: {
      actions: sendTo('keyboardService', { type: 'RESET' }),
    },
    'KEYBOARD.CHARACTER_INPUT': {
      actions: sendTo('trainingService', ({ event }) => ({
        type: 'KEY_PRESS',
        keys: event.keys,
      })),
    },
    'TRAINING.COMPLETE': {
      actions: {
        type: 'storeCompletedStream',
        params: ({ event }) => ({ stream: event.stream }),
      },
    },
  },
  states: {
    initializing: {
      always: 'menu',
    },

    menu: {
      on: {
        START_TRAINING: {
          target: 'trainingStart',
          reenter: true,
          actions: {
            type: 'startNewTrainingStream',
            params: ({ event }) => ({ symbolLayoutId: event.symbolLayoutId }),
          },
        },
        TO_SETTINGS: 'settings',
        TO_ALL_STAT: 'allStat',
      },
    },

    training: {
      initial: 'running',
      invoke: {
        id: 'trainingService',
        src: 'trainingService',
        input: ({ context, self }) => ({
          stream: context.lastTrainingStream!,
          symbolLayoutId: context.currentSymbolLayoutId,
          parentActor: self,
        }),
      },
      on: {
        'TRAINING.COMPLETE': {
          target: 'trainingComplete',
          actions: {
            type: 'storeCompletedStream',
            params: ({ event }) => ({ stream: event.stream }),
          },
        },
      },
      states: {
        running: {
          on: {
            PAUSE: 'paused',
            'KEYBOARD.NAVIGATION_KEY': {
              guard: 'isEscape',
              target: 'paused',
            },
          },
        },
        paused: {
          entry: sendTo('keyboardService', { type: 'RESET' }),
          on: {
            RESUME: 'running',
            TO_MENU: '#app.menu',
            'KEYBOARD.NAVIGATION_KEY': [
              { guard: 'isEscape', target: '#app.menu' },
              { guard: 'isEnter', target: 'running' },
            ],
          },
        },
      },
    },

    settings: {
      on: { TO_MENU: 'menu' },
    },

    trainingComplete: {
      on: {
        TO_MENU: { target: 'menu', reenter: true },
        START_TRAINING: {
          target: 'trainingStart',
          reenter: true,
          actions: {
            type: 'startNewTrainingStream',
            params: ({ event }) => ({ symbolLayoutId: event.symbolLayoutId }),
          },
        },
        'KEYBOARD.NAVIGATION_KEY': {
          guard: 'isEnter',
          target: 'trainingStart',
          actions: {
            type: 'startNewTrainingStream',
            params: ({ context }) => ({ symbolLayoutId: context.currentSymbolLayoutId }),
          },
        },
      },
    },

    trainingStart: {
      always: 'training',
    },

    allStat: {
      on: { TO_MENU: 'menu' },
    },
  },
});
