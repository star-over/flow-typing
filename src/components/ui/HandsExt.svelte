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
  import { LEFT_HAND_FINGERS, RIGHT_HAND_FINGERS } from '$interfaces/types';
  import { calculateClusterTranslation } from '$lib/positioning-utils';
  import { generateVirtualLayoutForFinger } from '$lib/viewModel-builder';
  import { FINGER_PATHS, HAND_VIEW_BOX } from '$data/finger-paths';
  import VirtualKeyboard from './VirtualKeyboard.svelte';

  const part1 = FINGER_PATHS['1'];
  const part2 = FINGER_PATHS['2'];
  const part3 = FINGER_PATHS['3'];
  const part4 = FINGER_PATHS['4'];
  const part5 = FINGER_PATHS['5'];
  const partB = FINGER_PATHS.B;

  const FINGER_IDS_FOR_RENDER: FingerId[] = [...LEFT_HAND_FINGERS, ...RIGHT_HAND_FINGERS];

  interface Props {
    viewModel: HandsSceneViewModel;
    fingerLayout: FingerLayout;
    keyboardLayout: KeyboardLayout;
    symbolLayout: SymbolLayout;
    class?: string;
    centerPointVisibility?: Visibility;
  }

  let {
    viewModel,
    fingerLayout,
    keyboardLayout,
    symbolLayout,
    class: className = '',
    centerPointVisibility = 'INVISIBLE',
  }: Props = $props();

  // Per-finger derived states for CSS styling
  const fingerStates = $derived(
    Object.fromEntries(
      Object.entries(viewModel).map(([fingerId, fingerSceneState]) => [
        fingerId,
        (fingerSceneState as { fingerState: FingerState }).fingerState,
      ])
    ) as Record<FingerId, FingerState>
  );

  // Refs for cluster keyboard containers (keyed by FingerId)
  let keyboardRefs: Partial<Record<FingerId, HTMLDivElement | null>> = $state({});

  // Positioning effect: runs on viewModel or fingerLayout change
  $effect(() => {
    // Reactive read to trigger on changes
    const _vm = viewModel;
    const _fl = fingerLayout;

    FINGER_IDS_FOR_RENDER.forEach((fingerId) => {
      const homeKeyEntry = _fl.find(
        (item) => item.fingerId === fingerId && item.isHomeKey
      );
      if (!homeKeyEntry) return;

      const homeKeyId = homeKeyEntry.keyCapId;
      const fingerElement = document.querySelector(
        `[data-finger-id="${fingerId}"] .finger-center-point`
      );
      const keyboardContainer = keyboardRefs[fingerId];

      if (fingerElement && keyboardContainer) {
        // If already positioned, just make it visible (prevents jump on re-render)
        if (keyboardContainer.style.transform) {
          keyboardContainer.style.visibility = 'visible';
          return;
        }

        // Search within this finger's container to avoid cross-finger matches
        const keyElement = keyboardContainer.querySelector(
          `[data-keycap-id="${homeKeyId}"] .keycap-center-point`
        );

        if (keyElement && keyboardContainer.parentElement) {
          const translation = calculateClusterTranslation(
            fingerElement,
            keyElement,
            keyboardContainer.parentElement
          );

          if (translation) {
            keyboardContainer.style.transform = `translate(${translation.deltaX}px, ${translation.deltaY}px)`;
            keyboardContainer.style.visibility = 'visible';
          }
        }
      }
    });
  });
</script>

<div class="hands-ext-root {className}">
  <!-- Hands SVG layer + cluster keyboards -->
  <div class="hands-layer" data-center-point-visibility={centerPointVisibility}>
    <!-- Left hand SVG -->
    <svg
      class="hand-svg"
      viewBox={HAND_VIEW_BOX}
      data-hand="left"
      data-state-L1={fingerStates['L1']}
      data-state-L2={fingerStates['L2']}
      data-state-L3={fingerStates['L3']}
      data-state-L4={fingerStates['L4']}
      data-state-L5={fingerStates['L5']}
      data-state-LB={fingerStates['LB']}
    >
      <g data-finger-id="L1">
        <path class="L1" d={part1} />
        <circle cx="270" cy="245" r="2" class="finger-center-point" />
      </g>
      <g data-finger-id="L2">
        <path class="L2" d={part2} />
        <circle cx="249" cy="48" r="2" class="finger-center-point" />
      </g>
      <g data-finger-id="L3">
        <path class="L3" d={part3} />
        <circle cx="176" cy="8" r="2" class="finger-center-point" />
      </g>
      <g data-finger-id="L4">
        <path class="L4" d={part4} />
        <circle cx="90" cy="16" r="2" class="finger-center-point" />
      </g>
      <g data-finger-id="L5">
        <path class="L5" d={part5} />
        <circle cx="15" cy="50" r="2" class="finger-center-point" />
      </g>
      <g data-finger-id="LB">
        <path class="LB" d={partB} />
      </g>
    </svg>

    <!-- Spacer between hands -->
    <div class="hand-spacer"></div>

    <!-- Right hand SVG (mirrored) -->
    <svg
      class="hand-svg hand-svg--mirrored"
      viewBox={HAND_VIEW_BOX}
      data-hand="right"
      data-state-R1={fingerStates['R1']}
      data-state-R2={fingerStates['R2']}
      data-state-R3={fingerStates['R3']}
      data-state-R4={fingerStates['R4']}
      data-state-R5={fingerStates['R5']}
      data-state-RB={fingerStates['RB']}
    >
      <g data-finger-id="R1">
        <path class="R1" d={part1} />
        <circle cx="270" cy="245" r="2" class="finger-center-point" />
      </g>
      <g data-finger-id="R2">
        <path class="R2" d={part2} />
        <!-- R2 uses cx=240 (matches source hands-ext.tsx) -->
        <circle cx="240" cy="48" r="2" class="finger-center-point" />
      </g>
      <g data-finger-id="R3">
        <path class="R3" d={part3} />
        <circle cx="176" cy="8" r="2" class="finger-center-point" />
      </g>
      <g data-finger-id="R4">
        <path class="R4" d={part4} />
        <circle cx="90" cy="16" r="2" class="finger-center-point" />
      </g>
      <g data-finger-id="R5">
        <path class="R5" d={part5} />
        <circle cx="15" cy="50" r="2" class="finger-center-point" />
      </g>
      <g data-finger-id="RB">
        <path class="RB" d={partB} />
      </g>
    </svg>

    <!--
      Cluster keyboards layer: rendered after SVGs so they appear on top (higher z).
    -->
    {#each FINGER_IDS_FOR_RENDER as fingerId}
      {#if viewModel[fingerId].fingerState !== 'NONE' && viewModel[fingerId].keyCapStates}
        {@const virtualLayout = generateVirtualLayoutForFinger(fingerId, viewModel, fingerLayout, keyboardLayout)}
        <div
          bind:this={keyboardRefs[fingerId]}
          data-cluster-id={fingerId}
          class="cluster-container"
          style="visibility: hidden;"
        >
          <VirtualKeyboard
            {virtualLayout}
            {keyboardLayout}
            {symbolLayout}
          />
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
    width: 16rem; /* equivalent to w-3xs (256px) */
  }

  .hand-svg--mirrored {
    transform: scaleX(-1);
  }

  .hand-spacer {
    width: 3rem; /* equivalent to w-12 gap between hands */
  }

  .cluster-container {
    position: absolute;
    top: 0;
    left: 0;
  }

  /* ------------------------------------------------------------------ */
  /* Finger fill colors per state                                         */
  /* Using data-state-* attributes on the SVG to drive per-finger fills  */
  /* ------------------------------------------------------------------ */

  /* Default (NONE state) */
  .hand-svg .L1, .hand-svg .L2, .hand-svg .L3,
  .hand-svg .L4, .hand-svg .L5, .hand-svg .LB,
  .hand-svg .R1, .hand-svg .R2, .hand-svg .R3,
  .hand-svg .R4, .hand-svg .R5, .hand-svg .RB {
    fill: #E5E7EB; /* gray-200 */
  }

  /* L1 */
  svg[data-state-L1="TARGET"] .L1 { fill: #FACC15; }  /* yellow-400 */
  svg[data-state-L1="INACTIVE"] .L1 { fill: #FFF7ED; } /* orange-50 */
  svg[data-state-L1="NONE"] .L1 { fill: #E5E7EB; }     /* gray-200 */
  svg[data-state-L1="ERROR"] .L1 { fill: #E11D48; }    /* rose-600 */

  /* L2 */
  svg[data-state-L2="TARGET"] .L2 { fill: #FB923C; }  /* orange-400 */
  svg[data-state-L2="INACTIVE"] .L2 { fill: #FFF7ED; }
  svg[data-state-L2="NONE"] .L2 { fill: #E5E7EB; }
  svg[data-state-L2="ERROR"] .L2 { fill: #E11D48; }

  /* L3 */
  svg[data-state-L3="TARGET"] .L3 { fill: #4ADE80; }  /* green-400 */
  svg[data-state-L3="INACTIVE"] .L3 { fill: #FFF7ED; }
  svg[data-state-L3="NONE"] .L3 { fill: #E5E7EB; }
  svg[data-state-L3="ERROR"] .L3 { fill: #E11D48; }

  /* L4 */
  svg[data-state-L4="TARGET"] .L4 { fill: #60A5FA; }  /* blue-400 */
  svg[data-state-L4="INACTIVE"] .L4 { fill: #FFF7ED; }
  svg[data-state-L4="NONE"] .L4 { fill: #E5E7EB; }
  svg[data-state-L4="ERROR"] .L4 { fill: #E11D48; }

  /* L5 */
  svg[data-state-L5="TARGET"] .L5 { fill: #C084FC; }  /* purple-400 */
  svg[data-state-L5="INACTIVE"] .L5 { fill: #FFF7ED; }
  svg[data-state-L5="NONE"] .L5 { fill: #E5E7EB; }
  svg[data-state-L5="ERROR"] .L5 { fill: #E11D48; }

  /* LB */
  svg[data-state-LB="TARGET"] .LB { fill: #FFF7ED; }  /* orange-50 (same as INACTIVE) */
  svg[data-state-LB="INACTIVE"] .LB { fill: #FFF7ED; }
  svg[data-state-LB="NONE"] .LB { fill: #E5E7EB; }
  svg[data-state-LB="ERROR"] .LB { fill: #E11D48; }

  /* R1 */
  svg[data-state-R1="TARGET"] .R1 { fill: #FACC15; }
  svg[data-state-R1="INACTIVE"] .R1 { fill: #FFF7ED; }
  svg[data-state-R1="NONE"] .R1 { fill: #E5E7EB; }
  svg[data-state-R1="ERROR"] .R1 { fill: #E11D48; }

  /* R2 */
  svg[data-state-R2="TARGET"] .R2 { fill: #FB923C; }
  svg[data-state-R2="INACTIVE"] .R2 { fill: #FFF7ED; }
  svg[data-state-R2="NONE"] .R2 { fill: #E5E7EB; }
  svg[data-state-R2="ERROR"] .R2 { fill: #E11D48; }

  /* R3 */
  svg[data-state-R3="TARGET"] .R3 { fill: #4ADE80; }
  svg[data-state-R3="INACTIVE"] .R3 { fill: #FFF7ED; }
  svg[data-state-R3="NONE"] .R3 { fill: #E5E7EB; }
  svg[data-state-R3="ERROR"] .R3 { fill: #E11D48; }

  /* R4 */
  svg[data-state-R4="TARGET"] .R4 { fill: #60A5FA; }
  svg[data-state-R4="INACTIVE"] .R4 { fill: #FFF7ED; }
  svg[data-state-R4="NONE"] .R4 { fill: #E5E7EB; }
  svg[data-state-R4="ERROR"] .R4 { fill: #E11D48; }

  /* R5 */
  svg[data-state-R5="TARGET"] .R5 { fill: #C084FC; }
  svg[data-state-R5="INACTIVE"] .R5 { fill: #FFF7ED; }
  svg[data-state-R5="NONE"] .R5 { fill: #E5E7EB; }
  svg[data-state-R5="ERROR"] .R5 { fill: #E11D48; }

  /* RB */
  svg[data-state-RB="TARGET"] .RB { fill: #FFF7ED; }
  svg[data-state-RB="INACTIVE"] .RB { fill: #FFF7ED; }
  svg[data-state-RB="NONE"] .RB { fill: #E5E7EB; }
  svg[data-state-RB="ERROR"] .RB { fill: #E11D48; }

  /* ------------------------------------------------------------------ */
  /* finger-center-point visibility                                       */
  /* ------------------------------------------------------------------ */
  .hands-layer[data-center-point-visibility="VISIBLE"] .finger-center-point {
    fill: #3B82F6; /* blue-500 */
  }

  .hands-layer[data-center-point-visibility="INVISIBLE"] .finger-center-point {
    fill: transparent;
  }
</style>
