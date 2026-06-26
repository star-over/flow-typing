import { api, convex } from '@/lib/convex';
import type { FunctionReturnType } from 'convex/server';
import type { AuthStore } from '@/lib/auth/auth-store.svelte';
import type { SymbolLayoutId } from '@/interfaces/types';

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
  let detail = $state<ProgressionDetail>(null);

  $effect(() => {
    if (authStore.state.status !== 'authenticated') {
      detail = null;
      return;
    }
    const unsubscribe = convex.onUpdate(
      api.drill.progressionDetail,
      { symbolLayoutId: symbolLayoutId() },
      (result) => {
        detail = result;
      },
    );
    return () => unsubscribe();
  });

  return {
    get detail() {
      return detail;
    },
  };
}

export type ProgressionStore = ReturnType<typeof createProgressionStore>;
