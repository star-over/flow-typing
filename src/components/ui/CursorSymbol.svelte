<script lang="ts">
  import type { FlowLineCursorType } from '@/interfaces/types';

  interface Props {
    symbol: string;
    cursorType?: FlowLineCursorType;
    blink?: boolean;
  }

  const { symbol, cursorType = 'RECTANGLE', blink = false }: Props = $props();
  let visible = $state(true);
  let timer: ReturnType<typeof setInterval>;

  $effect(() => {
    if (blink) {
      timer = setInterval(() => {
        visible = !visible;
      }, 600);
    } else {
      visible = true;
      clearInterval(timer);
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
    width: 0.15em;
    height: 100%;
  }

  .bar.UNDERSCORE {
    width: 100%;
    height: 0.15em;
  }

  .char {
    color: var(--color-cursor-fg);
    mix-blend-mode: difference;
  }
</style>
