<script lang="ts">
  interface Option {
    value: string;
    label: string;
  }

  interface Props {
    value: string;
    options: Option[];
    onChange: (value: string) => void;
  }

  let { value, options, onChange }: Props = $props();
</script>

<div class="select-wrapper">
  <select class="select" {value} onchange={(e) => onChange(e.currentTarget.value)}>
    {#each options as option}
      <option value={option.value}>{option.label}</option>
    {/each}
  </select>
</div>

<style>
  .select-wrapper {
    position: relative;
    display: inline-block;
  }

  .select {
    appearance: none;
    background-color: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: var(--spacing-2) var(--spacing-6) var(--spacing-2) var(--spacing-3);
    color: var(--color-text-primary);
    font-family: var(--font-sans);
    font-size: 0.875rem;
    cursor: pointer;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23a3a3a3' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right var(--spacing-2) center;
  }

  .select:focus {
    outline: 2px solid var(--color-border);
    outline-offset: 2px;
  }
</style>
