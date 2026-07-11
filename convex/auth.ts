import GitHub from '@auth/core/providers/github';
import Google from '@auth/core/providers/google';
import Yandex from '@auth/core/providers/yandex';
import { Password } from '@convex-dev/auth/providers/Password';
import { convexAuth } from '@convex-dev/auth/server';
import type { Id } from './_generated/dataModel';
import type { MutationCtx } from './_generated/server';
import { isProduction } from './lib/env';

// Узкий, тестируемый helper. Получает только то, что нам реально нужно
// из callback'а Convex Auth. Lib-обёртка (ниже, в convexAuth(...)) передаёт
// сюда нужные поля, остальные игнорирует.
export async function createOrUpdateUserHandler({
  ctx,
  existingUserId,
  profile,
}: {
  ctx: MutationCtx;
  existingUserId: Id<'users'> | null;
  profile: { email?: string; name?: unknown; image?: unknown };
}): Promise<Id<'users'>> {
  // Правило «провайдер = аккаунт»: если auth-flow уже опознал юзера через
  // существующий accounts-record — возвращаем его. Иначе всегда создаём
  // нового — никакого поиска/линка по email.
  if (existingUserId) {
    return existingUserId;
  }
  // authTables.users: все поля v.optional(v.string()) — поэтому undefined OK.
  return ctx.db.insert('users', {
    email: profile.email,
    name: typeof profile.name === 'string' ? profile.name : undefined,
    image: typeof profile.image === 'string' ? profile.image : undefined,
  });
}

/**
 * Список auth-провайдеров. Password — инструментальный dev-вход для ИИ-агентов
 * и E2E (ADR 0012): регистрируется ТОЛЬКО на не-production деплое. Единственный
 * гейт — fail-closed `isProduction()` (ADR 0023): без явного `DEPLOY_ENV=development`
 * деплой трактуется как prod → Password не поднимается. Один флаг — единообразно с
 * dev-мутациями (`assertNonProd`); второй предохранитель `AUTH_DEV_LOGIN_ENABLED`
 * снят в ADR 0024 (разбор — там). Не продуктовый режим.
 */
export function buildProviders({ production }: { production: boolean }) {
  const oauth = [GitHub, Google, Yandex];
  return production ? oauth : [...oauth, Password];
}

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: buildProviders({ production: isProduction() }),
  callbacks: {
    // Передаём в helper только нужные поля, чтобы изолировать тесты от
    // полного callback args shape (`type`, `provider`, `shouldLink` и т.д. — не используем).
    createOrUpdateUser: (ctx, { existingUserId, profile }) =>
      createOrUpdateUserHandler({ ctx, existingUserId, profile }),
  },
});
