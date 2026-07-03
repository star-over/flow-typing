<script lang="ts">
  import { getContext } from 'svelte';
  import { resolve } from '$app/paths';
  import App from '@/components/app/App.svelte';
  import { dictionary } from '@/lib/i18n';
  import type { AuthStore } from '@/lib/auth/auth-store.svelte';

  // Auth-барьер (ADR 0012): тренировка требует входа. Гость — приглашение (по
  // образцу /stats), loading — ничего (не мигать), авторизованный — тренажёр.
  const auth = getContext<AuthStore>('auth');
  const t = $derived($dictionary.train_gate);
</script>

{#if auth.state.status === 'guest'}
  <div class="train-gate">
    <p class="muted">{t.guest}</p>
    <a class="train-gate__sign-in" href={resolve('/signin')}>{t.sign_in}</a>
  </div>
{:else if auth.state.status === 'authenticated'}
  <App />
{/if}
<!-- loading → ничего не рендерим, чтобы не мигать «пусто» (образец /stats) -->


<style>
  .train-gate {
    margin: 4rem auto;
    max-width: 24rem;
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-4);
  }

  .muted {
    color: var(--color-text-secondary);
  }

  .train-gate__sign-in {
    color: var(--color-text-secondary);
    text-decoration: underline;
  }

  .train-gate__sign-in:hover,
  .train-gate__sign-in:focus-visible {
    color: var(--color-text-primary);
  }
</style>
