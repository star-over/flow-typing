import type { Actor, SnapshotFrom } from 'xstate';
import type { appMachine } from './app.machine';
import type { sessionMachine } from './session.machine';
import type { trainingMachine } from './training.machine';

/**
 * Достать активного session-актора из снимка appMachine.
 *
 * Знание о строковом invoke-id (`sessionService`) и необходимый типовой
 * приведение (`as`) спрятаны здесь; UI больше не лезет во внутренний реестр
 * детей XState. См. ADR 0007 (иерархия трёх машин).
 */
export function selectSessionActor(
  appSnapshot: SnapshotFrom<typeof appMachine>
): Actor<typeof sessionMachine> | undefined {
  // XState-generics у `children` не совпадают с конкретным provided-актором,
  // поэтому приведение нужно; см. app.machine.test.ts.
  return appSnapshot.children.sessionService as Actor<typeof sessionMachine> | undefined;
}

/**
 * Достать активного training-актора из снимка sessionMachine.
 *
 * Аналогично `selectSessionActor`: единственное место, где знают про
 * invoke-id `training` и каст к `Actor<typeof trainingMachine>`.
 */
export function selectTrainingActor(
  sessionSnapshot: SnapshotFrom<typeof sessionMachine>
): Actor<typeof trainingMachine> | undefined {
  return sessionSnapshot.children.training as Actor<typeof trainingMachine> | undefined;
}
