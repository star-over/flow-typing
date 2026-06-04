<script lang="ts">
  import { appActor } from '$machines/appActor';
  import type { trainingMachine } from '$machines/training.machine';
  import type { Actor } from 'xstate';

  import { dictionary } from '$lib/i18n';
  import { preferences } from '$lib/preferences';
  import { planExerciseIdSync } from '$lib/exercise-id-sync';

  import Header from './Header.svelte';
  import MainContent from './MainContent.svelte';
  import FooterActions from './FooterActions.svelte';

  import { onDestroy } from 'svelte';
  import type { KeyCapId } from '$interfaces/key-cap-id';
  import type { StateFrom } from 'xstate';
  import type { appMachine } from '$machines/app.machine';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';

  let state = $state(appActor.getSnapshot());
  const actorSub = appActor.subscribe((snapshot) => {
    state = snapshot;
  });
  onDestroy(() => actorSub.unsubscribe());

  // Reactive keyboard layout from store for FooterActions
  const keyboardLayout = $derived($preferences.keyboardLayout);

  const trainingActor = $derived(
    state.children.trainingService as Actor<typeof trainingMachine> | undefined
  );

  function handleKeyDown(event: KeyboardEvent) {
    const currentState = state;
    if (currentState.matches('training') && event.code === 'Space') {
      event.preventDefault();
    }
    appActor.send({ type: 'KEY_DOWN', keyCapId: event.code as KeyCapId });
  }

  function handleKeyUp(event: KeyboardEvent) {
    appActor.send({ type: 'KEY_UP', keyCapId: event.code as KeyCapId });
  }

  function handleBlur() {
    appActor.send({ type: 'PAUSE' });
  }

  let hasSyncedFromUrl = false;
  $effect(() => {
    const action = planExerciseIdSync({
      urlId: page.url.searchParams.get('exerciseId'),
      storeId: $preferences.shared.exerciseId ?? null,
      currentSearch: page.url.search,
      hasSyncedFromUrl,
    });

    switch (action.type) {
      case 'URL_TO_STORE':
        hasSyncedFromUrl = true;
        preferences.update((p) => ({
          ...p,
          shared: { ...p.shared, exerciseId: action.exerciseId },
        }));
        break;
      case 'STORE_TO_URL':
        goto(`?${action.newSearch}`, { replaceState: true, noScroll: true });
        break;
    }
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
