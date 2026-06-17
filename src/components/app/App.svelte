<script lang="ts">
  import { appActor } from '@/machines/appActor';
  import type { sessionMachine } from '@/machines/session.machine';
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

  const sessionActor = $derived(
    state.children.sessionService as Actor<typeof sessionMachine> | undefined
  );
</script>

<MainContent
  {state}
  send={appActor.send.bind(appActor)}
  dictionary={$dictionary}
  {sessionActor}
/>

<FooterActions
  {state}
  send={appActor.send.bind(appActor)}
  dictionary={$dictionary}
  symbolLayoutId={$settings.symbolLayoutId}
/>
