<script lang="ts">
  import type { Actor } from 'xstate';
  import type { sessionMachine } from '@/machines/session.machine';
  import type { trainingMachine } from '@/machines/training.machine';
  import type { FingerLayout, FlowLineCursorMode, FlowLineCursorType, PhysicalLayout, TypingStream } from '@/interfaces/types';

  import { createKeyboardGraph } from '@/lib/pathfinding';
  import { createKeyCoordinateMap } from '@/lib/layout-utils';
  import { createHandsSceneViewModel } from '@/lib/hands-scene';
  import { getPressResult } from '@/lib/press-result-utils';
  import { getSymbolLayout } from '@/lib/layouts';
  import { enrichStreamSymbols } from '@/lib/stream-utils';
  import { SESSION_DURATION_SECONDS } from '@/lib/session-config';

  import FlowLine from './FlowLine.svelte';
  import HandsScene from './HandsScene.svelte';
  import RhythmChannel from './RhythmChannel.svelte';

  interface Props {
    sessionActor: Actor<typeof sessionMachine>;
    fingerLayout: FingerLayout;
    physicalLayout: PhysicalLayout;
    cursorType: FlowLineCursorType;
    cursorMode: FlowLineCursorMode;
    /** Показывать «канал ритма» (opt-in настройка). */
    rhythmChannelEnabled: boolean;
    /** Локализованное доступное имя канала ритма. */
    rhythmAriaLabel: string;
  }

  const { sessionActor, fingerLayout, physicalLayout, cursorType, cursorMode, rhythmChannelEnabled, rhythmAriaLabel }: Props = $props();

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
  <p class="timer">{remainingSeconds}s</p>

  <FlowLine
    symbols={enrichedSymbols}
    cursorPosition={currentIndex}
    {pressResult}
    {cursorType}
    {cursorMode}
    blink={cursorBlink}
  />

  {#if rhythmChannelEnabled}
    <!-- Канал ритма крепится прямо под строкой: неподвижный курсор FlowLine
         читается как «сейчас», маркер ритма — в той же вертикали внимания. -->
    <div class="rhythm-slot">
      <RhythmChannel beatIndex={currentIndex} ariaLabel={rhythmAriaLabel} />
    </div>
  {/if}

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

  /* Обратный отсчёт сессии: примитивы темы достаточно, выделенный токен не нужен
     (визуальная чистка master убрала debug-токен TrainingScene). */
  .timer {
    font-family: var(--font-mono);
    font-size: 1.25rem;
    opacity: 0.7;
  }

  /* Канал ритма подтягивается ближе к строке (перебивает часть scene-gap),
     чтобы читаться «под FlowLine», а не висеть посреди сцены. */
  .rhythm-slot {
    width: 100%;
    margin-top: calc(var(--spacing-2) - var(--spacing-6));
  }
</style>
