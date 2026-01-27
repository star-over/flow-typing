import { assign, createMachine, sendTo } from "xstate";

import { KeyCapId } from "@/interfaces/key-cap-id";

import { keyboardMachine } from "./keyboard.machine";
import { trainingMachine } from "./training.machine";
import { UserPreferences } from "@/interfaces/user-preferences";
import { TypingStream } from "@/interfaces/types";

// Local types for appMachine
export interface AppContext {
  user: { name: string } | null;
  settings: {
    theme: 'dark' | 'light';
  };
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
  /** @xstate-layout N4IgpgJg5mDOIC5QEMAOqDEBpAogTQH0ARAeQHUA5AbQAYBdRUVAe1gEsAXN5gO0ZAAeiAIwAmABzCAdAE454mTQBsAFgCs6mcIA0IAJ6IAzKLVSlWyQHZDl8ROEaAvo91pMuQgFUACrQZIQFnYuXn4hBGEVGUMpUUs1Y0NxGkt4pV0DBGNTc2ErGztJJxcQN2x8ACESAEEAJSIpWpwAYRIAcQoASQAtHCI-fiDObj4A8JlLUTMJURVDKKVLB3EMoxMzCxsVUUMxNSVnV3QpNh5h5AAbNgAvU6gMAYChkNHQcOFhJRopcXm1cSU8wmilEqwQSkiZiUEMMMm2hl2cMOpWOAFswDwAK4YADKABU6niCHjatVOl0KG1HkxWMNQmMRB8YkoEvsomphHComDLCypIY1CkNALUh9kW4pOisRg8SQCDicHi8eS2jjqYFaS8wiJRF8pDQLLNVIkVGClHF+RoZKIZL9fmpLDJxccOAAnZCnO4YCC8MAnHgAN2YAGs-W6PWceFAcWBXQG2ABjMDq54jbURD7fOwqX6LGRqB1g4Q0OZmNQ7Gj-OYc6zO1BSWBgDhcKOwGVygCyOAonhTmrTDIicxUUgdKmES055t5ZviUkivI0NEMNHE23Edak4c9UeazFRqAuTbAuIJtSJJLJFKp9EG-fpb0QcKUsQSCnMjpmoP0iF+0iiHzmqIHyRHYm7bpGUB7geR4cCesoEF2PZ9sEA6Pgg4hLFIlg0DQoj4YYH6wpYRYONIEzjuIkg0Hk4j7OB7o7vc3jVJ4CooXSryCCICLSJIeSAjmyh0aaP4IHCMiyNRqQKLsNoHCUEqoMgmKNhgTQ4p4XYcVqg7CNksQ2r8Kg4Y6sJggoUxzJyHyzHM1oKUc9bKap8Gdt2va3k895ce8w6jpY45KHREjRIRPJ8gKKTJNEcKEaIDERncOIcMgrocA8Xk0qhD7cRmep4Soy7BfFcwWWu-KqFRSQSOaVGbi5an4oSxKkuSKo6WheViNE87TgkvLmg4agWbsUgAZ8+EgTmhiblK2IIdUAAyS3ygSeKdbl4wKLIxXzPtBolmaFoClERlJAKG6KcclwXClyAZQhSGef42WcemmHSDheEmMuOF2DoYmLKYC4skVK5rhIzglDwzAQHA-BuHeOW+b+OzYbh+E7ERExgnMUy7IThELCkm6elwlw3HcyPvXpkTSF8YU0XkcTGGC+wvioYO8sueHlioc0YpiNO6ehHz-LEK7jv8NEcvmPKruNagyBCxbQtmTrXfWEHU95KPprZL4KIo1bxQaI1iXCBN5PMkgOcrm6Ns2dzwHrtNiyo2zYYoCL48kJYW5k076vh+b5sBq4OIlTHQYex4i117wfOIshFauyjFhYgOZOLDPbHkhXjjsAta1IjVgAnW0iOozLlirgpiBnYISWYUQltCsL5pE0eQfd6WV6jGaEfqUSe7kDrh6N0gOFoK4q6oJiWJut33RwA8fXYlqpGkjrqCYx2WCHoV0dEgIJNDjhAA */
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
          reenter: true
        },

        TO_SETTINGS: 'settings',
        TO_ALL_STAT: "allStat"
      },
    },

    training: {
      invoke: {
        id: 'trainingService',
        src: trainingMachine,

        input: ({ event, self }) => {
          if (event.type !== 'START_TRAINING') return { keyboardLayout: 'qwerty', parentActor: self };
          return { keyboardLayout: event.keyboardLayout, parentActor: self };
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
          reenter: true
        }
      },
    },

    pause: {
      on: {
        TO_MENU: "menu",
        START_TRAINING: "trainingStart",
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
