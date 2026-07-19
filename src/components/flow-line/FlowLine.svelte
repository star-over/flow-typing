<script lang="ts">
  import RegularSymbol from './RegularSymbol.svelte';
  import CursorSymbol from './CursorSymbol.svelte';
  import type { EnrichedStreamSymbol } from '@/lib/typing-stream';
  import type {
    KeyCapPressResult,
    FlowLineCursorType,
  } from '@/interfaces/types';

  interface Props {
    symbols: EnrichedStreamSymbol[];
    cursorPosition: number;
    pressResult?: KeyCapPressResult;
    cursorType?: FlowLineCursorType;
    blink?: boolean;
  }

  const {
    symbols,
    cursorPosition,
    pressResult = 'NONE',
    cursorType,
    blink = true,
  }: Props = $props();

  const completedCount = 100;
  const pendingCount = 100;

  const startCompleted = $derived(Math.max(0, cursorPosition - completedCount));
  const completedSymbols = $derived(symbols.slice(startCompleted, cursorPosition));
  // undefined для пустого потока или cursorPosition >= symbols.length — guard в JSX ниже.
  const cursorSymbol = $derived(symbols[cursorPosition]);
  const endPending = $derived(cursorPosition + 1 + pendingCount);
  const pendingSymbols = $derived(symbols.slice(cursorPosition + 1, endPending));
</script>

<div class="flow-line HALF {pressResult}">
  <div class="completed-symbols">
    {#each completedSymbols as symbol, i (startCompleted + i)}
      <RegularSymbol symbol={symbol.char} symbolType={symbol.type} />
    {/each}
  </div>

  <CursorSymbol {cursorType} {blink} symbol={cursorSymbol?.char ?? ''} />

  <div class="pending-symbols">
    {#each pendingSymbols as symbol, i (cursorPosition + 1 + i)}
      <RegularSymbol symbol={symbol.char} />
    {/each}
  </div>
</div>

<style>
  .flow-line {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100vw;
    font-family: var(--font-mono);
    font-size: 1.875rem;
    /* Рельс: только верх и низ (дорожка потока). Боковые борта не рисуем —
       строка тянется на 100vw, вертикали всё равно ушли бы за края экрана. */
    border-block: 2px solid var(--color-border);
    /* Ширина краевого растворения текста, в символах моноширинного шрифта:
       ушедшее тает у левой кромки, приходящее проявляется у правой — вместо
       резкого обрыва по overflow. Наследуется контейнерами символов. */
    --edge-fade: 7ch;
  }

  .completed-symbols {
    display: flex;
    justify-content: flex-end;
    white-space: nowrap;
    text-align: right;
    overflow: hidden;
    /* Ушедший текст тает у левой кромки (маска — трафарет по альфе, не цвет) */
    -webkit-mask-image: linear-gradient(to right, transparent, #000 var(--edge-fade));
    mask-image: linear-gradient(to right, transparent, #000 var(--edge-fade));
  }

  .pending-symbols {
    display: flex;
    justify-content: flex-start;
    white-space: pre;
    text-align: left;
    overflow: hidden;
    /* Приходящий текст проявляется из правой кромки */
    -webkit-mask-image: linear-gradient(to left, transparent, #000 var(--edge-fade));
    mask-image: linear-gradient(to left, transparent, #000 var(--edge-fade));
  }

  /* Cursor mode: always HALF */
  .HALF .completed-symbols { width: 50%; }
  .HALF .pending-symbols { width: 50%; }

  /* Press result variants */
  .NONE { background: transparent; }
  .CORRECT { background: var(--color-success-dim); }
  .ERROR { background: var(--color-error-dim); }
</style>
