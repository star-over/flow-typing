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
    color: #4b5563;
  }

  .CORRECT {
    color: #166534;
  }

  .CORRECTED {
    color: #881337;
  }

  .ERROR {
    color: #ca8a04;
  }

  .ERRORS {
    color: #be123c;
  }
</style>
