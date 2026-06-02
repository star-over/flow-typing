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

<span class="cursor {cursorType}" class:visible>
  {symbol}
</span>

<style>
  .cursor {
    display: inline-block;
    color: var(--color-text-primary);
    opacity: 0;
    transition: opacity 0.1s;
  }

  .cursor.visible {
    opacity: 1;
  }

  .RECTANGLE {
    position: absolute;
    left: 0;
    bottom: 0;
    height: 100%;
    width: 100%;
    background-color: var(--color-text-primary);
  }

  .VERTICAL {
    position: absolute;
    left: 0;
    bottom: 0;
    height: 100%;
    width: 2px;
    background-color: var(--color-text-primary);
  }

  .UNDERSCORE {
    position: absolute;
    left: 0;
    bottom: 0;
    height: 2px;
    width: 100%;
    background-color: var(--color-text-primary);
  }
</style>
