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
    font-variant-numeric: tabular-nums;
  }

  .PENDING {
    color: var(--color-text-muted);
  }

  .CORRECT {
    color: var(--color-success);
  }

  .CORRECTED {
    color: var(--color-success-dark);
  }

  .ERROR {
    color: var(--color-warning);
  }

  .ERRORS {
    color: var(--color-error);
  }
</style>
