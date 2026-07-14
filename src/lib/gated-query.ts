import type { AuthState } from './auth/auth.types';

/**
 * Подписка на источник реактивных значений: принимает функцию результата, возвращает
 * отписку. Абстрагирует `convex.onUpdate(query, args, cb)` — ядро шва не знает про Convex.
 */
export type ReactiveSubscribe<Result> = (onResult: (result: Result) => void) => () => void;

/**
 * Чистое ядро «auth-gated реактивного значения» — единственный дом инварианта,
 * который раньше был скопирован по трём cloud-сторам чтения (sessions / repertoire /
 * progression): пока статус не `authenticated` (гость ИЛИ ещё loading) — сбрасываем
 * значение на гостевое и НЕ подписываемся; при `authenticated` — подписываемся и
 * возвращаем отписку (её рунная обёртка отдаёт как cleanup `$effect`). Без runes —
 * тестируется в node, как `computeAuthState` (см. `auth-state.ts`).
 *
 * Пере-подписка при смене аргументов запроса — забота обёртки: `subscribe` читает
 * реактивные аргументы, `$effect` пере-вызывает `runAuthGate` при их изменении.
 */
export function runAuthGate<Result>({
  status,
  unauthValue,
  subscribe,
  setValue,
}: {
  status: AuthState['status'];
  unauthValue: Result;
  subscribe: ReactiveSubscribe<Result>;
  setValue: (value: Result) => void;
}): (() => void) | undefined {
  if (status !== 'authenticated') {
    setValue(unauthValue);
    return undefined;
  }
  return subscribe(setValue);
}
