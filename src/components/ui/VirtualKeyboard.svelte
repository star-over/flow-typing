<script lang="ts">
  import KeyCap from './KeyCap.svelte';

  interface KeyVM {
    symbol: string;
    pressResult?: 'NONE' | 'CORRECT' | 'ERROR';
    isActive?: boolean;
    fingerId?: string;
  }

  interface Props {
    keys: KeyVM[][];
  }

  let { keys }: Props = $props();
</script>

<div class="keyboard">
  {#each keys as row}
    <div class="row">
      {#each row as key}
        <KeyCap
          symbol={key.symbol}
          pressResult={key.pressResult}
          isActive={key.isActive}
          fingerId={key.fingerId}
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
