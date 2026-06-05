<script lang="ts">
  import RegularSymbol from './RegularSymbol.svelte';
  import CursorSymbol from './CursorSymbol.svelte';
  import { getSymbolChar, getSymbolType } from '@/lib/stream-utils';
  import type {
    TypingStream,
    KeyCapPressResult,
    FlowLineCursorType,
    FlowLineCursorMode,
    FlowLineSize,
  } from '@/interfaces/types';

  interface Props {
    stream: TypingStream;
    cursorPosition: number;
    pressResult?: KeyCapPressResult;
    cursorType?: FlowLineCursorType;
    cursorMode?: FlowLineCursorMode;
    size?: FlowLineSize;
    isTyping?: boolean;
    class?: string;
  }

  const {
    stream,
    cursorPosition,
    pressResult = 'NONE',
    cursorType,
    cursorMode = 'HALF',
    size = 'MD',
    isTyping = false,
    class: className = '',
  }: Props = $props();

  const completedCount = 100;
  const pendingCount = 100;

  const startCompleted = $derived(Math.max(0, cursorPosition - completedCount));
  const completedSymbols = $derived(stream.slice(startCompleted, cursorPosition));
  // undefined для пустого потока или cursorPosition >= stream.length — guard в JSX ниже.
  const cursorSymbol = $derived(stream[cursorPosition]);
  const endPending = $derived(cursorPosition + 1 + pendingCount);
  const pendingSymbols = $derived(stream.slice(cursorPosition + 1, endPending));
</script>

<div class="flow-line {size} {cursorMode} {pressResult} {className}">
  <div class="completed-symbols">
    {#each completedSymbols as symbol, i (startCompleted + i)}
      <RegularSymbol symbol={getSymbolChar(symbol)} symbolType={getSymbolType(symbol)} />
    {/each}
  </div>

  <CursorSymbol {cursorType} {isTyping} symbol={cursorSymbol ? getSymbolChar(cursorSymbol) : ''} />

  <div class="pending-symbols">
    {#each pendingSymbols as symbol, i (cursorPosition + 1 + i)}
      <RegularSymbol symbol={getSymbolChar(symbol)} />
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
    border: 2px solid var(--color-cursor-border);
  }

  .completed-symbols {
    display: flex;
    justify-content: flex-end;
    white-space: nowrap;
    text-align: right;
    overflow: hidden;
  }

  .pending-symbols {
    display: flex;
    justify-content: flex-start;
    white-space: pre;
    text-align: left;
    overflow: hidden;
  }

  /* Size variants */
  .XS { font-size: 1.25rem; }
  .SM { font-size: 1.5rem; }
  .MD { font-size: 1.875rem; }
  .LG { font-size: 2.25rem; }
  .XL { font-size: 3rem; }

  /* Cursor mode variants */
  .HALF .completed-symbols { width: 50%; }
  .HALF .pending-symbols { width: 50%; }
  .THIRD .completed-symbols { width: 33.333%; }
  .THIRD .pending-symbols { width: 66.666%; }
  .QUARTER .completed-symbols { width: 25%; }
  .QUARTER .pending-symbols { width: 75%; }
  .DINAMIC .completed-symbols { min-width: 8.333%; }
  .DINAMIC .pending-symbols { min-width: 50%; }

  /* Press result variants */
  .NONE { background-color: transparent; }
  .CORRECT { background-color: var(--color-symbol-correct-bg); }
  .ERROR { background-color: var(--color-symbol-error-bg); }
</style>
