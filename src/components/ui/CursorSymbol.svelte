<script lang="ts">
  import type { FlowLineCursorType } from '$interfaces/types';

  interface Props {
    symbol: string;
    cursorType?: FlowLineCursorType;
    isTyping?: boolean;
  }

  const { symbol, cursorType = 'RECTANGLE', isTyping = true }: Props = $props();
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

<span class="cursor-symbol">
  <span class="bar {cursorType}" class:visible aria-hidden="true"></span>
  <span class="char">{symbol}</span>
</span>

<style>
  .cursor-symbol {
    position: relative;
    display: inline-block;
  }

  .bar {
    position: absolute;
    left: 0;
    bottom: 0;
    background-color: var(--color-cursor-bg);
    opacity: 0;
    transition: opacity 0.1s;
  }

  .bar.visible {
    opacity: 1;
  }

  .bar.RECTANGLE {
    width: 100%;
    height: 100%;
  }

  .bar.VERTICAL {
    width: 4px;
    height: 100%;
  }

  .bar.UNDERSCORE {
    width: 100%;
    height: 4px;
  }

  .char {
    color: var(--color-cursor-fg);
    mix-blend-mode: difference;
  }
</style>
