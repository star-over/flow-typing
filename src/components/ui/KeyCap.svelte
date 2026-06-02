<script lang="ts">
  interface Props {
    symbol: string;
    pressResult?: 'NONE' | 'CORRECT' | 'ERROR';
    visibility?: 'VISIBLE' | 'INVISIBLE';
    isActive?: boolean;
    fingerId?: string;
  }

  let {
    symbol,
    pressResult = 'NONE',
    visibility = 'VISIBLE',
    isActive = false,
    fingerId,
  }: Props = $props();
</script>

<div
  class="keycap"
  class:CORRECT={pressResult === 'CORRECT'}
  class:ERROR={pressResult === 'ERROR'}
  class:active={isActive}
  class:INVISIBLE={visibility === 'INVISIBLE'}
  data-finger-id={fingerId}
>
  <span class="symbol">{symbol}</span>
</div>

<style>
  .keycap {
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    border-radius: var(--radius-sm);
    height: 32px;
    min-width: 32px;
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
</style>
