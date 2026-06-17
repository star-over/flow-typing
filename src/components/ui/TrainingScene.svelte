<script lang="ts">
  import type { Actor } from 'xstate';
  import type { sessionMachine } from '@/machines/session.machine';
  import type { trainingMachine } from '@/machines/training.machine';
  import type { Dictionary, FingerLayout, FlowLineCursorMode, FlowLineCursorType, PhysicalLayout, TypingStream } from '@/interfaces/types';

  import { createKeyboardGraph } from '@/lib/pathfinding';
  import { createKeyCoordinateMap } from '@/lib/layout-utils';
  import { createHandsSceneViewModel } from '@/lib/hands-scene';
  import { getPressResult } from '@/lib/press-result-utils';
  import { getSymbolLayout } from '@/lib/layouts';
  import { enrichStreamSymbols } from '@/lib/stream-utils';
  import { SESSION_DURATION_SECONDS } from '@/lib/session-config';

  import FlowLine from './FlowLine.svelte';
  import HandsScene from './HandsScene.svelte';

  interface Props {
    sessionActor: Actor<typeof sessionMachine>;
    fingerLayout: FingerLayout;
    physicalLayout: PhysicalLayout;
    cursorType: FlowLineCursorType;
    cursorMode: FlowLineCursorMode;
    dictionary: Dictionary;
  }

  const { sessionActor, fingerLayout, physicalLayout, cursorType, cursorMode, dictionary }: Props = $props();

  // svelte-ignore state_referenced_locally
  let sessionState = $state(sessionActor.getSnapshot());
  $effect(() => {
    sessionState = sessionActor.getSnapshot();
    const sub = sessionActor.subscribe((s) => { sessionState = s; });
    return () => sub.unsubscribe();
  });

  // Вложенный training появляется после loading; терпим отсутствие.
  const trainingActor = $derived(
    sessionState.children.training as Actor<typeof trainingMachine> | undefined
  );

  // svelte-ignore state_referenced_locally
  let trainingSnap = $state(trainingActor?.getSnapshot() ?? null);
  let cursorBlink = $state(false);
  let idleTimer: ReturnType<typeof setTimeout>;
  const IDLE_BLINK_DELAY_MS = 600;
  function bumpIdleTimer() {
    cursorBlink = false;
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { cursorBlink = true; }, IDLE_BLINK_DELAY_MS);
  }
  $effect(() => {
    const actor = trainingActor;
    if (!actor) { trainingSnap = null; return; }
    trainingSnap = actor.getSnapshot();
    bumpIdleTimer();
    const sub = actor.subscribe((s) => { trainingSnap = s; bumpIdleTimer(); });
    return () => { sub.unsubscribe(); clearTimeout(idleTimer); };
  });

  const stream: TypingStream = $derived(trainingSnap?.context.stream ?? []);
  const currentIndex = $derived(trainingSnap?.context.currentIndex ?? 0);
  const currentSymbolLayoutId = $derived(trainingSnap?.context.currentSymbolLayoutId ?? 'qwerty');

  const remainingSeconds = $derived(
    Math.max(0, SESSION_DURATION_SECONDS - Math.floor(sessionState.context.displayElapsedMs / 1000))
  );

  const keyboardGraph = $derived(createKeyboardGraph(physicalLayout));
  const keyCoordinateMap = $derived(createKeyCoordinateMap(physicalLayout));
  const symbolLayout = $derived(getSymbolLayout(currentSymbolLayoutId));
  const currentSymbol = $derived(stream[currentIndex]);
  const handsScene = $derived(
    createHandsSceneViewModel({ currentStreamSymbol: currentSymbol, fingerLayout, keyboardGraph, keyCoordinateMap })
  );
  const pressResult = $derived(getPressResult(currentSymbol));
  const enrichedSymbols = $derived(enrichStreamSymbols(stream));
</script>

<div class="training-scene">
  <h2 class="title">{dictionary.app.training_in_progress}</h2>
  <p class="timer"><code class="state-code">{remainingSeconds}s</code></p>

  <FlowLine
    symbols={enrichedSymbols}
    cursorPosition={currentIndex}
    {pressResult}
    {cursorType}
    {cursorMode}
    blink={cursorBlink}
  />

  <HandsScene {handsScene} {fingerLayout} {physicalLayout} {symbolLayout} />
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
    background: var(--training-scene-state-code-background);
    padding: var(--spacing-1) var(--spacing-2);
    border-radius: var(--radius-2);
  }
</style>
