<script lang="ts">
  import { appActor } from '@/machines/appActor';
  import type { trainingMachine } from '@/machines/training.machine';
  import type { Actor } from 'xstate';

  import { dictionary } from '@/lib/i18n';
  import { settings } from '@/lib/settings';
  import { onDestroy } from 'svelte';

  import MainContent from './MainContent.svelte';
  import FooterActions from './FooterActions.svelte';

  let state = $state(appActor.getSnapshot());
  const actorSub = appActor.subscribe((snapshot) => {
    state = snapshot;
  });
  onDestroy(() => actorSub.unsubscribe());

  const trainingActor = $derived(
    state.children.trainingService as Actor<typeof trainingMachine> | undefined
  );
</script>

<MainContent
  {state}
  send={appActor.send.bind(appActor)}
  dictionary={$dictionary}
  {trainingActor}
/>

<FooterActions
  {state}
  send={appActor.send.bind(appActor)}
  dictionary={$dictionary}
  symbolLayoutId={$settings.symbolLayoutId}
/>
