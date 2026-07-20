<script lang="ts">
  import type { KeyBinding } from '@/lib/commands/registry';
  import { isTouchOnlyDevice } from '@/lib/device';
  import { formatBinding, getPlatform } from '@/lib/platform';

  interface Props {
    binding: KeyBinding;
  }

  const { binding }: Props = $props();

  // Глифы модификаторов (⌘⌥⇧) не входят в unicode-range Geist Mono —
  // рендерим --font-sans, а не --font-mono (system-ui на Mac их покрывает).
  // aria-hidden: подсказка — визуальный дубль; сочетание для AT объявлено
  // aria-keyshortcuts на триггере (кнопка/пункт меню).
  const parts = $derived(formatBinding({ binding, platform: getPlatform() }));
  const touchOnly = isTouchOnlyDevice();
</script>

{#if !touchOnly}
  <span class="key-hint" aria-hidden="true">
    {#each parts as part, index (index)}
      <kbd class="key-hint__key">{part}</kbd>
    {/each}
  </span>
{/if}

<style>
  .key-hint {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-1);
  }

  /* Тихий хром (DESIGN.md): плоский бейдж на существующих ролях. */
  .key-hint__key {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.25rem;
    padding: 0.0625rem var(--spacing-1);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-2);
    background: var(--color-surface-accent);
    color: var(--color-text-muted);
    font-family: var(--font-sans);
    font-size: var(--font-size-xs);
    line-height: 1.3;
    user-select: none;
  }
</style>
