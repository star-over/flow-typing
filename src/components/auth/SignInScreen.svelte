<script lang="ts">
  import { getContext } from 'svelte';
  import { env } from '$env/dynamic/public';
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

  // Dev-вход (ADR 0012): кнопка существует только когда .env.local даёт все три
  // флага (в prod-сборке их нет). Серверная половина — Password-провайдер за
  // AUTH_DEV_LOGIN_ENABLED (convex/auth.ts) — на production отсутствует.
  const devLoginAvailable =
    env.PUBLIC_DEV_LOGIN === 'true' &&
    Boolean(env.PUBLIC_DEV_LOGIN_EMAIL) &&
    Boolean(env.PUBLIC_DEV_LOGIN_PASSWORD);

  async function handleDevSignIn() {
    error = null;
    signingIn = true;
    const credentials = {
      email: env.PUBLIC_DEV_LOGIN_EMAIL!,
      password: env.PUBLIC_DEV_LOGIN_PASSWORD!,
    };
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
  <h1 class="sign-in-screen__title">Войти в FlowTyping</h1>

  <button
    type="button"
    class="sign-in-screen__btn-github"
    disabled={signingIn}
    onclick={() => handleSignIn('github')}
  >
    {signingIn ? 'Перенаправление…' : 'Войти через GitHub'}
  </button>

  <button
    type="button"
    class="sign-in-screen__btn-google"
    disabled={signingIn}
    onclick={() => handleSignIn('google')}
  >
    {signingIn ? 'Перенаправление…' : 'Войти через Google'}
  </button>

  <button
    type="button"
    class="sign-in-screen__btn-yandex"
    disabled={signingIn}
    onclick={() => handleSignIn('yandex')}
  >
    {signingIn ? 'Перенаправление…' : 'Войти через Yandex'}
  </button>

  <p class="sign-in-screen__disclaimer">
    Используй тот же способ входа, что и раньше — твой прогресс привязан к нему.
  </p>

  {#if devLoginAvailable}
    <button
      type="button"
      class="sign-in-screen__btn-dev"
      disabled={signingIn}
      onclick={handleDevSignIn}
    >
      {signingIn ? 'Входим…' : 'Dev-вход (агент / E2E)'}
    </button>
  {/if}

  {#if error}
    <p class="sign-in-screen__error" role="alert">{error}</p>
  {/if}
</section>

<style>
  .sign-in-screen {
    background: var(--sign-in-screen-background);
    padding: var(--spacing-8);
    border-radius: var(--radius-md, 0.5rem);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-4);
    align-items: center;
    max-width: 22rem;
    margin: 4rem auto;
  }

  .sign-in-screen__title {
    color: var(--sign-in-screen-title-color);
    font-size: 1.5rem;
    margin: 0;
  }

  .sign-in-screen__disclaimer {
    color: var(--sign-in-screen-disclaimer-color);
    font-size: 0.875rem;
    text-align: center;
    margin: 0;
  }

  .sign-in-screen__btn-github {
    background: var(--sign-in-screen-btn-github-background);
    color: var(--sign-in-screen-btn-github-color);
    border: var(--sign-in-screen-btn-github-border);
    padding: 0.75rem 1.25rem;
    border-radius: var(--radius-sm, 0.25rem);
    cursor: pointer;
    font-size: 1rem;
  }

  .sign-in-screen__btn-github:hover {
    background: var(--sign-in-screen-btn-github-hover-background);
  }

  .sign-in-screen__btn-github:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .sign-in-screen__btn-google {
    background: var(--sign-in-screen-btn-google-background);
    color: var(--sign-in-screen-btn-google-color);
    border: var(--sign-in-screen-btn-google-border);
    padding: 0.75rem 1.25rem;
    border-radius: var(--radius-sm, 0.25rem);
    cursor: pointer;
    font-size: 1rem;
  }

  .sign-in-screen__btn-google:hover {
    background: var(--sign-in-screen-btn-google-hover-background);
  }

  .sign-in-screen__btn-google:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .sign-in-screen__btn-yandex {
    background: var(--sign-in-screen-btn-yandex-background);
    color: var(--sign-in-screen-btn-yandex-color);
    border: var(--sign-in-screen-btn-yandex-border);
    padding: 0.75rem 1.25rem;
    border-radius: var(--radius-sm, 0.25rem);
    cursor: pointer;
    font-size: 1rem;
  }

  .sign-in-screen__btn-yandex:hover {
    background: var(--sign-in-screen-btn-yandex-hover-background);
  }

  .sign-in-screen__btn-yandex:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  /* Dev-инструмент (ADR 0012): сознательно вне theme-контракта — кнопка живёт
     только в dev-сборке за PUBLIC_DEV_LOGIN, темизировать нечего. */
  .sign-in-screen__btn-dev {
    background: transparent;
    color: var(--color-text-secondary);
    border: 1px dashed var(--color-text-secondary);
    padding: 0.5rem 1rem;
    border-radius: var(--radius-sm, 0.25rem);
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
