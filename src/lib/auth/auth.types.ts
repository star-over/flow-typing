import type { Doc } from '../../../convex/_generated/dataModel';

export type User = Doc<'users'>;

export type AuthState =
  | { status: 'loading' }
  | { status: 'authenticated'; user: User }
  | { status: 'guest' };

/**
 * Identifier OAuth-провайдера, поддерживаемого FlowTyping.
 *
 * Используется компонентами `auth/`-папки (`SignInScreen.svelte` и т.д.)
 * для типизации `auth.signIn(provider)` вызова. `authStore.signIn` принимает
 * любой `string` (см. `@mmailaender/convex-auth-svelte` wrapper) — наш
 * subset нужен, чтобы UI явно перечислял, какие провайдеры реально поддержаны.
 */
export type OAuthProviderId = 'github' | 'google' | 'yandex';
