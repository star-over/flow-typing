<script lang="ts">
  import RegularSymbol from './RegularSymbol.svelte';
  import CursorSymbol from './CursorSymbol.svelte';
  import type { EnrichedStreamSymbol } from '@/lib/stream-utils';
  import type {
    KeyCapPressResult,
    FlowLineCursorType,
    FlowLineCursorMode,
  } from '@/interfaces/types';

  interface Props {
    symbols: EnrichedStreamSymbol[];
    cursorPosition: number;
    pressResult?: KeyCapPressResult;
    cursorType?: FlowLineCursorType;
    cursorMode?: FlowLineCursorMode;
    blink?: boolean;
  }

  const {
    symbols,
    cursorPosition,
    pressResult = 'NONE',
    cursorType,
    cursorMode = 'HALF',
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

<div class="flow-line {cursorMode} {pressResult}">
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
    border: var(--flow-line-border);
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
  .NONE { background: transparent; }
  .CORRECT { background: var(--flow-line-correct-background); }
  .ERROR { background: var(--flow-line-error-background); }
</style>
