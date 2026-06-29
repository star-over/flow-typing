import { api, convex } from '@/lib/convex';
import type { FunctionReturnType } from 'convex/server';
import type { AuthStore } from '@/lib/auth/auth-store.svelte';
import type { SymbolLayoutId } from '@/interfaces/types';
import { createAuthGatedQuery } from '@/lib/auth-gated-query.svelte';

// Per-symbol разбор готовности текущего шага (= ProgressionDetail | null).
// Тип берём из Convex-вывода функции, без импорта из shared/ (паттерн repertoire-store).
export type ProgressionDetail = FunctionReturnType<typeof api.drill.progressionDetail>;

/**
 * Reactive store детального прогресса ступени для /stats. В отличие от
 * repertoire-store (живёт весь сеанс в layout), этот создаётся в самой странице
 * /stats — подписка живёт, пока страница смонтирована (`$effect` владеет ею).
 */
export function createProgressionStore({
  authStore,
  symbolLayoutId,
}: {
  authStore: AuthStore;
  symbolLayoutId: () => SymbolLayoutId;
}) {
  const query = createAuthGatedQuery<ProgressionDetail>({
    authStore,
    unauthValue: null,
    subscribe: (onResult) =>
      convex.onUpdate(api.drill.progressionDetail, { symbolLayoutId: symbolLayoutId() }, onResult),
  });

  return {
    get detail() {
      return query.value;
    },
  };
}

export type ProgressionStore = ReturnType<typeof createProgressionStore>;
