<script lang="ts">
  import { getContext } from 'svelte';
  import { browser } from '$app/environment';
  import { on } from 'svelte/events';
  import App from '@/components/app/App.svelte';
  import SignInScreen from '@/components/auth/SignInScreen.svelte';
  import MessageScreen from '@/components/ui/MessageScreen.svelte';
  import { TOUCH_ONLY_QUERY, isTouchOnlyDevice } from '@/lib/device';
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

  // Мобильный трафик: набор невозможен без физической клавиатуры (P1, S).
  // Предупреждение стоит ПЕРЕД auth-веткой — мобильный гость видит «нужна
  // клавиатура» ещё до приглашения войти, а App (шлёт TRAINER_OPENED в теле
  // скрипта — автостарт сессии, ADR 0025) на тач-устройстве не монтируется вовсе.
  // Начальное значение считаем синхронно (чистый SPA, matchMedia доступен на
  // init) — иначе App мигнул бы монтированием до срабатывания эффекта. Эффект
  // ловит поздний flip (планшет: поворот, подключение мыши). `keyboardConfirmed`
  // — per-visit «Продолжить всё равно»: сбрасывается на перезагрузке, без
  // localStorage (минимум; ложный позитив планшета-с-клавиатурой закрывается сам).
  let isTouchOnly = $state(browser ? isTouchOnlyDevice() : false);
  let keyboardConfirmed = $state(false);
  const kb = $derived($dictionary.keyboard_required);

  $effect(() => {
    if (!browser) return;
    const mq = matchMedia(TOUCH_ONLY_QUERY);
    return on(mq, 'change', (event) => {
      isTouchOnly = event.matches;
    });
  });
</script>

{#if isTouchOnly && !keyboardConfirmed}
  <!-- Мягкий гейт, не блок: «Продолжить всё равно» пропускает дальше, если
       эвристика обнаружения соврала (планшет с клавиатурой). -->
  <MessageScreen
    title={kb.title}
    body={kb.body}
    actionLabel={kb.continue_anyway}
    onAction={() => (keyboardConfirmed = true)}
  />
{:else if auth.state.status === 'guest'}
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
