<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';

  interface ButtonProps extends Omit<HTMLButtonAttributes, 'type' | 'disabled' | 'class'> {
    variant?: 'neutral' | 'primary' | 'success' | 'danger' | 'ghost' | 'accent';
    size?: 'md' | 'lg';
    href?: string;
    type?: 'button' | 'submit';
    disabled?: boolean;
    children: Snippet;
  }

  const {
    variant = 'neutral',
    size = 'md',
    href,
    type = 'button',
    disabled = false,
    children,
    ...rest
  }: ButtonProps = $props();
</script>

<svelte:element
  this={href ? 'a' : 'button'}
  {...rest}
  class="button {variant} {size}"
  href={href || undefined}
  type={href ? undefined : type}
  disabled={href ? undefined : disabled}
>
  {@render children()}
</svelte:element>

<style>
  .button {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-2);
    border-radius: var(--radius-3);
    border: 1px solid transparent;
    font-family: var(--font-sans);
    cursor: pointer;
    text-decoration: none;
  }

  .button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  /* --- sizes --- */
  .md {
    padding: var(--spacing-2) var(--spacing-4);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
  }
  .lg {
    padding: var(--spacing-3) var(--spacing-6);
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-semibold);
  }

  /* --- variants --- */
  .neutral {
    background: var(--color-surface);
    color: var(--color-text-primary);
    border-color: var(--color-border);
  }
  .neutral:hover:not(:disabled) {
    background: var(--color-surface-hover);
  }

  .primary {
    background: var(--color-primary-background);
    color: var(--color-on-dense);
    border-color: var(--color-primary-background);
  }
  .primary:hover:not(:disabled) {
    background: var(--color-primary-hover);
    border-color: var(--color-primary-hover);
  }

  .success {
    background: var(--color-success);
    color: var(--color-on-dense);
    border-color: var(--color-success);
  }
  .success:hover:not(:disabled) {
    background: var(--color-success-hover);
    border-color: var(--color-success-hover);
  }

  .danger {
    background: var(--color-error);
    color: var(--color-on-dense);
    border-color: var(--color-error);
  }
  .danger:hover:not(:disabled) {
    background: var(--color-error-hover);
    border-color: var(--color-error-hover);
  }

  .ghost {
    background: transparent;
    color: var(--color-text-primary);
    border-color: var(--color-text-secondary);
  }
  .ghost:hover:not(:disabled) {
    border-color: var(--color-text-primary);
  }

  .accent {
    background: var(--color-brand-accent);
    color: var(--color-cursor-foreground);
    border-color: transparent;
  }
  .accent:hover:not(:disabled) {
    background: var(--color-brand-accent-hover);
  }
  .accent:active:not(:disabled) {
    transform: translateY(1px);
  }

  /* --- focus --- */
  .button:focus-visible {
    outline: var(--focus-ring-width) solid var(--color-text-primary);
    outline-offset: var(--focus-ring-offset);
  }
  .accent:focus-visible {
    outline: var(--focus-ring-width) solid var(--color-brand-accent);
    outline-offset: 3px;
  }

  /* --- KeyHint нейтрализация на плотных/accent --- */
  .primary :global(.key-hint),
  .success :global(.key-hint),
  .danger :global(.key-hint),
  .accent :global(.key-hint) {
    background: transparent;
    border-color: currentColor;
    color: inherit;
    opacity: 0.85;
  }
</style>
