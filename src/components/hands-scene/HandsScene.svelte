<script lang="ts">
  import type {
    FingerId,
    FingerLayout,
    FingerNavigationRole,
    HandsSceneViewModel,
    KeyCapId,
    PhysicalLayout,
    SymbolLayout,
    Visibility,
  } from '@/interfaces/types';
  import {
    LEFT_HAND_BASE,
    LEFT_HAND_FINGERS,
    RIGHT_HAND_BASE,
    RIGHT_HAND_FINGERS,
  } from '@/interfaces/types';
  import { calculateClusterTranslation } from '@/lib/positioning-utils';
  import { createKeyboardSceneForFinger } from '@/lib/keyboard-scene';
  import { createKeyLabelMap } from '@/lib/symbol-utils';
  import { getHomeKeyForFinger } from '@/lib/hand-utils';
  import { createKeyboardGraph, findOptimalPath } from '@/lib/pathfinding';
  import { HAND_VIEW_BOX } from '@/data/finger-paths';
  import Finger from './Finger.svelte';
  import KeyboardScene from './KeyboardScene.svelte';
  import MovementPath from './MovementPath.svelte';

  const LEFT_HAND_IDS: FingerId[] = [...LEFT_HAND_FINGERS, LEFT_HAND_BASE];
  const RIGHT_HAND_IDS: FingerId[] = [...RIGHT_HAND_FINGERS, RIGHT_HAND_BASE];
  const ALL_FINGER_IDS: FingerId[] = [...LEFT_HAND_IDS, ...RIGHT_HAND_IDS];
  const FINGER_IDS_FOR_RENDER: FingerId[] = [...LEFT_HAND_FINGERS, ...RIGHT_HAND_FINGERS];

  const emptyRefMap = <T>(): Record<FingerId, T | null> =>
    Object.fromEntries(ALL_FINGER_IDS.map((id) => [id, null])) as Record<FingerId, T | null>;

  interface Props {
    handsScene: HandsSceneViewModel;
    fingerLayout: FingerLayout;
    physicalLayout: PhysicalLayout;
    symbolLayout: SymbolLayout;
    centerPointVisibility?: Visibility;
  }

  const {
    handsScene,
    fingerLayout,
    physicalLayout,
    symbolLayout,
    centerPointVisibility = 'INVISIBLE',
  }: Props = $props();

  // Per-finger derived states for the <Finger> components
  const fingerNavigationRoles = $derived(
    Object.fromEntries(
      Object.entries(handsScene).map(([fingerId, fingerSceneState]) => [
        fingerId,
        (fingerSceneState as { navigationRole: FingerNavigationRole }).navigationRole,
      ])
    ) as Record<FingerId, FingerNavigationRole>
  );

  // Refs (keyed by FingerId). All FingerIds are pre-initialized to null so that
  // `bind:` on a not-yet-mounted element doesn't trip Svelte's
  // props_invalid_value guard for $bindable props.
  const fingerCenterRefs: Record<FingerId, SVGCircleElement | null> = $state(emptyRefMap<SVGCircleElement>());
  const clusterRefs: Record<FingerId, HTMLDivElement | null> = $state(emptyRefMap<HTMLDivElement>());

  // Computed translations per finger; once set, reused across rerenders so the
  // cluster snaps into place without flicker when remounted.
  const clusterTranslations: Partial<Record<FingerId, { dx: number; dy: number }>> = $state({});

  // Готовая map надписей клавиш — KeyboardScene не вызывает getLabel в template,
  // а читает уже посчитанные значения.
  const keyLabels = $derived(createKeyLabelMap({ physicalLayout, symbolLayout }));

  // Граф геометрии — для восстановления упорядоченного пути дом→цель в слое рендера
  // (тот же `findOptimalPath`, что использует ViewModel). Контракт ViewModel не трогаем.
  const keyboardGraph = $derived(createKeyboardGraph(physicalLayout));

  /** Упорядоченный путь дом→…→цель для целевого пальца (для анимации `MovementPath`). */
  function movementPathFor(fingerId: FingerId): KeyCapId[] {
    const finger = handsScene[fingerId];
    if (finger.navigationRole !== 'TARGET') return [];
    const homeKey = getHomeKeyForFinger({ fingerId, fingerLayout });
    const targetKey = (Object.keys(finger.keyCapStates) as KeyCapId[]).find(
      (k) => finger.keyCapStates[k]?.navigationRole === 'TARGET'
    );
    if (!homeKey || !targetKey) return [];
    return findOptimalPath({ startKey: homeKey, endKey: targetKey, graph: keyboardGraph });
  }

  $effect(() => {
    // Reactive reads to retrigger when the scene changes
    const _vm = handsScene;
    const _fl = fingerLayout;

    FINGER_IDS_FOR_RENDER.forEach((fingerId) => {
      if (clusterTranslations[fingerId]) return;

      const homeKeyEntry = _fl.find(
        (item) => item.fingerId === fingerId && item.home
      );
      if (!homeKeyEntry) return;

      const centerEl = fingerCenterRefs[fingerId];
      const clusterEl = clusterRefs[fingerId];
      if (!centerEl || !clusterEl || !clusterEl.parentElement) return;

      // Local lookup inside this cluster (not document-wide)
      const keyEl = clusterEl.querySelector(
        `[data-keycap-id="${homeKeyEntry.keyCapId}"] .keycap-center-point`
      );
      if (!keyEl) return;

      const translation = calculateClusterTranslation({
        fingerElement: centerEl,
        keyElement: keyEl,
        containerElement: clusterEl.parentElement,
      });
      if (translation) {
        clusterTranslations[fingerId] = { dx: translation.deltaX, dy: translation.deltaY };
      }
    });
  });
</script>

<div class="hands-scene-root">
  <div class="hands-layer" data-center-point-visibility={centerPointVisibility}>
    <svg class="hand-svg" viewBox={HAND_VIEW_BOX} data-hand="left">
      {#each LEFT_HAND_IDS as fingerId (fingerId)}
        <Finger
          {fingerId}
          navigationRole={fingerNavigationRoles[fingerId]}
          bind:centerRef={fingerCenterRefs[fingerId]}
        />
      {/each}
    </svg>

    <div class="hand-spacer"></div>

    <svg class="hand-svg hand-svg--mirrored" viewBox={HAND_VIEW_BOX} data-hand="right">
      {#each RIGHT_HAND_IDS as fingerId (fingerId)}
        <Finger
          {fingerId}
          navigationRole={fingerNavigationRoles[fingerId]}
          bind:centerRef={fingerCenterRefs[fingerId]}
        />
      {/each}
    </svg>

    {#each FINGER_IDS_FOR_RENDER as fingerId (fingerId)}
      {#if handsScene[fingerId].navigationRole === 'TARGET'}
        {@const keyboardScene = createKeyboardSceneForFinger({ fingerId, handsScene, fingerLayout, physicalLayout })}
        {@const t = clusterTranslations[fingerId]}
        {@const movementPath = movementPathFor(fingerId)}
        <div
          bind:this={clusterRefs[fingerId]}
          data-cluster-id={fingerId}
          class="cluster-container"
          style:transform={t ? `translate(${t.dx}px, ${t.dy}px)` : undefined}
          style:visibility={t ? 'visible' : 'hidden'}
        >
          <KeyboardScene {keyboardScene} {keyLabels} hideNavArrows />
          {#if movementPath.length >= 1}
            <MovementPath path={movementPath} {fingerId} />
          {/if}
        </div>
      {/if}
    {/each}
  </div>
</div>

<style>
  .hands-scene-root {
    position: relative;
    width: 100%;
    height: 100%;
    /* Поднято на 30px (6rem → 4.5rem при 1rem=20px): кластер и руки ближе к
       строке потока, меньше мёртвого воздуха между ритм-каналом и клавишами. */
    padding-top: 4.5rem;
    box-sizing: border-box;
  }

  .hands-layer {
    display: flex;
    width: 100vw;
    justify-content: center;
  }

  .hand-svg {
    width: 16rem;
  }

  .hand-svg--mirrored {
    transform: scaleX(-1);
  }

  .hand-spacer {
    width: 3rem;
  }

  .cluster-container {
    position: absolute;
    top: 0;
    left: 0;
  }

  /* Drive the finger-center-point fill via a custom property on the ancestor.
     The <Finger> component reads var(--center-point-fill, transparent). */
  .hands-layer[data-center-point-visibility="VISIBLE"] {
    --center-point-fill: var(--hands-center-point-fill);
  }
  .hands-layer[data-center-point-visibility="INVISIBLE"] {
    --center-point-fill: transparent;
  }
</style>
