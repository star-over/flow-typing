<script lang="ts">
  import { getContext } from 'svelte';
  import type { createAuthStore } from '@/lib/auth/auth-store.svelte';

  type AuthStore = ReturnType<typeof createAuthStore>;
  const auth = getContext<AuthStore>('auth');
  let error: string | null = $state(null);
  let signingIn: boolean = $state(false);

  async function handleGithubSignIn() {
    error = null;
    signingIn = true;
    try {
      await auth.signIn('github');
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
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
    onclick={handleGithubSignIn}
  >
    {signingIn ? 'Перенаправление…' : 'Войти через GitHub'}
  </button>

  <p class="sign-in-screen__disclaimer">
    Используй тот же способ входа, что и раньше — твой прогресс привязан к нему.
  </p>

  {#if error}
    <p class="sign-in-screen__error" role="alert">{error}</p>
  {/if}
</section>

<style>
  .sign-in-screen {
    background: var(--sign-in-screen-background);
    padding: var(--spacing-xl, 2rem);
    border-radius: var(--radius-md, 0.5rem);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md, 1rem);
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

  .sign-in-screen__error {
    color: oklch(60% 0.2 25);
    font-size: 0.875rem;
  }
</style>
