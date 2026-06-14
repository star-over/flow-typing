<script lang="ts">
  import type { Actor } from 'xstate';
  import type { trainingMachine } from '@/machines/training.machine';
  import type { FingerLayout, FlowLineCursorMode, FlowLineCursorType, PhysicalLayout } from '@/interfaces/types';

  import { createKeyboardGraph } from '@/lib/pathfinding';
  import { createKeyCoordinateMap } from '@/lib/layout-utils';
  import { createHandsSceneViewModel } from '@/lib/hands-scene';
  import { getPressResult } from '@/lib/press-result-utils';
  import { getSymbolLayout } from '@/lib/layouts';
  import { enrichStreamSymbols } from '@/lib/stream-utils';

  import FlowLine from './FlowLine.svelte';
  import HandsScene from './HandsScene.svelte';

  interface Props {
    trainingActor: Actor<typeof trainingMachine>;
    fingerLayout: FingerLayout;
    physicalLayout: PhysicalLayout;
    cursorType: FlowLineCursorType;
    cursorMode: FlowLineCursorMode;
  }

  const { trainingActor, fingerLayout, physicalLayout, cursorType, cursorMode }: Props = $props();

  // svelte-ignore state_referenced_locally
  let trainingState = $state(trainingActor.getSnapshot());

  // Курсор мигает только в простое. Каждое нажатие (= эмиссия trainingActor,
  // машина меняет состояние лишь на KEY_PRESS) гасит мигание и перезапускает
  // таймер; через IDLE_BLINK_DELAY_MS без нового нажатия мигание включается.
  const IDLE_BLINK_DELAY_MS = 600;
  let cursorBlink = $state(false);
  let idleTimer: ReturnType<typeof setTimeout>;

  function bumpIdleTimer() {
    cursorBlink = false;
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { cursorBlink = true; }, IDLE_BLINK_DELAY_MS);
  }

  $effect(() => {
    trainingState = trainingActor.getSnapshot();
    bumpIdleTimer();
    const sub = trainingActor.subscribe((s) => {
      trainingState = s;
      bumpIdleTimer();
    });
    return () => {
      sub.unsubscribe();
      clearTimeout(idleTimer);
    };
  });

  const stream = $derived(trainingState.context.stream);
  const currentIndex = $derived(trainingState.context.currentIndex);
  const currentSymbolLayoutId = $derived(trainingState.context.currentSymbolLayoutId);

  const keyboardGraph = $derived(createKeyboardGraph(physicalLayout));
  const keyCoordinateMap = $derived(createKeyCoordinateMap(physicalLayout));
  const symbolLayout = $derived(getSymbolLayout(currentSymbolLayoutId));

  // Может быть undefined на одном кадре между завершающим correct-attempt
  // (assign currentIndex++) и переходом trainingMachine в lessonComplete.
  // Оба потребителя принимают undefined: createHandsSceneViewModel → idle scene,
  // getPressResult → 'NONE'.
  const currentSymbol = $derived(stream[currentIndex]);

  const handsScene = $derived(
    createHandsSceneViewModel({ currentStreamSymbol: currentSymbol, fingerLayout, keyboardGraph, keyCoordinateMap })
  );
  const pressResult = $derived(getPressResult(currentSymbol));

  // Готовый массив EnrichedStreamSymbol — FlowLine отрисовывает char+type
  // напрямую, не вызывая getSymbolChar/getSymbolType per-символ в template.
  const enrichedSymbols = $derived(enrichStreamSymbols(stream));
</script>

<div class="training-scene">
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
</style>
