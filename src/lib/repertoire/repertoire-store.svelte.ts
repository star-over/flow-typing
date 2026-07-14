import { api, convex } from '@/lib/convex';
import type { FunctionReturnType } from 'convex/server';
import type { AuthStore } from '@/lib/auth/auth-store.svelte';
import type { SymbolLayoutId } from '@/interfaces/types';
import { createAuthGatedQuery } from '@/lib/gated-query.svelte';

// Тип снимка берём из Convex-вывода функции (= RepertoireProgress | null),
// БЕЗ импорта из shared/ — у src нет прецедента импорта shared, а Convex codegen
// уже даёт нам этот тип через api. Экспортируем для UI-компонента.
export type RepertoireSnapshot = FunctionReturnType<typeof api.drill.repertoireSnapshot>;

/** Чистый предикат «openedSteps выросли с отметки старта сессии». */
export function didOpenedStepsGrow({
  startOpenedSteps,
  currentOpenedSteps,
}: {
  startOpenedSteps: number | null;
  currentOpenedSteps: number | null;
}): boolean {
  if (startOpenedSteps === null || currentOpenedSteps === null) return false;
  return currentOpenedSteps > startOpenedSteps;
}

/**
 * Reactive store снимка прогресса репертуара. Вызывать в +layout (svelte-context),
 * после auth. Подписка живёт весь сеанс (паттерн auth-store); markSessionStart
 * фиксирует openedSteps на входе в тренировку — для показа перехода в sessionComplete.
 */
export function createRepertoireStore({
  authStore,
  symbolLayoutId,
}: {
  authStore: AuthStore;
  symbolLayoutId: () => SymbolLayoutId;
}) {
  const query = createAuthGatedQuery<RepertoireSnapshot>({
    authStore,
    unauthValue: null,
    subscribe: (onResult) =>
      convex.onUpdate(api.drill.repertoireSnapshot, { symbolLayoutId: symbolLayoutId() }, onResult),
  });
  let startOpenedSteps = $state<number | null>(null);

  return {
    get snapshot() {
      return query.value;
    },
    get grew() {
      return didOpenedStepsGrow({
        startOpenedSteps,
        currentOpenedSteps: query.value?.openedSteps ?? null,
      });
    },
    markSessionStart() {
      startOpenedSteps = query.value?.openedSteps ?? null;
    },
  };
}

export type RepertoireStore = ReturnType<typeof createRepertoireStore>;
