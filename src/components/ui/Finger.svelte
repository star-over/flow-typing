<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    fingerId: string;
    isActive?: boolean;
    children?: Snippet;
  }

  let { fingerId, isActive = false, children }: Props = $props();
</script>

<div class="finger" class:active={isActive} data-finger-id={fingerId}>
  {@render children?.()}
</div>

<style>
  .finger {
    fill: var(--color-text-muted);
    transition: fill 0.1s ease;
  }

  .finger.active {
    fill: var(--color-warning);
  }
</style>
