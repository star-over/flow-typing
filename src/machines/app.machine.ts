import { createMachine } from 'xstate';
import { trainingMachine } from './training.machine';
import { generateLesson } from '@/lib/lesson-generator';

// Mock context for the app machine
interface AppContext {
  user: { name: string } | null;
  settings: {
    theme: 'dark' | 'light';
  };
}

// Events for the app machine
type AppEvent =
  | { type: 'START_TRAINING' }
  | { type: 'QUIT_TRAINING' }
  | { type: 'GO_TO_SETTINGS' }
  | { type: 'VIEW_STATS' } // Added event
  | { type: 'BACK_TO_MENU' };


export const appMachine = createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QEMAOqB0BLAdlgLlsgDZYBeuUAxANoAMAuoqKgPawFas7MgAeiAJwBmQRkEAOAIwB2AKxy6AFhkA2eTIA0IAJ6IJAJgyqFciYLqqJwmUuFyAvg+1pMWCMTBUAygBUAggBKvgD6voH+AJIAcjEA4vRMSCBsHITcvAIIgkpKGEqqdBLW6jJ0NkraeggywnQYZdYGEnKCCqpKUk4u6NgeXnEA8mHD3gCivr7x3om8qZwZyVkiYpKyCspqGlWIwgb10gaKwqJydVKOziCufZ5UAGqRYwDqIX7+vjOMc+wLPEuIKQGToYYqCAxtKSqfYdSq6RCdPLFKQ5PaCC6CdHda69fAAJ2QuEoVAg3DA2BwADdWABrcn4wl4HBQbxgPGUrAAYzAs2S83S-1AWQMNgwdCkdWESgk8nsbR2CCUmIwwIKEgK8jaqhE2JuDKJzKobLxrDxGFQxGQ+AAZqaALYYfVMllsjnc3ksX4CzKIVSyFWFJQQqy1JRFBV+oyCDooqTq4QSSyXHqYJ3EgCKAFVIqFwlFYtEEt8+V6uIL+L7-QZA8GZVLw-DFeixYoZIm5NDxYZdb1YGB8IRmbAqAAhfwAYQA0iMQgBZMbRTMelKlxZCoSicTSeSKFTqORaRs2eqqBN0AwXSy5VoyHuYWD4K3DsdTmfzxfL-lln0IIEgsEQnIUIwrkCrCCYLYdEccbKHIBTJjiqYEgaUDjqwdoWv2XjvMEYQRDE8Sfqu5bCqK4qStKsqtHICpwaoYpWOY1hSqo2rCHejrIc6aEYZ4+BeC+06+MM75LsWnppN+AIICKMhihK5SUWc1EKvs9SiIIagXOBSrdlcNzGqao4TkJIkLmJSQSX8P4rFu6y7lsB4RlIUj5KeZzRusFhKE4Vw4KwEBwLwrg-JJa4VggAC0qgKpFcjiJiiVJUl7H6b0RKECQ5CUKF1nSYcGBAuBOQmAYZUqAq0gYHsEJHHYIgeQhNzuJ4uXetJLlnCqdRBnUMgWOYYFlKCdCtOiZhhrk4EcWmzJtVJ66KgmKpSHQkh0PILSQgqSrqdYbanLkZU2BxfYDpQ8AlmFJH6BeDSSGpZXnqUYHVhgHYwuBRzaheqUphgD5PvN4VZFIQZ5CiogyEC+yQ0NwjVaN60uW0whxjNXGUDxmH8cDN2KgYqkufkYareUG0iF2HGGXieM-tYrl1OKcZnFYIhSM5rmnpe0aQsUEi+Q4QA */
  id: 'app',
  initial: 'initializing',
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
        START_TRAINING: 'training',
        BACK_TO_MENU: 'idle',
      },
    },
    error: {
      // From error state, we can allow going back to the menu
      on: {
        BACK_TO_MENU: 'idle',
      },
    },
  },
});
