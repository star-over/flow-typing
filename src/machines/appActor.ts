import '@/lib/integrity'; // side-effect: ApplicationDataSchema.parse на старте
import { createActor } from 'xstate';
import { appMachine } from './app.machine';

// Singleton actor at module scope: created once when the module loads.
// Under Vite HMR an edit to this file (or app.machine) re-evaluates the
// module, which would spawn a second actor on top of the first ("double
// actor" bug, visible as duplicated events). invalidate() opts this
// module out of HMR — Vite does a full page reload instead. Training
// state is lost on each reload (by design, no snapshot restore yet).
const actor = createActor(appMachine);
actor.start();
export const appActor = actor;

if (import.meta.hot) {
  import.meta.hot.invalidate('appActor is a module-scope singleton — full reload required');
}
