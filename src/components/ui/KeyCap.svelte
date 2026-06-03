<script lang="ts">
  import type { KeyCapUnitWidth } from '$interfaces/types';

  interface Props {
    symbol: string;
    keyCapId?: string;
    pressResult?: 'NONE' | 'CORRECT' | 'ERROR';
    visibility?: 'VISIBLE' | 'INVISIBLE';
    isActive?: boolean;
    fingerId?: string;
    unitWidth?: KeyCapUnitWidth;
  }

  let {
    symbol,
    keyCapId,
    pressResult = 'NONE',
    visibility = 'VISIBLE',
    isActive = false,
    fingerId,
    unitWidth = '1U',
  }: Props = $props();

  let unitMultiplier = $derived(parseFloat(unitWidth));
</script>

<div
  class="keycap"
  class:CORRECT={pressResult === 'CORRECT'}
  class:ERROR={pressResult === 'ERROR'}
  class:active={isActive}
  class:INVISIBLE={visibility === 'INVISIBLE'}
  data-finger-id={fingerId}
  data-keycap-id={keyCapId}
  style:--unit-multiplier={unitMultiplier}
>
  <span class="symbol">{symbol}</span>
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
    background-color: var(--color-surface);
    border: 1px solid var(--color-border);
    color: var(--color-text-primary);
    font-size: 14px;
    font-weight: 500;
    transition: transform 0.05s ease, background-color 0.05s ease;
    user-select: none;
  }

  .keycap.INVISIBLE {
    opacity: 0;
    pointer-events: none;
  }

  .keycap.CORRECT {
    font-weight: 800;
    background-color: var(--color-success-dim);
    border-color: var(--color-success);
  }

  .keycap.ERROR {
    font-weight: 800;
    background-color: var(--color-error-dim);
    border-color: var(--color-error);
  }

  .keycap.active,
  .keycap:active {
    transform: translateY(1px);
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
