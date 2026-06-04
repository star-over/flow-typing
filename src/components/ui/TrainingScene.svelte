<script lang="ts">
  import type { Actor } from 'xstate';
  import type { trainingMachine } from '$machines/training.machine';
  import type { Dictionary, FingerLayout, KeyboardLayout } from '$interfaces/types';

  import { createKeyboardGraph } from '$lib/pathfinding';
  import { createKeyCoordinateMap } from '$lib/layout-utils';
  import { generateHandsSceneViewModel } from '$lib/viewModel-builder';
  import { getPressResult } from '$lib/press-result-utils';
  import { getSymbolLayout } from '$data/layouts/layouts';

  import FlowLine from './FlowLine.svelte';
  import HandsExt from './HandsExt.svelte';

  interface Props {
    trainingActor: Actor<typeof trainingMachine>;
    fingerLayout: FingerLayout;
    keyboardLayout: KeyboardLayout;
    dictionary: Dictionary;
  }

  let { trainingActor, fingerLayout, keyboardLayout, dictionary }: Props = $props();

  // svelte-ignore state_referenced_locally
  let trainingState = $state(trainingActor.getSnapshot());

  $effect(() => {
    trainingState = trainingActor.getSnapshot();
    const sub = trainingActor.subscribe((s) => {
      trainingState = s;
    });
    return () => sub.unsubscribe();
  });

  let stream = $derived(trainingState.context.stream);
  let currentIndex = $derived(trainingState.context.currentIndex);
  let keyboardLayoutPreference = $derived(trainingState.context.keyboardLayout);

  let keyboardGraph = $derived(createKeyboardGraph(keyboardLayout));
  let keyCoordinateMap = $derived(createKeyCoordinateMap(keyboardLayout));
  let symbolLayout = $derived(getSymbolLayout(keyboardLayoutPreference));

  let viewModel = $derived(
    generateHandsSceneViewModel(
      stream?.[currentIndex],
      fingerLayout,
      keyboardGraph,
      keyCoordinateMap
    )
  );
  let pressResult = $derived(getPressResult(stream?.[currentIndex]));
</script>

<div class="training-scene">
  <h2 class="title">{dictionary.app.training_in_progress}</h2>
  <p>
    {dictionary.app.training_machine_state}
    <code class="state-code">{trainingState.value.toString()}</code>
  </p>

  <FlowLine
    {stream}
    cursorPosition={currentIndex}
    {pressResult}
    isTyping={trainingState.matches('running')}
  />

  <HandsExt {viewModel} {fingerLayout} {keyboardLayout} {symbolLayout} />
</div>

<style>
  .training-scene {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-6);
    width: 100%;
  }

  .title {
    font-size: 1.5rem;
    font-weight: 700;
  }

  .state-code {
    font-family: var(--font-mono);
    background-color: var(--color-surface);
    padding: var(--spacing-1) var(--spacing-2);
    border-radius: var(--radius-sm);
  }
</style>
