<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';

  const {
    as = 'div',
    padding = 'md',
    children,
    ...rest
  }: HTMLAttributes<HTMLElement> & {
    as?: 'div' | 'section';
    padding?: 'none' | 'sm' | 'md';
    children: Snippet;
  } = $props();
</script>

<!-- `class="card"` стоит ПОСЛЕ `{...rest}`: компонент владеет своим классом —
     `class`, переданный вызывающим через rest, намеренно перекрывается; layout
     вызывающий задаёт через `style`. -->
<svelte:element
  this={as}
  {...rest}
  class="card"
  class:pad-sm={padding === 'sm'}
  class:pad-md={padding === 'md'}
>
  {@render children()}
</svelte:element>

<style>
  .card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-4);
  }
  .pad-sm { padding: var(--spacing-4); }
  .pad-md { padding: var(--spacing-6); }
</style>
