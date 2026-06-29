/**
 * @file Dev-only: сброс профиля текущего юзера из консоли браузера.
 *
 * Выставляет `window.__resetProfile()` → `convex.mutation(api.drill.resetMyProfile)`.
 * Вызов под авторизованным юзером стирает все его `skillProfiles` (по всем
 * раскладкам) → следующая сессия стартует с cold-start. Нужен для проверки
 * алгоритма роста с чистого листа.
 *
 * Вызывать ТОЛЬКО из браузера авторизованным: mutation использует `getAuthUserId`,
 * поэтому CLI (`npx convex run`) / dashboard не сработают (нет auth → 0 удалено).
 * В прод-сборку не входит (динамический импорт под `import.meta.env.DEV`).
 */
import { convex, api } from '@/lib/convex';

type ResetProfileConsoleApi = () => Promise<number>;

let attached = false;

/** Привязывает `window.__resetProfile`. Идемпотентно. */
export function attachProfileReset(): void {
  if (attached) return;
  attached = true;

  (window as unknown as { __resetProfile: ResetProfileConsoleApi }).__resetProfile = () =>
    convex.mutation(api.drill.resetMyProfile, {}).then((deleted) => {
      console.info(
        `[profile-reset] профиль сброшен (удалено: ${deleted}). ` +
          'Начните новую сессию — выдача пойдёт с cold-start (ступень 1).',
      );
      return deleted;
    });

  console.info('[profile-reset] активен. window.__resetProfile() — сбросить профиль текущего юзера.');
}
