import { api, convex } from '@/lib/convex';
import type { AuthStore } from '@/lib/auth/auth-store.svelte';
import { createAuthGatedQuery } from '@/lib/gated-query.svelte';

/**
 * Reactive флаг «юзер уже видел micro-survey» (наличие строки surveyResponses).
 * Гость → false. Создаётся в +layout после auth (паттерн sessions-store).
 */
export function createSurveyStore({ authStore }: { authStore: AuthStore }) {
  const query = createAuthGatedQuery<boolean>({
    authStore,
    unauthValue: false,
    subscribe: (onResult) => convex.onUpdate(api.surveys.hasResponded, {}, onResult),
  });
  return {
    get hasResponded() {
      return query.value;
    },
  };
}

export type SurveyStore = ReturnType<typeof createSurveyStore>;
