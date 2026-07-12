<script lang="ts">
  import type { Actor } from 'xstate';
  import type { sessionMachine } from '@/machines/session.machine';
  import type { FingerLayout, FlowLineCursorType, PhysicalLayout, TypingStream } from '@/interfaces/types';

  import { selectTrainingActor } from '@/machines/selectors';
  import { createKeyboardGraph } from '@/lib/pathfinding';
  import { createKeyCoordinateMap } from '@/lib/layout-utils';
  import { createHandsSceneViewModel } from '@/lib/hands-scene';
  import { enrichStreamSymbols, getPressResult } from '@/lib/typing-stream';
  import { getSymbolLayout } from '@/lib/layouts';

  import FlowLine from '@/components/flow-line/FlowLine.svelte';
  import HandsScene from '@/components/hands-scene/HandsScene.svelte';
  import RhythmChannel from '@/components/rhythm-channel/RhythmChannel.svelte';

  interface Props {
    sessionActor: Actor<typeof sessionMachine>;
    fingerLayout: FingerLayout;
    physicalLayout: PhysicalLayout;
    cursorType: FlowLineCursorType;
    /** Показывать «канал ритма» (opt-in настройка). */
    rhythmChannelEnabled: boolean;
    /** Локализованное доступное имя канала ритма. */
    rhythmAriaLabel: string;
    /** Локализованная надпись, пока первая порция ещё грузится. */
    loadingLabel: string;
  }

  const { sessionActor, fingerLayout, physicalLayout, cursorType, rhythmChannelEnabled, rhythmAriaLabel, loadingLabel }: Props = $props();

  // svelte-ignore state_referenced_locally
  let sessionState = $state(sessionActor.getSnapshot());
  $effect(() => {
    sessionState = sessionActor.getSnapshot();
    const sub = sessionActor.subscribe((s) => { sessionState = s; });
    return () => sub.unsubscribe();
  });

  // Первая порция ещё в пути (session.loading): показываем надпись вместо пустой
  // сцены (пустой FlowLine + простаивающие руки читались бы как «сломано»). Сбой
  // сети уводит сессию в error → sessionError-экран рисует MainContent, не здесь.
  const isLoading = $derived(sessionState.matches('loading'));

  // Вложенный training появляется после loading; терпим отсутствие.
  const trainingActor = $derived(selectTrainingActor(sessionState));

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

  const keyboardGraph = $derived(createKeyboardGraph(physicalLayout));
  const keyCoordinateMap = $derived(createKeyCoordinateMap(physicalLayout));
  const symbolLayout = $derived(getSymbolLayout(currentSymbolLayoutId));
  const currentSymbol = $derived(stream[currentIndex]);
  const handsScene = $derived(
    createHandsSceneViewModel({ currentStreamSymbol: currentSymbol, fingerLayout, symbolLayout, keyboardGraph, keyCoordinateMap })
  );
  // Только что завершённый символ (предыдущий): его ViewModel несёт CORRECT на цели
  // (последняя попытка верна) → HandsScene рисует «призрак» уходящего кластера зелёным.
  const previousSymbol = $derived(currentIndex > 0 ? stream[currentIndex - 1] : undefined);
  const outgoingHandsScene = $derived(
    previousSymbol
      ? createHandsSceneViewModel({ currentStreamSymbol: previousSymbol, fingerLayout, symbolLayout, keyboardGraph, keyCoordinateMap })
      : undefined
  );
  const pressResult = $derived(getPressResult(currentSymbol));
  const enrichedSymbols = $derived(enrichStreamSymbols(stream));
</script>

{#if isLoading}
  <div class="scene-loading">
    <p class="scene-loading__note">{loadingLabel}</p>
  </div>
{:else}
<div class="training-scene">
  {#if rhythmChannelEnabled}
    <!-- Канал ритма над строкой: маркер ритма в той же вертикали внимания, что и
         неподвижный курсор FlowLine («сейчас»), и ведёт взгляд сверху вниз к строке. -->
    <div class="rhythm-slot">
      <RhythmChannel beatIndex={currentIndex} ariaLabel={rhythmAriaLabel} />
    </div>
  {/if}

  <FlowLine
    symbols={enrichedSymbols}
    cursorPosition={currentIndex}
    {pressResult}
    {cursorType}
    blink={cursorBlink}
  />

  <div class="hands-slot">
    <HandsScene {handsScene} {outgoingHandsScene} {fingerLayout} {physicalLayout} {symbolLayout} advanceKey={currentIndex} />
  </div>
</div>
{/if}

<style>
  .scene-loading {
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;
    width: 100%;
    min-height: 0;
  }

  .scene-loading__note {
    color: var(--color-text-secondary);
  }

  .training-scene {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-6);
    width: 100%;
    /* Сцена забирает всю высоту .main вместо центрирования всего стека: это
       убирает пустой коридор над строкой (центрирование добавляло его симметрично
       сверху) и пришпиливает футер к низу — раньше блок [сцена + футер] был выше
       окна и футер уезжал под обрез. .main и прочие маршруты не тронуты. */
    flex: 1;
    min-height: 0;
  }

  /* Канал ритма подтягивается ближе к строке (перебивает часть scene-gap),
     чтобы читаться вплотную НАД FlowLine, а не висеть посреди сцены. */
  .rhythm-slot {
    width: 100%;
    margin-bottom: calc(var(--spacing-2) - var(--spacing-6));
  }

  /* Руки забирают остаток высоты сцены: на высоких экранах лишний воздух уходит
     ВНИЗ под руки (там невидим), а не зависает коридором над строкой; на низких —
     слот ужимается (min-height:0), руки штатно уходят за нижнюю кромку. */
  .hands-slot {
    width: 100%;
    flex: 1;
    min-height: 0;
  }
</style>
