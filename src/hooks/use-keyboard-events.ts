import { useEffect } from 'react';
import { type StateFrom } from 'xstate';
import { type AppEvent, type appMachine } from '@/machines/app.machine';
import { KeyCapId } from '@/interfaces/key-cap-id';

type Send = (event: AppEvent) => void;

/**
 * A custom hook that sets up global keyboard event listeners (keydown and keyup)
 * and sends the corresponding events to the provided XState machine actor.
 *
 * @param state The current state of the appMachine. The hook uses this to
 * conditionally prevent default browser actions (e.g., for the spacebar).
 * @param send The send function from the useMachine hook to send events to the machine.
 */
export function useKeyboardEvents(
  state: StateFrom<typeof appMachine>,
  send: Send,
) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Prevent default browser actions for certain keys during training
      if (state.matches('training') && event.code === 'Space') {
        event.preventDefault();
      }
      const appEvent: AppEvent = { type: 'KEY_DOWN', keyCapId: event.code as KeyCapId };
      send(appEvent);
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const appEvent: AppEvent = { type: 'KEY_UP', keyCapId: event.code as KeyCapId };
      send(appEvent);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [send, state]);
}
