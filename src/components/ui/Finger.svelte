<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { FingerId, FingerState } from '@/interfaces/types';
  import { FINGER_PATHS, HAND_VIEW_BOX } from '@/data/finger-paths';

  interface Props {
    fingerId: FingerId;
    state?: FingerState;
    isActive?: boolean;
    /** Если передан — заменяет встроенный SVG-путь пальца (например, для встраивания в общий SVG руки). */
    children?: Snippet;
  }

  let { fingerId, state = 'NONE', isActive = false, children }: Props = $props();

  const partKey = $derived(fingerId.slice(1) as keyof typeof FINGER_PATHS);
  const isRightHand = $derived(fingerId.startsWith('R'));
  const path = $derived(FINGER_PATHS[partKey]);
  const fingerNum = $derived(fingerId.slice(1));
</script>

{#if children}
  <g class="finger" class:active={isActive} data-finger-id={fingerId} data-finger-state={state}>
    {@render children()}
  </g>
{:else}
  <svg
    class="finger-svg"
    class:active={isActive}
    class:mirrored={isRightHand}
    viewBox={HAND_VIEW_BOX}
    xmlns="http://www.w3.org/2000/svg"
    data-finger-id={fingerId}
    data-finger-state={state}
    role="img"
    aria-label={`Finger ${fingerId}`}
  >
    <path class="finger finger-{fingerNum}" class:active={isActive} d={path} />
  </svg>
{/if}

<style>
  .finger-svg {
    display: block;
    width: 281px;
    height: auto;
  }

  .finger-svg.mirrored {
    transform: scaleX(-1);
  }

  /* --- Per-finger TARGET colors --- */
  [data-finger-state="TARGET"] .finger-1 { fill: #facc15; } /* yellow-400 */
  [data-finger-state="TARGET"] .finger-2 { fill: #fb923c; } /* orange-400 */
  [data-finger-state="TARGET"] .finger-3 { fill: #4ade80; } /* green-400 */
  [data-finger-state="TARGET"] .finger-4 { fill: #60a5fa; } /* blue-400 */
  [data-finger-state="TARGET"] .finger-5 { fill: #c084fc; } /* purple-400 */
  [data-finger-state="TARGET"] .finger-B { fill: #fff7ed; } /* orange-50 */

  /* --- State-based fill (fallback when no per-finger class match) --- */
  [data-finger-state="NONE"] .finger { fill: #e5e7eb; }     /* gray-200 */
  [data-finger-state="INACTIVE"] .finger { fill: #fff7ed; } /* orange-50 */
  [data-finger-state="ERROR"] .finger { fill: #e11d48; }    /* rose-600 */

  .finger {
    transition: fill 0.1s ease;
  }

  .finger.active {
    fill: #f59e0b;
  }
</style>
