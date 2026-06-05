import type { AnyMachineSnapshot, StateValue } from 'xstate';

/**
 * Untyped wrapper над `snapshot.matches()`.
 *
 * Why: XState v5 после `setup()` строго типизирует `matches()` и сужает
 * тип `state.value` после каждого вызова в цепочке `if/else if`. В UI-
 * роутерах (MainContent.svelte, App.svelte) экраны exhaustive по дизайну —
 * narrowing к концу цепочки делает оставшиеся ветки `never` и ломает тип-
 * чек, не давая ничего ценного взамен.
 */
export const inState = ({
  snapshot,
  value,
}: {
  snapshot: AnyMachineSnapshot;
  value: StateValue;
}): boolean => (snapshot.matches as (v: StateValue) => boolean)(value);
