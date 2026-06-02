<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { FingerId } from '@/interfaces/types';
  import { FINGER_PATHS, HAND_VIEW_BOX } from '@/data/finger-paths';

  interface Props {
    fingerId: FingerId;
    isActive?: boolean;
    /** Если передан — заменяет встроенный SVG-путь пальца (например, для встраивания в общий SVG руки). */
    children?: Snippet;
  }

  let { fingerId, isActive = false, children }: Props = $props();

  const partKey = $derived(fingerId.slice(1) as keyof typeof FINGER_PATHS);
  const isRightHand = $derived(fingerId.startsWith('R'));
  const path = $derived(FINGER_PATHS[partKey]);
</script>

{#if children}
  <g class="finger" class:active={isActive} data-finger-id={fingerId}>
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
    role="img"
    aria-label={`Finger ${fingerId}`}
  >
    <path class="finger" class:active={isActive} d={path} />
  </svg>
{/if}

<style>
  .finger-svg {
    display: block;
    width: 128px;
    height: auto;
  }

  .finger-svg.mirrored {
    transform: scaleX(-1);
  }

  .finger {
    fill: var(--color-text-muted);
    transition: fill 0.1s ease;
  }

  .finger.active {
    fill: var(--color-warning);
  }
</style>
