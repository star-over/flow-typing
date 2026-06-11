import { useAuth } from '@mmailaender/convex-auth-svelte/svelte';
import { api, convex } from '@/lib/convex';
import { computeAuthState } from './auth-state';
import type { User } from './auth.types';

/**
 * Reactive auth-store. Вызывать строго внутри `+layout.svelte` (или другого svelte-context'а),
 * после `setupConvexAuth`. Возвращает объект с reactive getter'ом state + bound методами signIn/signOut.
 */
export function createAuthStore() {
  const auth = useAuth();
  let viewer = $state<User | null>(null);

  $effect(() => {
    // Re-subscribe при transition isAuthenticated и при rotation token'а.
    // setAuth re-wiring живёт в +layout.svelte (workaround wrapper-bug); здесь
    // только зависим от token'а чтобы наша подписка тоже знала про обновление.
    if (!auth.isAuthenticated || !auth.token) {
      viewer = null;
      return;
    }
    const unsubscribe = convex.onUpdate(api.users.viewer, {}, (result) => {
      viewer = result;
    });
    return () => unsubscribe();
  });

  const state = $derived(
    computeAuthState({
      isLoading: auth.isLoading,
      isAuthenticated: auth.isAuthenticated,
      viewer,
    }),
  );

  return {
    get state() {
      return state;
    },
    signIn: (provider: string) => auth.signIn(provider),
    signOut: () => auth.signOut(),
  };
}
