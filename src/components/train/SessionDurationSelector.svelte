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
    color: var(--settings-page-label-color);
  }

  .segments {
    display: flex;
    gap: var(--spacing-1);
  }

  .segment {
    flex: 1;
    padding: var(--spacing-1) var(--spacing-2);
    font-size: 0.75rem;
    font-family: var(--font-sans);
    color: var(--select-color);
    background: var(--select-background);
    border: var(--select-border);
    border-radius: var(--radius-3);
    cursor: pointer;
  }

  .segment.selected {
    background: var(--landing-cta-background);
    color: var(--landing-cta-color);
    border-color: var(--landing-cta-background);
  }

  .segment:hover:not(.selected) {
    opacity: 0.8;
  }

  .segment:focus-visible {
    outline: var(--select-focus-outline);
    outline-offset: 2px;
  }
</style>
