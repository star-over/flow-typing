<script lang="ts">
  import { appActor } from '@/machines/appActor';
  import type { trainingMachine } from '@/machines/training.machine';
  import type { Actor } from 'xstate';

  import { dictionary } from '@/lib/i18n';
  import { settings } from '@/lib/settings';
  import { inState } from '@/lib/state-utils';
  import { resolveTheme } from '@/themes/registry';
  import { browser } from '$app/environment';
  import { on } from 'svelte/events';

  import Header from './Header.svelte';
  import MainContent from './MainContent.svelte';
  import FooterActions from './FooterActions.svelte';

  import { onDestroy } from 'svelte';
  import { isKnownKeyCapId } from '@/interfaces/key-cap-id';
  let state = $state(appActor.getSnapshot());
  const actorSub = appActor.subscribe((snapshot) => {
    state = snapshot;
  });
  onDestroy(() => actorSub.unsubscribe());

  const trainingActor = $derived(
    state.children.trainingService as Actor<typeof trainingMachine> | undefined
  );

  function handleKeyDown(event: KeyboardEvent) {
    if (!isKnownKeyCapId(event.code)) return;
    if (inState({ snapshot: state, value: 'training' }) && event.code === 'Space') {
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

  // Синхронизация `data-theme` с settings. Inline-script в `src/app.html`
  // ставит атрибут до paint; этот effect перетирает его после hydration,
  // если пользователь сменил тему в Settings.
  $effect(() => {
    if (!browser) return;
    document.documentElement.dataset.theme = resolveTheme($settings.theme);
  });

  // Live-обновление при системной смене темы, только в режиме `'auto'`.
  // `on()` возвращает cleanup — без него listener утекает при переключении
  // на конкретную тему.
  $effect(() => {
    if (!browser) return;
    if ($settings.theme !== 'auto') return;
    const mq = matchMedia('(prefers-color-scheme: dark)');
    return on(mq, 'change', () => {
      document.documentElement.dataset.theme = resolveTheme('auto');
    });
  });
</script>

<svelte:window
  onkeydown={handleKeyDown}
  onkeyup={handleKeyUp}
  onblur={handleBlur}
/>

<div class="app-container">
  <Header
    title={$dictionary.app.title}
    appStateLabel={$dictionary.app.app_state}
    appStateValue={JSON.stringify(state.value)}
  />

  <main class="main">
    <MainContent
      {state}
      send={appActor.send.bind(appActor)}
      dictionary={$dictionary}
      {trainingActor}
    />
  </main>

  <FooterActions
    {state}
    send={appActor.send.bind(appActor)}
    dictionary={$dictionary}
    symbolLayoutId={$settings.symbolLayoutId}
  />
</div>

<style>
  .app-container {
    font-family: var(--font-sans);
    display: grid;
    grid-template-rows: auto 1fr auto;
    align-items: center;
    justify-items: center;
    min-height: 100vh;
    padding: var(--spacing-8);
    gap: var(--spacing-8);
  }

  .main {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-4);
    align-items: center;
    width: 100%;
  }
</style>
