<script lang="ts">
  import type { Actor, StateFrom } from 'xstate';
  import type { appMachine } from '@/machines/app.machine';
  import type { sessionMachine } from '@/machines/session.machine';
  import type { Dictionary } from '@/interfaces/types';
  import { getContext } from 'svelte';
  import { getFingerLayout, getPhysicalLayout } from '@/lib/layouts';
  import { settings } from '@/lib/settings';

  const fingerLayout = $derived(getFingerLayout($settings.fingerLayoutId));
  const physicalLayoutANSI = getPhysicalLayout('ansi');

  import { inState } from '@/lib/state-utils';
  import { lessonStatsFromSummary } from '@/lib/stats-calculator';

  import TrainingScene from '@/components/train/TrainingScene.svelte';
  import LessonStatsDisplay from '@/components/train/LessonStatsDisplay.svelte';
  import RepertoireProgress from '@/components/train/RepertoireProgress.svelte';
  import type { RepertoireStore } from '@/lib/repertoire/repertoire-store.svelte';
  import type { AuthStore } from '@/lib/auth/auth-store.svelte';

  const repertoire = getContext<RepertoireStore>('repertoire');
  const auth = getContext<AuthStore>('auth');

  interface Props {
    state: StateFrom<typeof appMachine>;
    dictionary: Dictionary;
    sessionActor: Actor<typeof sessionMachine> | undefined;
  }

  const { state, dictionary, sessionActor }: Props = $props();

  // null, когда нечего показывать (нет завершённой сессии или ни одного предъявления).
  // Тогда экран sessionComplete пуст — допустимое degenerate-состояние, решение
  // принимает родитель, не сам LessonStatsDisplay. Источник — каноническая сводка
  // сессии (те же числа, что строка /stats), а не «настенное» время по attempts.
  const lessonStats = $derived.by(() => {
    const summary = state.context.lastSessionSummary;
    if (!summary || summary.exposures === 0) return null;
    return lessonStatsFromSummary(summary);
  });
</script>

{#if inState({ snapshot: state, value: { training: 'running' } }) && sessionActor}
  <TrainingScene
    {sessionActor}
    {fingerLayout}
    physicalLayout={physicalLayoutANSI}
    cursorType={$settings.cursorType}
    rhythmChannelEnabled={$settings.rhythmChannelEnabled}
    rhythmAriaLabel={dictionary.app.rhythm_channel_aria}
    loadingLabel={dictionary.app.loading}
  />

{:else if inState({ snapshot: state, value: 'sessionComplete' }) && lessonStats}
  <LessonStatsDisplay stats={lessonStats} {dictionary} />
  <RepertoireProgress
    snapshot={repertoire.snapshot}
    grew={repertoire.grew}
    isGuest={auth.state.status === 'guest'}
    {dictionary}
  />

{:else if inState({ snapshot: state, value: 'sessionComplete' })}
  <!-- Вырожденное завершение: сессия окончилась без единого предъявления
       (lessonStats===null при exposures===0) — раньше экран был пуст. Сообщаем,
       а не оставляем белое поле. Кнопка «Начать заново» — в FooterActions. -->
  <p class="screen-note">{dictionary.app.session_empty}</p>

{:else if inState({ snapshot: state, value: 'sessionError' })}
  <!-- Сетевой сбой старта сессии (sessionMachine.error → SESSION.ERROR): видимая
       деградация вместо тихого пустого завершения. Кнопка «Повторить» —
       в FooterActions. -->
  <div class="session-error">
    <h2 class="screen-title">{dictionary.app.error_title}</h2>
    <p class="screen-note">{dictionary.app.error_network}</p>
  </div>

{:else if inState({ snapshot: state, value: { training: 'paused' } })}
  <h2 class="screen-title pause">{dictionary.app.pause}</h2>
{/if}
<!-- Ветки под `idle` нет: /train автоматически запускает (ADR 0025), меню-экран упразднён. -->


<style>
  .screen-title {
    font-size: 1.5rem;
    font-weight: 700;
  }

  .pause {
    color: var(--main-content-pause-color);
  }

  .session-error {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-3);
    max-width: 28rem;
    text-align: center;
  }

  .screen-note {
    color: var(--color-text-secondary);
  }
</style>
