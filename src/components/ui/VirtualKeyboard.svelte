<script lang="ts">
  import type { KeyboardLayout, SymbolLayout, VirtualLayout } from '@/interfaces/types';
  import { getLabel } from '@/lib/symbol-utils';
  import KeyCap from './KeyCap.svelte';

  interface Props {
    virtualLayout: VirtualLayout;
    keyboardLayout: KeyboardLayout;
    symbolLayout: SymbolLayout;
  }

  const { virtualLayout, keyboardLayout, symbolLayout }: Props = $props();
</script>

<div class="keyboard">
  {#each virtualLayout as row, rowIndex (rowIndex)}
    <div class="row">
      {#each row as virtualKey (virtualKey.keyCapId)}
        <KeyCap
          keyCapId={virtualKey.keyCapId}
          symbol={getLabel(virtualKey.keyCapId, symbolLayout, keyboardLayout)}
          pressResult={virtualKey.pressResult ?? 'NONE'}
          visibility={virtualKey.visibility ?? 'VISIBLE'}
          fingerId={virtualKey.fingerId}
          unitWidth={virtualKey.unitWidth}
          symbolSize={virtualKey.symbolSize}
          homeKeyMarker={virtualKey.homeKeyMarker}
          isHomeKey={virtualKey.isHomeKey}
          colorGroup={virtualKey.colorGroup}
          navigationRole={virtualKey.navigationRole}
          navigationArrow={virtualKey.navigationArrow}
        />
      {/each}
    </div>
  {/each}
</div>

<style>
  .keyboard {
    display: flex;
    flex-direction: column;
    width: fit-content;
    gap: var(--spacing-2);
    background-color: transparent;
  }

  .row {
    display: flex;
    flex-wrap: nowrap;
    gap: var(--spacing-3);
  }
</style>
