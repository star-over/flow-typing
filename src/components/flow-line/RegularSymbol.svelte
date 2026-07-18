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

  .ONE_ERROR {
    color: var(--regular-symbol-one-error-color);
  }

  .MANY_ERRORS {
    color: var(--regular-symbol-many-errors-color);
  }
</style>
