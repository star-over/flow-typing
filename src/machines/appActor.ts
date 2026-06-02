import { createActor } from 'xstate';
import { appMachine } from './app.machine';

// NOTE: This executes on module import. During Vite HMR the module
// may reload. `decline()` forces a full page reload instead of HMR
// for this module, which prevents "double actor" bugs but still
// loses training state. To survive HMR with state, you'd need
// snapshot restore from localStorage (out of scope for this migration).
const actor = createActor(appMachine);
actor.start();
export const appActor = actor;

if (import.meta.hot) {
  // @ts-expect-error - decline() is a valid Vite HMR method not yet in type definitions
  import.meta.hot.decline();
}
