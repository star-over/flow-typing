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
</script>

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
