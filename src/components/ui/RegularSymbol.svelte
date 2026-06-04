<script lang="ts">
  import type { FlowLineSymbolType } from '$interfaces/types';

  interface Props {
    symbol: string;
    symbolType?: FlowLineSymbolType;
    class?: string;
  }

  let { symbol, symbolType = 'PENDING', class: className = '' }: Props = $props();
</script>

<span class="symbol {symbolType} {className}">
  {symbol}
</span>

<style>
  .symbol {
    display: inline-block;
  }

  .PENDING {
    color: var(--color-symbol-pending);
  }

  .CORRECT {
    color: var(--color-symbol-correct);
  }

  .CORRECTED {
    color: var(--color-symbol-corrected);
  }

  .ERROR {
    color: var(--color-symbol-error);
  }

  .ERRORS {
    color: var(--color-symbol-errors);
  }
</style>
