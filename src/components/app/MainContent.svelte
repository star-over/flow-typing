<script lang="ts">
  import type { Actor, StateFrom } from 'xstate';
  import type { appMachine, AppEvent } from '@/machines/app.machine';
  import type { trainingMachine } from '@/machines/training.machine';
  import type { Dictionary } from '@/interfaces/types';
  import { fingerLayoutASDF } from '@/data/layouts/finger-layout-asdf';
  import { physicalLayoutANSI } from '@/data/layouts/physical-layout-ansi';

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
</script>

{#if state.matches({ training: 'running' }) && trainingActor}
  <TrainingScene {trainingActor} fingerLayout={fingerLayoutASDF} physicalLayout={physicalLayoutANSI} {dictionary} />
{:else if state.matches('trainingComplete') && state.context.lastTrainingStream}
  <LessonStatsDisplay stream={state.context.lastTrainingStream} {dictionary} />
{:else if state.matches('settings')}
  <UserPreferencesPage onBack={() => send({ type: 'TO_MENU' })} {dictionary} />
{:else if state.matches('allStat')}
  <h2 class="screen-title">{dictionary.app.stats_screen_title}</h2>
{:else if state.matches({ training: 'paused' })}
  <h2 class="screen-title pause">{dictionary.app.pause}</h2>
{:else if state.matches('error')}
  <h2 class="screen-title error">{dictionary.app.error_title}</h2>
{:else if state.matches('initializing')}
  <div class="loading">{dictionary.app.loading}</div>
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

  .error {
    color: var(--color-error);
  }

  .loading {
    color: var(--color-text-muted);
  }

  .welcome {
    padding: var(--spacing-4);
    text-align: center;
    color: var(--color-text-secondary);
  }
</style>
