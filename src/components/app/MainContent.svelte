<script lang="ts">
  import type { Actor, StateFrom } from 'xstate';
  import type { appMachine, AppEvent } from '@/machines/app.machine';
  import type { sessionMachine } from '@/machines/session.machine';
  import type { Dictionary } from '@/interfaces/types';
  import { getContext } from 'svelte';
  import { getFingerLayout, getPhysicalLayout } from '@/lib/layouts';
  import { settings } from '@/lib/settings';

  const fingerLayout = $derived(getFingerLayout($settings.fingerLayoutId));
  const physicalLayoutANSI = getPhysicalLayout('ansi');

  import { inState } from '@/lib/state-utils';
  import { lessonStatsFromSummary } from '@/lib/stats-calculator';

  import TrainingScene from '@/components/ui/TrainingScene.svelte';
  import LessonStatsDisplay from '@/components/ui/LessonStatsDisplay.svelte';
  import MenuScreen from '@/components/ui/MenuScreen.svelte';
  import RepertoireProgress from '@/components/ui/RepertoireProgress.svelte';
  import type { RepertoireStore } from '@/lib/repertoire/repertoire-store.svelte';
  import type { AuthStore } from '@/lib/auth/auth-store.svelte';

  const repertoire = getContext<RepertoireStore>('repertoire');
  const auth = getContext<AuthStore>('auth');

  interface Props {
    state: StateFrom<typeof appMachine>;
    send: (event: AppEvent) => void;
    dictionary: Dictionary;
    sessionActor: Actor<typeof sessionMachine> | undefined;
  }

  const { state, send, dictionary, sessionActor }: Props = $props();

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
  <TrainingScene {sessionActor} {fingerLayout} physicalLayout={physicalLayoutANSI} cursorType={$settings.cursorType} cursorMode={$settings.cursorMode} />

{:else if inState({ snapshot: state, value: 'sessionComplete' }) && lessonStats}
  <LessonStatsDisplay stats={lessonStats} {dictionary} />
  <RepertoireProgress
    snapshot={repertoire.snapshot}
    grew={repertoire.grew}
    isGuest={auth.state.status === 'guest'}
    {dictionary}
  />
{:else if inState({ snapshot: state, value: { training: 'paused' } })}
  <h2 class="screen-title pause">{dictionary.app.pause}</h2>
{:else if inState({ snapshot: state, value: 'menu' })}
  <MenuScreen
    {dictionary}
    onStart={({ symbolLayoutId }) => send({ type: 'START_TRAINING', symbolLayoutId })}
  />
{/if}

<style>
  .screen-title {
    font-size: 1.5rem;
    font-weight: 700;
  }

  .pause {
    color: var(--main-content-pause-color);
  }
</style>
