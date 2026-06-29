import { api, convex } from '@/lib/convex';
import type { FunctionReturnType } from 'convex/server';
import type { AuthStore } from '@/lib/auth/auth-store.svelte';
import type { SymbolLayoutId } from '@/interfaces/types';
import { createAuthGatedQuery } from '@/lib/auth-gated-query.svelte';

// Тип снимка берём из Convex-вывода функции (= RepertoireProgress | null),
// БЕЗ импорта из shared/ — у src нет прецедента импорта shared, а Convex codegen
// уже даёт нам этот тип через api. Экспортируем для UI-компонента.
export type RepertoireSnapshot = FunctionReturnType<typeof api.drill.repertoireSnapshot>;

/** Чистый предикат «ступень выросла с отметки старта сессии». */
export function didStepGrow({
  startStep,
  currentStep,
}: {
  startStep: number | null;
  currentStep: number | null;
}): boolean {
  if (startStep === null || currentStep === null) return false;
  return currentStep > startStep;
}

/**
 * Reactive store снимка прогресса репертуара. Вызывать в +layout (svelte-context),
 * после auth. Подписка живёт весь сеанс (паттерн auth-store); markSessionStart
 * фиксирует ступень на входе в тренировку — для показа перехода в sessionComplete.
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
  let startStep = $state<number | null>(null);

  return {
    get snapshot() {
      return query.value;
    },
    get grew() {
      return didStepGrow({ startStep, currentStep: query.value?.openedSteps ?? null });
    },
    markSessionStart() {
      startStep = query.value?.openedSteps ?? null;
    },
  };
}

export type RepertoireStore = ReturnType<typeof createRepertoireStore>;
