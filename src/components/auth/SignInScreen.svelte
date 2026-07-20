<script lang="ts">
  import { getContext } from 'svelte';
  import { dictionary } from '@/lib/i18n';
  import type { AuthStore } from '@/lib/auth/auth-store.svelte';
  import type { OAuthProviderId } from '@/lib/auth/auth.types';

  const auth = getContext<AuthStore>('auth');
  let error: string | null = $state(null);
  let signingIn: boolean = $state(false);

  async function handleSignIn(provider: OAuthProviderId) {
    error = null;
    signingIn = true;
    try {
      await auth.signIn(provider);
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      // Reset even on success path: для OAuth providers с popup-flow (Google)
      // promise resolves без redirect'а — без finally кнопка зависнет в "Перенаправление…".
      // Для GitHub redirect-flow это безопасный no-op (страница уже размонтирована).
      signingIn = false;
    }
  }

  // Dev-вход (ADR 0012; механизм — ADR 0024): кнопка существует только в
  // dev-сборке. `import.meta.env.DEV` — встроенный признак Vite: true под
  // `vite dev` (make dev), false в любой сборке (`vite build`, CI/prod). Prod-сборка
  // эту ветку не содержит — dead-code elimination вырезает её на сборке. Ноль
  // env-флагов, ноль .env.local — единообразно с window.__* dev-helper'ами
  // (appActor.ts). Серверная половина — Password-провайдер за `!isProduction()`
  // (convex/auth.ts) — на production отсутствует.
  const devLoginAvailable = import.meta.env.DEV;

  // Фиксированный тестовый dev-аккаунт: компилируется только в dev-сборку
  // (ветка выше). Работает лишь против не-prod Convex, где поднят Password-провайдер.
  // Не секрет; репозиторий публичный → экспозиция ограничена dev-песочницей
  // (ADR 0024, «остаточный риск»).
  const DEV_LOGIN_EMAIL = 'dev@flowtyping.local';
  const DEV_LOGIN_PASSWORD = 'flowtyping-dev-login';

  async function handleDevSignIn() {
    error = null;
    signingIn = true;
    const credentials = { email: DEV_LOGIN_EMAIL, password: DEV_LOGIN_PASSWORD };
    try {
      try {
        await auth.signIn('password', { ...credentials, flow: 'signIn' });
      } catch {
        // Первый прогон: юзера ещё нет — регистрируем тем же паролем.
        await auth.signIn('password', { ...credentials, flow: 'signUp' });
      }
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      signingIn = false;
    }
  }
</script>

<section class="sign-in-screen">
  <h1 class="sign-in-screen__title">{$dictionary.sign_in.title}</h1>

  <!--
    EN soft-launch (P0-11, ADR 0021): показываем только Google. GitHub/Yandex
    временно скрыты. Убраны только их <button> + scoped-CSS здесь; общая
    инфраструктура намеренно оставлена дремать: backend-провайдеры
    (convex/auth.ts), тип OAuthProviderId, контракт-токены
    `--sign-in-screen-btn-{github,yandex}-*` + их значения в темах, i18n-ключи
    `sign_in.{github,yandex}` и `sign_in.disclaimer`. Вернуть провайдера
    (например Yandex к RU-запуску) = вставить назад его <button> + scoped-CSS.
    Оговорка «провайдер = аккаунт» при одном провайдере бессмысленна → не
    рендерим (вернуть <p class="sign-in-screen__disclaimer"> вместе с провайдерами).
  -->
  <button
    type="button"
    class="sign-in-screen__btn-google"
    disabled={signingIn}
    onclick={() => handleSignIn('google')}
  >
    {signingIn ? $dictionary.sign_in.redirecting : $dictionary.sign_in.google}
  </button>

  {#if devLoginAvailable}
    <button
      type="button"
      class="sign-in-screen__btn-dev"
      disabled={signingIn}
      onclick={handleDevSignIn}
    >
      {signingIn ? $dictionary.sign_in.dev_login_pending : $dictionary.sign_in.dev_login}
    </button>
  {/if}

  {#if error}
    <p class="sign-in-screen__error" role="alert">{error}</p>
  {/if}
</section>

<style>
  .sign-in-screen {
    background: var(--color-surface);
    padding: var(--spacing-8);
    border-radius: var(--radius-4);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-4);
    align-items: center;
    max-width: 22rem;
    margin: 4rem auto;
  }

  .sign-in-screen__title {
    color: var(--color-text-primary);
    font-size: 1.5rem;
    margin: 0;
  }

  .sign-in-screen__btn-google {
    background: var(--color-primary-background);
    color: var(--color-on-dense);
    border: 1px solid var(--color-primary-border);
    padding: 0.75rem 1.25rem;
    border-radius: var(--radius-2);
    cursor: pointer;
    font-size: 1rem;
  }

  .sign-in-screen__btn-google:hover {
    background: var(--color-primary-hover);
  }

  .sign-in-screen__btn-google:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .sign-in-screen__btn-google:focus-visible {
    outline: var(--focus-ring-width) solid var(--color-text-primary);
    outline-offset: var(--focus-ring-offset);
  }

  /* Dev-инструмент (ADR 0012): сознательно вне theme-контракта — кнопка живёт
     только в dev-сборке (import.meta.env.DEV), темизировать нечего. */
  .sign-in-screen__btn-dev {
    background: transparent;
    color: var(--color-text-secondary);
    border: 1px dashed var(--color-text-secondary);
    padding: 0.5rem 1rem;
    border-radius: var(--radius-2);
    cursor: pointer;
    font-size: 0.875rem;
  }

  .sign-in-screen__btn-dev:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .sign-in-screen__error {
    color: var(--color-error);
    font-size: 0.875rem;
  }
</style>
