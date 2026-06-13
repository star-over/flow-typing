<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import type { ComponentProps } from 'svelte';
  import Wordmark from './Wordmark.svelte';

  /**
   * Размер задаётся `font-size` контейнера — сам компонент масштаба не знает,
   * всё в em (см. Wordmark.svelte). Тема (light/dark/nord/sepia) переключается
   * глобальным переключателем темы в Storybook.
   */
  const { Story } = defineMeta({
    title: 'UI/Wordmark',
    component: Wordmark,
    args: { fadePending: true },
    argTypes: {
      fadePending: { control: 'boolean' },
    },
    parameters: { layout: 'centered' },
  });
</script>

{#snippet template(args: ComponentProps<typeof Wordmark>)}
  <span style="font-size: 40px;">
    <Wordmark fadePending={args.fadePending} />
  </span>
{/snippet}

<!-- Шапка: дефолтный масштаб с затуханием предстоящей части. -->
<Story name="Default" args={{ fadePending: true }} {template} />

<!-- Мелкий размер: затухание выключено, читаемость важнее (handoff-правило). -->
<Story name="Small (no fade)">
  <span style="font-size: 14px;"><Wordmark fadePending={false} /></span>
</Story>

<!-- Набор размеров для визуальной сверки с reference.html. -->
<Story name="Size ladder">
  <div style="display: flex; flex-direction: column; align-items: flex-start; gap: 2rem;">
    <span style="font-size: 40px;"><Wordmark /></span>
    <span style="font-size: 20px;"><Wordmark /></span>
    <span style="font-size: 14px;"><Wordmark fadePending={false} /></span>
  </div>
</Story>
