<script lang="ts">
  import { getContext } from 'svelte';
  import App from '@/components/app/App.svelte';
  import SignInScreen from '@/components/auth/SignInScreen.svelte';
  import { dictionary } from '@/lib/i18n';
  import type { AuthStore } from '@/lib/auth/auth-store.svelte';

  // Auth-барьер (ADR 0012): тренировка требует входа. P0-11: гостю показываем
  // сам SignInScreen на месте (не ссылку на /signin — минус экран, минус клик;
  // тот же компонент, что и /signin). Строка-подводка объясняет, зачем вход на
  // том, что гость пришёл тренировать. loading — ничего (не мигать),
  // авторизованный — тренажёр. Google popup-flow → после входа гейт становится
  // тренажёром без навигации (redirectTo не нужен, пока провайдер один).
  const auth = getContext<AuthStore>('auth');
  const t = $derived($dictionary.train_gate);
</script>

{#if auth.state.status === 'guest'}
  <p class="train-gate__lead">{t.guest}</p>
  <SignInScreen />
{:else if auth.state.status === 'authenticated'}
  <App />
{/if}
<!-- loading → ничего не рендерим, чтобы не мигать «пусто» (образец /stats) -->


<style>
  .train-gate__lead {
    max-width: 22rem;
    margin: 4rem auto 0;
    text-align: center;
    color: var(--color-text-secondary);
  }
</style>
