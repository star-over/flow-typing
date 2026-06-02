<script lang="ts">
  import type { KeyboardLayout, SymbolLayout, VirtualLayout } from '$interfaces/types';
  import { getLabel } from '$lib/symbol-utils';
  import KeyCap from './KeyCap.svelte';

  interface Props {
    virtualLayout: VirtualLayout;
    keyboardLayout: KeyboardLayout;
    symbolLayout: SymbolLayout;
  }

  let { virtualLayout, keyboardLayout, symbolLayout }: Props = $props();
</script>

<div class="keyboard">
  {#each virtualLayout as row}
    <div class="row">
      {#each row as virtualKey}
        <KeyCap
          keyCapId={virtualKey.keyCapId}
          symbol={getLabel(virtualKey.keyCapId, symbolLayout, keyboardLayout)}
          pressResult={virtualKey.pressResult ?? 'NONE'}
          visibility={virtualKey.visibility ?? 'VISIBLE'}
          fingerId={virtualKey.fingerId}
        />
      {/each}
    </div>
  {/each}
</div>

<style>
  .keyboard {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-1);
    padding: var(--spacing-2);
    background-color: var(--color-surface);
    border-radius: var(--radius-md);
    border: 1px solid var(--color-border);
  }

  .row {
    display: flex;
    gap: var(--spacing-1);
    justify-content: center;
  }
</style>
