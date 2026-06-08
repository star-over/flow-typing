<script lang="ts">
  import type { Actor, StateFrom } from 'xstate';
  import type { appMachine, AppEvent } from '@/machines/app.machine';
  import type { trainingMachine } from '@/machines/training.machine';
  import type { Dictionary } from '@/interfaces/types';
  import { getFingerLayout, getPhysicalLayout } from '@/lib/layouts';

  const fingerLayoutASDF = getFingerLayout('asdf');
  const physicalLayoutANSI = getPhysicalLayout('ansi');

  import { inState } from '@/lib/state-utils';
  import { calculateLessonStats } from '@/lib/stats-calculator';

  import TrainingScene from '@/components/ui/TrainingScene.svelte';
  import LessonStatsDisplay from '@/components/ui/LessonStatsDisplay.svelte';
  import UserPreferencesPage from '@/components/ui/UserPreferencesPage.svelte';

  interface Props {
    state: StateFrom<typeof appMachine>;
    send: (event: AppEvent) => void;
    dictionary: Dictionary;
    trainingActor: Actor<typeof trainingMachine> | undefined;
  }

  const { state, send, dictionary, trainingActor }: Props = $props();

  // null, когда нечего показывать (нет завершённого потока или нет нажатий).
  // Тогда экран trainingComplete пуст — это допустимое degenerate-состояние,
  // решение принимает родитель, не сам компонент LessonStatsDisplay.
  const lessonStats = $derived.by(() => {
    const stream = state.context.lastTrainingStream;
    if (!stream) return null;
    const s = calculateLessonStats(stream);
    return s.totalAttempts > 0 ? s : null;
  });
</script>

{#if inState({ snapshot: state, value: { training: 'running' } }) && trainingActor}
  <TrainingScene {trainingActor} fingerLayout={fingerLayoutASDF} physicalLayout={physicalLayoutANSI} {dictionary} />
{:else if inState({ snapshot: state, value: 'trainingComplete' }) && lessonStats}
  <LessonStatsDisplay stats={lessonStats} {dictionary} />
{:else if inState({ snapshot: state, value: 'settings' })}
  <UserPreferencesPage onBack={() => send({ type: 'TO_MENU' })} {dictionary} />
{:else if inState({ snapshot: state, value: 'allStat' })}
  <h2 class="screen-title">{dictionary.app.stats_screen_title}</h2>
{:else if inState({ snapshot: state, value: { training: 'paused' } })}
  <h2 class="screen-title pause">{dictionary.app.pause}</h2>
{:else}
  <div class="welcome">
    <p>{dictionary.app.welcome}</p>
  </div>
{/if}

<style>
  .screen-title {
    font-size: 1.5rem;
    font-weight: 700;
  }

  .pause {
    color: var(--color-text-secondary);
  }

  .welcome {
    padding: var(--spacing-4);
    text-align: center;
    color: var(--color-text-secondary);
  }
</style>
