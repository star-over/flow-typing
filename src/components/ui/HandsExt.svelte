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
  import VirtualKeyboard from './VirtualKeyboard.svelte';

  // SVG paths for hand rendering
  const part1 = "M146.4 228c1.3-.7 5-.8 6.2.2 4.5 5 8.3 8.7 12.4 14 3.2 4 6.8 7 12 5.5 22.8-6.7 46.5-14.5 69.2-20.3 5.4-1.1 13.8.3 18.6 2 5.2 1.7 6.5 2.4 11 6.8 6.8 6.5 5.3 15.1-3.2 19.2-2.8 1.3-6 2-9 2.8-40.2 10.1-79 23.5-112 49.8-6 4.8-13.7 8-21.2 10.3-13.5 4.1-24.8-2.3-26.7-15a53 53 0 0 1 .6-20.1c6-25 17.7-44.3 42.1-55.3Z";
  const part2 = "M139.7 147.8c2-2.3 4-3.3 6.3-3.8 12.3-3 20-11.6 26.9-21.4 14.3-20.3 28.2-41 43.1-60.8A65 65 0 0 1 234.2 46c2-1.2 2.4-1.4 6.7-2.5 9.4-2.6 13.6 4 11.1 13.3a61 61 0 0 1-8.3 17c-19.5 29.9-39.3 59.5-58.9 89.4-5.1 7.9-9.4 16.4-14.3 24.5-4.3 7-6.6 6.8-10.6-.4l-20.2-36.8c-.5-.8-.4-1.8 0-2.7Z";
  const part3 = "M182.9 22.3c-5.2 16.7-30.4 85.5-35.6 102.2-2.2 7.2-1.7 15.4-2.2 23-.2 2.8.3 5.5.2 8.2 0 7.1-1.8 8.7-10.9 8.4a54.7 54.7 0 0 1-31.2-17.7c-3-3.1-3.2-7-.5-10.5 11-14.6 17.6-31.4 24.1-48.2 7.3-18.8 15.8-37.2 23.8-55.7a141 141 0 0 1 6.3-13c3.2-6 8.5-11.6 14.2-14.8 4.7-2.6 10.4.2 12 5.5a22 22 0 0 1-.2 12.6Z";
  const part4 = "M87.2 167.2c-12.4 1.3-26.2-7-32.6-17.1-4-6.5-3.7-10.5 2.1-15.3a23.7 23.7 0 0 0 8.8-17.6c1.8-23.8 3-47.8 5.8-71.5 1.2-10 4-20.6 8.3-29.3 2.3-4.7 7.6-8.2 13.5-6.2 5.6 1.8 7 6.8 6.8 12-.5 10.4-1.6 20.7-2 31-1 29.6-3.6 59.1 3 88.5 3.8 17.2 3.6 25.5-13.7 25.5Z";
  const part5 = "M16.2 144.6c1.6-18-6.7-36.4-9.9-55.7-1.6-9.7-2-19.6-2.3-29.5-.1-6 2.7-11.4 9-12.8a11 11 0 0 1 13 7.6c3.8 11 6.5 22.4 9.2 33.7a938 938 0 0 1 8.1 37c1.3 6.3 4.5 10.5 11 12.3 5.8 1.7 7.3 5.4 3.9 10.2a60.4 60.4 0 0 1-32.3 22.3c-5.7 1.7-9.1-1.4-9.6-8.1-.4-5-.1-10-.1-17Z";
  const partB = "M57.8 137.3c13.4 0 77 2.7 88.8 7.4 23 9 30.2 24.7 23.3 48.4a95 95 0 0 0-1.7 42c.4 4.1.6 5.2.5 9.4-.5 14.4-9.6 30.7-14.5 44.2-5.9 16.2-12.7 28.9-31.6 31.2l-25.5.3-21.2-2.9c-34.4-6.2-64.3-14.9-75-52.7-.7-6.9-.4-12.8.7-20.3l.6-3.8c4.2-24 8.8-47.9 12.5-72 2.6-16.5 12.3-25.4 27.7-29.1 5-1.2 10.2-1.6 15.4-2.1Z";

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
      viewBox="0 0 281 321"
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
      viewBox="0 0 281 321"
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
  }

  .hands-layer {
    display: flex;
    width: 100vw;
    justify-content: center;
    margin-top: 2.5rem;
  }

  .hand-svg {
    width: 128px; /* equivalent to w-3xs */
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
