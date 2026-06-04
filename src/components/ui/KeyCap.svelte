<script lang="ts">
  import type {
    KeyCapColorGroup,
    KeyCapHomeKeyMarker,
    KeyCapNavigationArrow,
    KeyCapNavigationRole,
    KeyCapSymbolSize,
    KeyCapUnitWidth,
  } from '$interfaces/types';

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

  const uid = $props.id();
  const gradientId = `keycap-arrow-grad-${uid}`;
  const maskId = `keycap-arrow-mask-${uid}`;
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

  {#if navigationArrow !== 'NONE'}
    <span class="nav-arrow {navigationArrow}" aria-hidden="true">
      <svg width="26" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
        <mask id={maskId} fill="white">
          <path fill-rule="evenodd" clip-rule="evenodd" d="M27 21L13.5 0L0 21H5.70578V28H20.9231V21H27Z" />
        </mask>
        <path fill-rule="evenodd" clip-rule="evenodd" d="M27 21L13.5 0L0 21H5.70578V28H20.9231V21H27Z" fill="#27AE60" fill-opacity="0.7" />
        <path fill-rule="evenodd" clip-rule="evenodd" d="M27 21L13.5 0L0 21H5.70578V28H20.9231V21H27Z" fill="url(#{gradientId})" fill-opacity="0.8" />
        <path d="M13.5 0L14.3412 -0.540758L13.5 -1.84926L12.6588 -0.540758L13.5 0ZM27 21V22H28.8317L27.8412 20.4592L27 21ZM0 21L-0.841178 20.4592L-1.83167 22H0V21ZM5.70578 21H6.70578V20H5.70578V21ZM5.70578 28H4.70578V29H5.70578V28ZM20.9231 28V29H21.9231V28H20.9231ZM20.9231 21V20H19.9231V21H20.9231ZM12.6588 0.540758L26.1588 21.5408L27.8412 20.4592L14.3412 -0.540758L12.6588 0.540758ZM0.841178 21.5408L14.3412 0.540758L12.6588 -0.540758L-0.841178 20.4592L0.841178 21.5408ZM5.70578 20H0V22H5.70578V20ZM6.70578 28V21H4.70578V28H6.70578ZM20.9231 27H5.70578V29H20.9231V27ZM19.9231 21V28H21.9231V21H19.9231ZM27 20H20.9231V22H27V20Z" fill="#2A9852" fill-opacity="0.2" mask="url(#{maskId})" />
        <defs>
          <linearGradient id={gradientId} x1="13.5" y1="0" x2="13.5" y2="28" gradientUnits="userSpaceOnUse">
            <stop stop-color="#24FF00" />
            <stop offset="1" stop-color="white" stop-opacity="0" />
          </linearGradient>
        </defs>
      </svg>
    </span>
  {/if}

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
    color: #0c4a6e;
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
    background-color: #f5f5f4;
    color: #a8a29c;
    border-color: #d6d3d1;
  }

  .color-ACCENT {
    background-color: #fff7ed;
    color: #fb923c;
    border-color: #fed7aa;
  }

  /* --- Per-finger color --- */
  .keycap[data-finger-id="L1"],
  .keycap[data-finger-id="R1"] {
    background-color: rgba(245, 245, 244, 0.7);
    border-color: #d6d3d1;
  }
  .keycap[data-finger-id="L2"],
  .keycap[data-finger-id="R2"] {
    background-color: rgba(254, 243, 199, 0.7);
    border-color: #fcd34d;
  }
  .keycap[data-finger-id="L3"],
  .keycap[data-finger-id="R3"] {
    background-color: rgba(224, 242, 254, 0.7);
    border-color: #7dd3fc;
  }
  .keycap[data-finger-id="L4"],
  .keycap[data-finger-id="R4"] {
    background-color: rgba(224, 231, 255, 0.7);
    border-color: #a5b4fc;
  }
  .keycap[data-finger-id="L5"],
  .keycap[data-finger-id="R5"] {
    background-color: rgba(243, 232, 255, 0.7);
    border-color: #d8b4fe;
  }

  /* --- Home key ring --- */
  .keycap.home {
    box-shadow: 0 0 0 2px #0c4a6e;
  }

  /* --- Navigation role (overridden by press result below) --- */
  .keycap.role-path {
    box-shadow: 0 0 0 4px #0c4a6e;
    font-weight: 700;
  }

  .keycap.role-target {
    background-color: rgba(8, 47, 73, 0.7);
    color: #f0f9ff;
    box-shadow: 0 0 0 4px rgba(8, 47, 73, 0.7);
    font-weight: 900;
  }

  /* --- Press result (takes precedence over navigation role) --- */
  .keycap.CORRECT {
    background-color: rgba(22, 101, 52, 0.8);
    color: #f0fdfa;
    border-color: #22c55e;
    font-weight: 800;
  }

  .keycap.ERROR {
    background-color: rgba(239, 68, 68, 0.8);
    color: #fef2f2;
    border-color: #f87171;
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
    background-color: #0f172a;
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

  /* --- Navigation arrow --- */
  .nav-arrow {
    position: absolute;
    line-height: 0;
    pointer-events: none;
    z-index: 10;
  }

  .nav-arrow.UP {
    top: -50%;
    left: 50%;
    transform: translateX(-50%) rotate(0deg);
  }

  .nav-arrow.DOWN {
    bottom: -50%;
    left: 50%;
    transform: translateX(-50%) rotate(180deg);
  }

  .nav-arrow.LEFT {
    top: 50%;
    left: -50%;
    transform: translateY(-50%) rotate(-90deg);
  }

  .nav-arrow.RIGHT {
    top: 50%;
    right: -50%;
    transform: translateY(-50%) rotate(90deg);
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
