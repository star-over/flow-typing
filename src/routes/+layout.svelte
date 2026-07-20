<script lang="ts">
  import '../app.css';
  import { setupConvexAuth, useAuth } from '@mmailaender/convex-auth-svelte/svelte';
  import { PUBLIC_CONVEX_URL } from '$env/static/public';
  import { convex, api } from '@/lib/convex';
  import { createAuthStore } from '@/lib/auth/auth-store.svelte';
  import { createRepertoireStore } from '@/lib/repertoire/repertoire-store.svelte';
  import { createSessionsStore } from '@/lib/session-history/sessions-store.svelte';
  import { createSurveyStore } from '@/lib/survey/survey-store.svelte';
  import { appActor } from '@/machines/appActor';
  import { selectSessionActor, selectSessionTimer } from '@/machines/selectors';
  import { computeTimerSeconds } from '@/lib/timer-display';
  import { DEFAULT_USER_SETTINGS } from '@/user-settings/defaults';
  import { dictionary } from '@/lib/i18n';
  import { settings, attachCloudSync } from '@/lib/settings';
  import { inState } from '@/lib/state-utils';
  import { resolveTheme } from '@/themes/registry';
  import { browser } from '$app/environment';
  import { page } from '$app/state';
  import { on } from 'svelte/events';
  import { onDestroy, setContext } from 'svelte';
  import { isKnownKeyCapId } from '@/interfaces/key-cap-id';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { dispatchCommand, isCommandChord } from '@/lib/commands/dispatch';

  import Header from '@/components/header/Header.svelte';

  setupConvexAuth({
    client: convex,
    convexUrl: PUBLIC_CONVEX_URL,
  });

  // Work around convex-auth-svelte: wrapper calls client.setAuth(...) only ONCE
  // at setupConvexAuth. После OAuth callback wrapper'у нужно время на PKCE
  // exchange — в этот момент fetchAccessToken() возвращает null, convex переходит
  // в noAuth state и больше не пере-fetch'ит при появлении token'а.
  // Reactive re-wire — каждый раз когда token меняется, заново отдаём getter
  // в convex, что запускает refetch + re-validate всех subscriptions.
  const auth = useAuth();
  $effect(() => {
    if (auth.token) {
      convex.setAuth(auth.fetchAccessToken);
    }
  });

  const authStore = createAuthStore();
  setContext('auth', authStore);

  const repertoireStore = createRepertoireStore({
    authStore,
    symbolLayoutId: () => $settings.symbolLayoutId,
  });
  setContext('repertoire', repertoireStore);

  const sessionsStore = createSessionsStore({
    authStore,
    symbolLayoutId: () => $settings.symbolLayoutId,
  });
  setContext('sessions', sessionsStore);

  const surveyStore = createSurveyStore({ authStore });
  setContext('survey', surveyStore);

  // Phase 5: cross-device settings sync для авторизованных юзеров.
  // Гость работает offline, никаких cloud-вызовов; auth-guard внутри attachCloudSync.
  const cloudSync = attachCloudSync({
    authStore,
    pullCloud: () => convex.query(api.userSettings.getMine, {}),
    pushCloud: (args) => convex.mutation(api.userSettings.upsertMine, args),
  });
  $effect(() => {
    // Явно tracking-ем status field — точное rune-dependency на конкретное reactive значение.
    // Effect повторно выполняется на каждое изменение status'а; internal guards игнорируют non-transitions.
    void authStore.state.status;
    cloudSync.notifyAuthChanged();
  });
  onDestroy(() => cloudSync.dispose());

  const { children } = $props();

  // Имя `appState`, а не `state`: в файле есть реальные `$store`-подписки
  // ($settings, $dictionary), и svelte2tsx начинает путать руну `$state` с
  // подпиской `$`+`state`, когда рядом живёт переменная `state` — ломает
  // типизацию снимка. Имя без коллизии снимает неоднозначность.
  let appState = $state(appActor.getSnapshot());
  const actorSub = appActor.subscribe((snapshot) => {
    appState = snapshot;
  });
  onDestroy(() => actorSub.unsubscribe());

  // Отмечаем ступень РОВНО на входе в тренировку (edge-triggered) — для показа
  // перехода в sessionComplete. Не на каждый внутренний переход (running↔paused):
  // рост openedSteps случается на refill-чекпоинтах внутри сессии, и повторный
  // markSessionStart перезаписал бы стартовую отметку, скрыв «новую ступень».
  let wasTraining = false;
  $effect(() => {
    const isTraining = inState({ snapshot: appState, value: 'training' });
    if (isTraining && !wasTraining) repertoireStore.markSessionStart();
    wasTraining = isTraining;
  });

  // Таймер сессии переехал из центра сцены сюда, на периферию-хром (тихо, сбоку).
  // displayElapsedMs тикает ВНУТРИ session-актора и не всплывает в снимок appActor,
  // поэтому подписываемся на него напрямую (как TrainingScene). timerSeconds = null
  // вне тренировки → Header счётчик не рисует.
  const sessionActor = $derived(selectSessionActor(appState));
  let displayElapsedMs = $state(0);
  $effect(() => {
    const actor = sessionActor;
    if (!actor) {
      displayElapsedMs = 0;
      return;
    }
    displayElapsedMs = selectSessionTimer(actor.getSnapshot()).displayElapsedMs;
    const sub = actor.subscribe((s) => {
      displayElapsedMs = selectSessionTimer(s).displayElapsedMs;
    });
    return () => sub.unsubscribe();
  });
  const timerSeconds = $derived(
    computeTimerSeconds({
      displayElapsedMs,
      isTraining: inState({ snapshot: appState, value: 'training' }),
      hasSession: sessionActor !== undefined,
      durationSeconds: sessionActor ? selectSessionTimer(sessionActor.getSnapshot()).durationSeconds : DEFAULT_USER_SETTINGS.sessionDurationSeconds,
    }),
  );

  // Пауза в шапке (рядом с таймером): доступна только в активном наборе.
  const canPause = $derived(appState.can({ type: 'PAUSE' }));

  function handleKeyDown(event: KeyboardEvent) {
    if (!isKnownKeyCapId(event.code)) return;
    // Аккорд с Cmd/Ctrl/Alt — канал команд, а не печать (ADR 0032). При
    // совпадении команда выполняется, браузерный дефолт гасится; при промахе
    // клавиша всё равно НЕ уходит в appActor — иначе Cmd+K во время
    // тренировки засчитывался бы как опечатка.
    if (isCommandChord(event)) {
      const handled = dispatchCommand({
        event,
        context: {
          isTraining: inState({ snapshot: appState, value: 'training' }),
          navigate: (route) => void goto(resolve(route)),
        },
      });
      if (handled) event.preventDefault();
      return;
    }
    if (inState({ snapshot: appState, value: 'training' }) && event.code === 'Space') {
      event.preventDefault();
    }
    appActor.send({ type: 'KEY_DOWN', keyCapId: event.code });
  }

  function handleKeyUp(event: KeyboardEvent) {
    if (!isKnownKeyCapId(event.code)) return;
    appActor.send({ type: 'KEY_UP', keyCapId: event.code });
  }

  function handleBlur() {
    appActor.send({ type: 'PAUSE' });
  }

  // Рантайм-краш в отрисовке/эффекте страницы (напр. $derived-конвейер ViewModel
  // тренажёра) ловит <svelte:boundary> ниже — вместо белого экрана всего
  // приложения. dev-лог = тот же Sentry-шов, что и hooks.client.handleError (P0-7).
  // Header — ВНЕ границы, навигация переживает краш; восстановление — перезагрузка
  // (singleton appActor мог повредиться, reset() перерисовал бы то же битое состояние).
  function handleBoundaryError(error: unknown) {
    if (import.meta.env.DEV) {
      console.error('[boundary]', error);
    }
  }

  $effect(() => {
    const lang = $settings.interfaceLanguage;
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }
  });

  $effect(() => {
    if (!browser) return;
    document.documentElement.dataset.theme = resolveTheme($settings.theme);
  });

  $effect(() => {
    if (!browser) return;
    if ($settings.theme !== 'auto') return;
    const mq = matchMedia('(prefers-color-scheme: dark)');
    return on(mq, 'change', () => {
      document.documentElement.dataset.theme = resolveTheme('auto');
    });
  });

  if (import.meta.hot) import.meta.hot.invalidate();
</script>

<svelte:window
  onkeydown={handleKeyDown}
  onkeyup={handleKeyUp}
  onblur={handleBlur}
/>

<div class="app-shell">
  <Header
    title={$dictionary.app.title}
    {timerSeconds}
    {canPause}
    pauseLabel={$dictionary.app.pause}
    onPause={() => appActor.send({ type: 'PAUSE' })}
    showLanguageSwitcher={!page.url.pathname.startsWith('/train')}
  />

  <main class="main">
    <svelte:boundary onerror={handleBoundaryError}>
      {@render children()}

      {#snippet failed()}
        <div class="app-error">
          <h1 class="app-error__title">{$dictionary.app.error_title}</h1>
          <p class="app-error__body">{$dictionary.app.error_body}</p>
          <button
            type="button"
            class="app-error__action"
            onclick={() => location.reload()}
          >
            {$dictionary.app.reload}
          </button>
        </div>
      {/snippet}
    </svelte:boundary>
  </main>
</div>

<style>
  .app-shell {
    font-family: var(--font-sans);
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  /* Fallback error-boundary: центрированная колонка внутри .main (Header уцелел). */
  .app-error {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-3);
    max-width: 28rem;
    margin: auto;
    text-align: center;
  }

  .app-error__title {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--color-text-primary);
  }

  .app-error__body {
    color: var(--color-text-secondary);
  }

  .app-error__action {
    margin-top: var(--spacing-2);
    padding: var(--spacing-2) var(--spacing-4);
    border-radius: var(--radius-3);
    border: 1px solid var(--color-text-secondary);
    background: transparent;
    color: var(--color-text-primary);
    font-family: var(--font-sans);
    font-size: 0.875rem;
    cursor: pointer;
  }

  .app-error__action:hover {
    border-color: var(--color-text-primary);
  }

  /* Header — slim top bar (sibling, не внутри центрирующего padding'а контента). */
  .main {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: var(--spacing-4);
    width: 100%;
    padding: var(--spacing-8);
  }
</style>
