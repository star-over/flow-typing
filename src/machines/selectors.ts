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

/**
 * Достать поля таймера из снимка sessionMachine.
 *
 * Единственное место, которое знает имена полей контекста session-машины
 * (`displayElapsedMs`, `durationSeconds`). Таймер тикает ВНУТРИ session-актора
 * и в снимок appActor намеренно не всплывает — UI подписывается на session-
 * актора напрямую (см. `+layout.svelte:97`). Тотальный: снимок у вызывающего
 * есть всегда, отсутствие самого актора компонент гасит отдельно.
 */
export function selectSessionTimer(
  sessionSnapshot: SnapshotFrom<typeof sessionMachine>
): { displayElapsedMs: number; durationSeconds: number } {
  return {
    displayElapsedMs: sessionSnapshot.context.displayElapsedMs,
    durationSeconds: sessionSnapshot.context.durationSeconds,
  };
}
