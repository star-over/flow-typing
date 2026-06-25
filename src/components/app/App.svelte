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

  // Enter в menu: машина шлёт MENU_START_REQUESTED через `emit`, а старт здесь —
  // тем же событием и с той же $settings-раскладкой, что и кнопка «Начать
  // тренировку». Слушатель живёт только на /train (App монтируется лишь тут),
  // поэтому Enter на других маршрутах тренировку не запускает.
  const startSub = appActor.on('MENU_START_REQUESTED', () => {
    appActor.send({ type: 'START_TRAINING', symbolLayoutId: $settings.symbolLayoutId });
  });
  onDestroy(() => startSub.unsubscribe());

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
