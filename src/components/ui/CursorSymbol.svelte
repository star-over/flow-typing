<script lang="ts">
  import type { FlowLineCursorType } from '$interfaces/types';

  interface Props {
    symbol: string;
    cursorType?: FlowLineCursorType;
    isTyping?: boolean;
  }

  let { symbol, cursorType = 'RECTANGLE', isTyping = true }: Props = $props();
  let visible = $state(true);
  let timer: ReturnType<typeof setInterval>;

  $effect(() => {
    if (isTyping) {
      visible = true;
      clearInterval(timer);
    } else {
      timer = setInterval(() => {
        visible = !visible;
      }, 600);
    }

    return () => clearInterval(timer);
  });
</script>

<span class="cursor">
  {symbol}
  <span class="bar {cursorType}" class:visible aria-hidden="true">
    {#if cursorType === 'RECTANGLE'}{symbol}{/if}
  </span>
</span>

<style>
  .cursor {
    position: relative;
    display: inline-block;
    color: var(--color-text-primary);
  }

  .bar {
    position: absolute;
    opacity: 0;
    transition: opacity 0.1s;
  }

  .bar.visible {
    opacity: 1;
  }

  .bar.RECTANGLE {
    inset: 0;
    background-color: var(--color-text-primary);
    color: var(--color-bg);
  }

  .bar.VERTICAL {
    left: 0;
    bottom: 0;
    width: 2px;
    height: 100%;
    background-color: var(--color-text-primary);
  }

  .bar.UNDERSCORE {
    left: 0;
    bottom: 0;
    width: 100%;
    height: 2px;
    background-color: var(--color-text-primary);
  }
</style>
