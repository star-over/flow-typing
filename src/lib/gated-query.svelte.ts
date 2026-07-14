import type { AuthStore } from './auth/auth-store.svelte';
import { runAuthGate, type ReactiveSubscribe } from './gated-query';

/**
 * Reactive значение, питаемое cloud-подпиской и закрытое auth-проверкой: гость и loading
 * видят `unauthValue`, `authenticated` — живой результат `subscribe`. Один глубокий шов
 * «auth-gated reactive Convex query» для всех cloud-сторов чтения; стор поверх него
 * становится тонким (шов + только его доменное состояние).
 *
 * Пере-подписка при смене реактивных аргументов происходит сама: `subscribe` читает их
 * (напр. `symbolLayoutId()`) внутри `$effect`, поэтому изменение аргумента перезапускает
 * эффект → cleanup (отписка) + новая подписка. Инвариант gate/reset/cleanup живёт в
 * чистом `runAuthGate`; здесь — только runes-привязка реактивных чтений к нему.
 *
 * Вызывать строго в svelte-context (компонент/layout) — внутри `$effect`.
 */
export function createAuthGatedQuery<Result>({
  authStore,
  unauthValue,
  subscribe,
}: {
  authStore: AuthStore;
  unauthValue: Result;
  subscribe: ReactiveSubscribe<Result>;
}): { readonly value: Result } {
  let value = $state<Result>(unauthValue);

  $effect(() =>
    runAuthGate({
      status: authStore.state.status,
      unauthValue,
      subscribe,
      setValue: (next) => {
        value = next;
      },
    }),
  );

  return {
    get value() {
      return value;
    },
  };
}
