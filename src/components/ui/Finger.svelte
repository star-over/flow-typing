<script lang="ts">
  import type { FingerId, FingerNavigationRole } from '@/interfaces/types';
  import { FINGER_CENTER_POINTS, FINGER_PATHS } from '@/data/finger-paths';

  interface Props {
    fingerId: FingerId;
    navigationRole?: FingerNavigationRole;
    /** Bound ref to the inner <circle> (HandsScene uses it to position key clusters).
        Stays null for LB/RB where the center point is not rendered. */
    centerRef?: SVGCircleElement | null;
  }

  let {
    fingerId,
    navigationRole = 'NONE',
    centerRef = $bindable(null),
  }: Props = $props();

  const partKey = $derived(fingerId.slice(1) as keyof typeof FINGER_PATHS);
  const path = $derived(FINGER_PATHS[partKey]);
  const fingerNum = $derived(fingerId.slice(1));
  const centerPoint = $derived(
    fingerId in FINGER_CENTER_POINTS
      ? FINGER_CENTER_POINTS[fingerId as keyof typeof FINGER_CENTER_POINTS]
      : null
  );
</script>

<g data-finger-id={fingerId} data-finger-navigation-role={navigationRole} data-finger-num={fingerNum}>
  <path class="finger" d={path} />
  {#if centerPoint}
    <circle bind:this={centerRef} cx={centerPoint.cx} cy={centerPoint.cy} r="2" class="finger-center-point" />
  {/if}
</g>

<style>
  .finger {
    fill: var(--color-finger-idle);
    transition: fill 0.1s ease;
  }

  /* TARGET — colored per finger position */
  [data-finger-navigation-role="TARGET"][data-finger-num="1"] .finger { fill: var(--color-finger-1); }
  [data-finger-navigation-role="TARGET"][data-finger-num="2"] .finger { fill: var(--color-finger-2); }
  [data-finger-navigation-role="TARGET"][data-finger-num="3"] .finger { fill: var(--color-finger-3); }
  [data-finger-navigation-role="TARGET"][data-finger-num="4"] .finger { fill: var(--color-finger-4); }
  [data-finger-navigation-role="TARGET"][data-finger-num="5"] .finger { fill: var(--color-finger-5); }
  [data-finger-navigation-role="TARGET"][data-finger-num="B"] .finger { fill: var(--color-finger-base); }

  [data-finger-navigation-role="INACTIVE"] .finger { fill: var(--color-finger-inactive); }
  [data-finger-navigation-role="NONE"] .finger { fill: var(--color-finger-idle); }
  [data-finger-navigation-role="ERROR"] .finger { fill: var(--color-finger-error); }

  /* Center-point fill is controlled by a custom property on an ancestor
     (HandsScene toggles --center-point-fill based on centerPointVisibility). */
  .finger-center-point {
    fill: var(--center-point-fill, transparent);
  }
</style>
