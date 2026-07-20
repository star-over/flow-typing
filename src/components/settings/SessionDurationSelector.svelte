<script lang="ts">
  interface Props {
    label: string;
    value: number;
    options: { seconds: number; label: string }[];
    onChange: (seconds: number) => void;
  }

  const { label, value, options, onChange }: Props = $props();
</script>

<div class="duration-selector">
  <span class="label">{label}</span>
  <div class="segments" role="radiogroup" aria-label={label}>
    {#each options as option (option.seconds)}
      <button
        type="button"
        role="radio"
        aria-checked={value === option.seconds}
        class="segment"
        class:selected={value === option.seconds}
        onclick={() => onChange(option.seconds)}
      >
        {option.label}
      </button>
    {/each}
  </div>
</div>

<style>
  .duration-selector {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
  }

  .label {
    font-size: 0.8125rem;
    color: var(--color-text-secondary);
  }

  .segments {
    display: flex;
    gap: var(--spacing-1);
  }

  .segment {
    flex: 1;
    padding: var(--spacing-1) var(--spacing-2);
    font-size: var(--font-size-xs);
    font-family: var(--font-sans);
    color: var(--color-text-primary);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-3);
    cursor: pointer;
  }

  .segment.selected {
    background: var(--color-brand-accent);
    color: var(--color-cursor-foreground);
    border-color: var(--color-brand-accent);
  }

  .segment:hover:not(.selected) {
    opacity: 0.8;
  }

  .segment:focus-visible {
    outline: 2px solid var(--color-border);
    outline-offset: 2px;
  }
</style>
