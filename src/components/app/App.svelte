<script lang="ts">
  import { appActor } from '@/machines/appActor';
  import { selectSessionActor } from '@/machines/selectors';

  import { inState } from '@/lib/state-utils';
  import { dictionary } from '@/lib/i18n';
  import { settings } from '@/lib/settings';
  import { onDestroy, onMount } from 'svelte';

  import MainContent from './MainContent.svelte';
  import FooterActions from './FooterActions.svelte';

  let state = $state(appActor.getSnapshot());
  const actorSub = appActor.subscribe((snapshot) => {
    state = snapshot;
  });
  onDestroy(() => actorSub.unsubscribe());

  // Вход на /train всегда показывает чистое меню. appActor — singleton и
  // переживает навигацию (ADR 0007), поэтому без сброса при возврате всплывает
  // прошлый экран результатов (`sessionComplete`) или брошенная пауза/сессия.
  // «Начать тренировку» на лендинге должна именно начинать заново — нормализуем
  // тренажёр в `menu` здесь, при монтировании (= при входе на /train). Пауза/
  // возобновление внутри /train не задеты: их внутренние переходы App не размонтируют (ADR 0010).
  onMount(() => {
    if (!inState({ snapshot: appActor.getSnapshot(), value: 'menu' })) {
      appActor.send({ type: 'TRAINER_OPENED' });
    }
  });

  // Уход с /train (клик по логотипу, Settings, Stats) размонтирует App, но
  // appActor — singleton и переживает навигацию (ADR 0007). Без сброса брошенная
  // сессия продолжает жить: Header в +layout читает таймер/паузу из живого FSM,
  // обратный отсчёт тикает «в фоне», кнопка «Пауза» висит в шапке. Зеркально
  // TRAINER_OPENED возвращаем тренажёр в menu → invoked-sessionService
  // завершается вместе с таймером, Header очищается.
  onDestroy(() => {
    if (!inState({ snapshot: appActor.getSnapshot(), value: 'menu' })) {
      appActor.send({ type: 'TRAINER_CLOSED' });
    }
  });

  // Enter в menu: машина шлёт MENU_START_REQUESTED через `emit`, а старт здесь —
  // тем же событием и с той же $settings-раскладкой, что и кнопка «Начать
  // тренировку». Слушатель живёт только на /train (App монтируется лишь тут),
  // поэтому Enter на других маршрутах тренировку не запускает.
  const startSub = appActor.on('MENU_START_REQUESTED', () => {
    appActor.send({ type: 'START_TRAINING', symbolLayoutId: $settings.symbolLayoutId, durationSeconds: $settings.sessionDurationSeconds });
  });
  onDestroy(() => startSub.unsubscribe());

  const sessionActor = $derived(selectSessionActor(state));
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
  durationSeconds={$settings.sessionDurationSeconds}
/>
