<script lang="ts">
  import type { FlowLineSymbolType } from '@/interfaces/types';

  interface Props {
    symbol: string;
    symbolType?: FlowLineSymbolType;
  }

  const { symbol, symbolType = 'PENDING' }: Props = $props();
</script>

<span class="symbol {symbolType}">
  {symbol}
</span>

<style>
  .symbol {
    display: inline-block;
  }

  .PENDING {
    color: var(--regular-symbol-pending-color);
  }

  .CORRECT {
    color: var(--regular-symbol-correct-color);
  }

  .CORRECTED {
    color: var(--regular-symbol-corrected-color);
  }

  .ERROR {
    color: var(--regular-symbol-error-color);
  }

  .ERRORS {
    color: var(--regular-symbol-errors-color);
  }
</style>
