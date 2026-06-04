<script lang="ts">
  import type {
    FingerId,
    FingerLayout,
    FingerState,
    HandsSceneViewModel,
    KeyboardLayout,
    SymbolLayout,
    Visibility,
  } from '$interfaces/types';
  import {
    LEFT_HAND_BASE,
    LEFT_HAND_FINGERS,
    RIGHT_HAND_BASE,
    RIGHT_HAND_FINGERS,
  } from '$interfaces/types';
  import { calculateClusterTranslation } from '$lib/positioning-utils';
  import { generateVirtualLayoutForFinger } from '$lib/viewModel-builder';
  import { HAND_VIEW_BOX } from '$data/finger-paths';
  import Finger from './Finger.svelte';
  import VirtualKeyboard from './VirtualKeyboard.svelte';

  const LEFT_HAND_IDS: FingerId[] = [...LEFT_HAND_FINGERS, LEFT_HAND_BASE];
  const RIGHT_HAND_IDS: FingerId[] = [...RIGHT_HAND_FINGERS, RIGHT_HAND_BASE];
  const ALL_FINGER_IDS: FingerId[] = [...LEFT_HAND_IDS, ...RIGHT_HAND_IDS];
  const FINGER_IDS_FOR_RENDER: FingerId[] = [...LEFT_HAND_FINGERS, ...RIGHT_HAND_FINGERS];

  const emptyRefMap = <T>(): Record<FingerId, T | null> =>
    Object.fromEntries(ALL_FINGER_IDS.map((id) => [id, null])) as Record<FingerId, T | null>;

  interface Props {
    viewModel: HandsSceneViewModel;
    fingerLayout: FingerLayout;
    keyboardLayout: KeyboardLayout;
    symbolLayout: SymbolLayout;
    class?: string;
    centerPointVisibility?: Visibility;
  }

  const {
    viewModel,
    fingerLayout,
    keyboardLayout,
    symbolLayout,
    class: className = '',
    centerPointVisibility = 'INVISIBLE',
  }: Props = $props();

  // Per-finger derived states for the <Finger> components
  const fingerStates = $derived(
    Object.fromEntries(
      Object.entries(viewModel).map(([fingerId, fingerSceneState]) => [
        fingerId,
        (fingerSceneState as { fingerState: FingerState }).fingerState,
      ])
    ) as Record<FingerId, FingerState>
  );

  // Refs (keyed by FingerId). All FingerIds are pre-initialised to null so that
  // `bind:` on a not-yet-mounted element doesn't trip Svelte's
  // props_invalid_value guard for $bindable props.
  const fingerCenterRefs: Record<FingerId, SVGCircleElement | null> = $state(emptyRefMap<SVGCircleElement>());
  const clusterRefs: Record<FingerId, HTMLDivElement | null> = $state(emptyRefMap<HTMLDivElement>());

  // Computed translations per finger; once set, reused across rerenders so the
  // cluster snaps into place without flicker when remounted.
  const clusterTranslations: Partial<Record<FingerId, { dx: number; dy: number }>> = $state({});

  $effect(() => {
    // Reactive reads to retrigger when the scene changes
    const _vm = viewModel;
    const _fl = fingerLayout;

    FINGER_IDS_FOR_RENDER.forEach((fingerId) => {
      if (clusterTranslations[fingerId]) return;

      const homeKeyEntry = _fl.find(
        (item) => item.fingerId === fingerId && item.isHomeKey
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

      const translation = calculateClusterTranslation(
        centerEl,
        keyEl,
        clusterEl.parentElement
      );
      if (translation) {
        clusterTranslations[fingerId] = { dx: translation.deltaX, dy: translation.deltaY };
      }
    });
  });
</script>

<div class="hands-ext-root {className}">
  <div class="hands-layer" data-center-point-visibility={centerPointVisibility}>
    <svg class="hand-svg" viewBox={HAND_VIEW_BOX} data-hand="left">
      {#each LEFT_HAND_IDS as fingerId (fingerId)}
        <Finger
          {fingerId}
          state={fingerStates[fingerId]}
          bind:centerRef={fingerCenterRefs[fingerId]}
        />
      {/each}
    </svg>

    <div class="hand-spacer"></div>

    <svg class="hand-svg hand-svg--mirrored" viewBox={HAND_VIEW_BOX} data-hand="right">
      {#each RIGHT_HAND_IDS as fingerId (fingerId)}
        <Finger
          {fingerId}
          state={fingerStates[fingerId]}
          bind:centerRef={fingerCenterRefs[fingerId]}
        />
      {/each}
    </svg>

    {#each FINGER_IDS_FOR_RENDER as fingerId (fingerId)}
      {#if viewModel[fingerId].fingerState !== 'NONE' && viewModel[fingerId].keyCapStates}
        {@const virtualLayout = generateVirtualLayoutForFinger(fingerId, viewModel, fingerLayout, keyboardLayout)}
        {@const t = clusterTranslations[fingerId]}
        <div
          bind:this={clusterRefs[fingerId]}
          data-cluster-id={fingerId}
          class="cluster-container"
          style:transform={t ? `translate(${t.dx}px, ${t.dy}px)` : undefined}
          style:visibility={t ? 'visible' : 'hidden'}
        >
          <VirtualKeyboard {virtualLayout} {keyboardLayout} {symbolLayout} />
        </div>
      {/if}
    {/each}
  </div>
</div>

<style>
  .hands-ext-root {
    position: relative;
    width: 100%;
    height: 100%;
    padding-top: 6rem;
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
    --center-point-fill: var(--color-path-highlight);
  }
  .hands-layer[data-center-point-visibility="INVISIBLE"] {
    --center-point-fill: transparent;
  }
</style>
