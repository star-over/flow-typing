<script lang="ts">
  import { appActor } from '$machines/appActor';
  import { trainingMachine } from '$machines/training.machine';
  import type { Actor } from 'xstate';

  import { dictionary } from '$lib/i18n';
  import { preferences } from '$lib/preferences';

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
  let keyboardLayout = $derived($preferences.keyboardLayout);

  const trainingActor = $derived(
    state.children.trainingService as Actor<typeof trainingMachine> | undefined
  );

  function handleKeyDown(event: KeyboardEvent) {
    const currentState = state as StateFrom<typeof appMachine>;
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

  // Single effect: bidirectional URL ↔ Store sync with one-shot URL→Store guard
  let hasSyncedFromUrl = false;
  $effect(() => {
    const urlId = page.url.searchParams.get('exerciseId');
    const storeId = $preferences.shared.exerciseId ?? null;

    if (urlId !== storeId) {
      // URL wins exactly once on initial load / external navigation
      if (!hasSyncedFromUrl) {
        hasSyncedFromUrl = true;
        preferences.update((p) => ({
          ...p,
          shared: { ...p.shared, exerciseId: urlId ?? undefined },
        }));
        return;
      }

      // Store wins after initial sync: update URL
      const newParams = new URLSearchParams(page.url.search);
      if (storeId) {
        newParams.set('exerciseId', storeId);
      } else {
        newParams.delete('exerciseId');
      }
      const newQuery = newParams.toString();
      const currentQuery = page.url.search.replace(/^\?/, '');

      if (newQuery !== currentQuery) {
        goto(`?${newQuery}`, { replaceState: true, noScroll: true });
      }
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
