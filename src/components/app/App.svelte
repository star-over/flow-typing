<script lang="ts">
  import { appActor } from '@/machines/appActor';
  import { selectSessionActor } from '@/machines/selectors';

  import { inState } from '@/lib/state-utils';
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

  // Вход на /train автоматически запускает тренировку (ADR 0025). P0-11(a) вынес конфиг из
  // меню на /settings, и одинокая кнопка «Начать тренировку» на /train стала
  // повторным трением: пользователь уже нажал её на лендинге (CTA → /train).
  // Шлём из тела скрипта — до первой отрисовки, чтобы не мелькнуть пустым
  // idle-кадром. Раскладку/длительность знает только UI ($settings). Событие —
  // корневой обработчик appMachine: из ЛЮБОГО состояния даёт свежую сессию
  // (сохраняет ядро ADR 0010 — вход не воскрешает залипший экран). App монтируется
  // лишь на /train и лишь у авторизованного (login wall на уровне роута, ADR 0012)
  // → автоматический запуск не трогает гостя, в т.ч. срабатывает сразу после Google-popup.
  appActor.send({
    type: 'TRAINER_OPENED',
    symbolLayoutId: $settings.symbolLayoutId,
    durationSeconds: $settings.sessionDurationSeconds,
  });

  // Уход с /train (клик по логотипу, Settings, Stats) размонтирует App, но
  // appActor — singleton и переживает навигацию (ADR 0007). Без сброса брошенная
  // сессия продолжает жить: Header в +layout читает таймер/паузу из живого FSM,
  // обратный отсчёт тикает «в фоне», кнопка «Пауза» висит в шапке. TRAINER_CLOSED
  // возвращает тренажёр в `idle` → invoked-sessionService завершается вместе с
  // таймером, Header очищается. Только из не-`idle` (в покое гасить нечего).
  onDestroy(() => {
    if (!inState({ snapshot: appActor.getSnapshot(), value: 'idle' })) {
      appActor.send({ type: 'TRAINER_CLOSED' });
    }
  });

  const sessionActor = $derived(selectSessionActor(state));
</script>

<MainContent
  {state}
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
