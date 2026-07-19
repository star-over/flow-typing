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
    color: var(--color-symbol-pending);
  }

  .CORRECT {
    color: var(--color-symbol-correct);
  }

  .CORRECTED {
    color: var(--color-symbol-corrected);
  }

  .ONE_ERROR {
    color: var(--color-symbol-one-error);
  }

  .MANY_ERRORS {
    color: var(--color-symbol-many-errors);
  }
</style>
