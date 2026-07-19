<script lang="ts" module>
  export interface Option {
    value: string;
    label: string;
  }

  export interface OptionGroup {
    label: string;
    options: Option[];
  }
</script>

<script lang="ts">
  interface Props {
    value: string;
    options: (Option | OptionGroup)[];
    onChange: (value: string) => void;
  }

  const { value, options, onChange }: Props = $props();

  function itemKey(item: Option | OptionGroup): string {
    return 'options' in item ? `group:${item.label}` : `opt:${item.value}`;
  }
</script>

<div class="select-wrapper">
  <select class="select" {value} onchange={(e) => onChange(e.currentTarget.value)}>
    {#each options as item (itemKey(item))}
      {#if 'options' in item}
        <optgroup label={item.label}>
          {#each item.options as option (option.value)}
            <option value={option.value}>{option.label}</option>
          {/each}
        </optgroup>
      {:else}
        <option value={item.value}>{item.label}</option>
      {/if}
    {/each}
  </select>
</div>

<style>
  .select-wrapper {
    position: relative;
    display: block;
    width: 100%;
  }

  .select {
    appearance: none;
    width: 100%;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-3);
    padding: var(--spacing-1) var(--spacing-6) var(--spacing-1) var(--spacing-3);
    color: var(--color-text-primary);
    font-family: var(--font-sans);
    font-size: 0.875rem;
    cursor: pointer;
    background-image: none;
  }

  .select:focus {
    outline: 2px solid var(--color-border);
    outline-offset: 2px;
  }

  /* Mask-based стрелка: цвет тянется из токена и автоматически адаптируется к теме.
   * `-webkit-` prefix не нужен — Safari 15.4+ поддерживает `mask-*` без префикса. */
  .select-wrapper::after {
    content: '';
    position: absolute;
    right: var(--spacing-2);
    top: 50%;
    transform: translateY(-50%);
    width: 12px;
    height: 12px;
    background: var(--color-text-secondary);
    mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='12' height='12'%3E%3Cpath d='m6 9 6 6 6-6' fill='none' stroke='black' stroke-width='2'/%3E%3C/svg%3E");
    mask-repeat: no-repeat;
    mask-position: center;
    pointer-events: none;
  }
</style>
