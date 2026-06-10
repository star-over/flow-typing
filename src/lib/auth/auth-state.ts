import type { AuthState, User } from './auth.types';

/**
 * Pure state-derivation helper. Никаких runes, никаких Convex/wrapper-импортов —
 * чтобы тесты не тащили транзитивную цепочку до ConvexClient (которому нужен
 * WebSocket runtime недоступный в node test env).
 */
export function computeAuthState({
  isLoading,
  isAuthenticated,
  viewer,
}: {
  isLoading: boolean;
  isAuthenticated: boolean;
  viewer: User | null;
}): AuthState {
  if (isLoading) return { status: 'loading' };
  if (!isAuthenticated) return { status: 'guest' };
  // isAuthenticated, но viewer ещё не подтянулся — держим loading, не показываем «гостя» залогиненному
  if (viewer === null) return { status: 'loading' };
  return { status: 'authenticated', user: viewer };
}
