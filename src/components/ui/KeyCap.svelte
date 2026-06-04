<script lang="ts">
  import type {
    KeyCapColorGroup,
    KeyCapHomeKeyMarker,
    KeyCapNavigationArrow,
    KeyCapNavigationRole,
    KeyCapSymbolSize,
    KeyCapUnitWidth,
  } from '$interfaces/types';
  import NavArrow from './NavArrow.svelte';

  interface Props {
    symbol: string;
    keyCapId?: string;
    pressResult?: 'NONE' | 'CORRECT' | 'ERROR';
    visibility?: 'VISIBLE' | 'INVISIBLE';
    isActive?: boolean;
    isHomeKey?: boolean;
    fingerId?: string;
    unitWidth?: KeyCapUnitWidth;
    symbolSize?: KeyCapSymbolSize;
    colorGroup?: KeyCapColorGroup;
    homeKeyMarker?: KeyCapHomeKeyMarker;
    navigationRole?: KeyCapNavigationRole;
    navigationArrow?: KeyCapNavigationArrow;
  }

  let {
    symbol,
    keyCapId,
    pressResult = 'NONE',
    visibility = 'VISIBLE',
    isActive = false,
    isHomeKey = false,
    fingerId,
    unitWidth = '1U',
    symbolSize = 'MD',
    colorGroup = 'PRIMARY',
    homeKeyMarker = 'NONE',
    navigationRole = 'NONE',
    navigationArrow = 'NONE',
  }: Props = $props();

  let unitMultiplier = $derived(parseFloat(unitWidth));
</script>

<div
  class="keycap size-{symbolSize} color-{colorGroup} marker-{homeKeyMarker}"
  class:CORRECT={pressResult === 'CORRECT'}
  class:ERROR={pressResult === 'ERROR'}
  class:active={isActive}
  class:home={isHomeKey}
  class:INVISIBLE={visibility === 'INVISIBLE'}
  class:role-target={navigationRole === 'TARGET'}
  class:role-path={navigationRole === 'PATH'}
  data-finger-id={fingerId}
  data-keycap-id={keyCapId}
  data-navigation-role={navigationRole}
  data-navigation-arrow={navigationArrow}
  style:--unit-multiplier={unitMultiplier}
>
  <span class="keycap-label">{symbol}</span>

  <div class="keycap-marker"></div>

  <NavArrow direction={navigationArrow} />

  <!-- Center point anchor used by HandsExt positioning logic -->
  <div class="keycap-center-point"></div>
</div>

<style>
  .keycap {
    --keycap-unit: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    flex-shrink: 0;
    box-sizing: border-box;
    border-radius: var(--radius-sm);
    height: 32px;
    width: calc(var(--keycap-unit) * var(--unit-multiplier, 1));
    padding: 0 var(--spacing-2);
    background-color: transparent;
    border: 1px solid transparent;
    color: var(--color-keycap-label);
    font-weight: 200;
    user-select: none;
  }

  .keycap.INVISIBLE {
    visibility: hidden;
  }

  /* --- Symbol size --- */
  .size-MD .keycap-label { font-size: 13px; }
  .size-SM .keycap-label { font-size: 11px; }
  .size-XS .keycap-label { font-size: 9px; }

  /* --- Color group --- */
  .color-SECONDARY {
    background-color: var(--color-keycap-secondary-bg);
    color: var(--color-keycap-secondary-fg);
    border-color: var(--color-keycap-secondary-border);
  }

  .color-ACCENT {
    background-color: var(--color-keycap-accent-bg);
    color: var(--color-keycap-accent-fg);
    border-color: var(--color-keycap-accent-border);
  }

  /* --- Per-finger color --- */
  .keycap[data-finger-id="L1"],
  .keycap[data-finger-id="R1"] {
    background-color: var(--color-keycap-group-neutral-bg);
    border-color: var(--color-keycap-group-neutral-border);
  }
  .keycap[data-finger-id="L2"],
  .keycap[data-finger-id="R2"] {
    background-color: var(--color-keycap-group-yellow-bg);
    border-color: var(--color-keycap-group-yellow-border);
  }
  .keycap[data-finger-id="L3"],
  .keycap[data-finger-id="R3"] {
    background-color: var(--color-keycap-group-sky-bg);
    border-color: var(--color-keycap-group-sky-border);
  }
  .keycap[data-finger-id="L4"],
  .keycap[data-finger-id="R4"] {
    background-color: var(--color-keycap-group-indigo-bg);
    border-color: var(--color-keycap-group-indigo-border);
  }
  .keycap[data-finger-id="L5"],
  .keycap[data-finger-id="R5"] {
    background-color: var(--color-keycap-group-purple-bg);
    border-color: var(--color-keycap-group-purple-border);
  }

  /* --- Home key ring --- */
  .keycap.home {
    box-shadow: 0 0 0 2px var(--color-keycap-label);
  }

  /* --- Navigation role (overridden by press result below) --- */
  .keycap.role-path {
    box-shadow: 0 0 0 4px var(--color-keycap-label);
    font-weight: 700;
  }

  .keycap.role-target {
    background-color: var(--color-keycap-role-target-bg);
    color: var(--color-keycap-role-target-fg);
    box-shadow: 0 0 0 4px var(--color-keycap-role-target-bg);
    font-weight: 900;
  }

  /* --- Press result (takes precedence over navigation role) --- */
  .keycap.CORRECT {
    background-color: var(--color-keycap-correct-bg);
    color: var(--color-keycap-correct-fg);
    border-color: var(--color-keycap-correct-border);
    font-weight: 800;
  }

  .keycap.ERROR {
    background-color: var(--color-keycap-error-bg);
    color: var(--color-keycap-error-fg);
    border-color: var(--color-keycap-error-border);
    font-weight: 800;
  }

  .keycap.active,
  .keycap:active {
    transform: translateY(1px);
  }

  /* --- Home key marker --- */
  .keycap-marker {
    position: absolute;
    bottom: 2px;
    left: 50%;
    transform: translateX(-50%);
    background-color: var(--color-keycap-marker);
    border-radius: 9999px;
  }

  .marker-BAR .keycap-marker {
    width: 12px;
    height: 2px;
  }

  .marker-DOT .keycap-marker {
    width: 4px;
    height: 4px;
  }

  .marker-NONE .keycap-marker {
    visibility: hidden;
  }

  .keycap-center-point {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 2px;
    height: 2px;
    pointer-events: none;
  }
</style>
