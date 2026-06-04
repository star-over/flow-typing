<script lang="ts">
  import type { StateFrom } from 'xstate';
  import type { appMachine, AppEvent } from '$machines/app.machine';
  import type { Dictionary } from '$interfaces/types';
  import { keyboardLayout } from '$lib/preferences';

  interface Props {
    state: StateFrom<typeof appMachine>;
    send: (event: AppEvent) => void;
    dictionary: Dictionary;
  }

  const { state, send, dictionary }: Props = $props();
</script>

<footer class="footer">
  <div class="actions">
    {#if state.can({ type: 'START_TRAINING', keyboardLayout: $keyboardLayout })}
      <button class="btn primary" onclick={() => send({ type: 'START_TRAINING', keyboardLayout: $keyboardLayout })}>
        {dictionary.app.start_training}
      </button>
    {/if}
    {#if state.can({ type: 'TO_SETTINGS' })}
      <button class="btn secondary" onclick={() => send({ type: 'TO_SETTINGS' })}>
        {dictionary.app.settings}
      </button>
    {/if}
    {#if state.can({ type: 'TO_ALL_STAT' })}
      <button class="btn secondary" onclick={() => send({ type: 'TO_ALL_STAT' })}>
        {dictionary.app.stats}
      </button>
    {/if}
    {#if state.can({ type: 'PAUSE' })}
      <button class="btn warning" onclick={() => send({ type: 'PAUSE' })}>
        {dictionary.app.pause}
      </button>
    {/if}
    {#if state.can({ type: 'RESUME' })}
      <button class="btn success" onclick={() => send({ type: 'RESUME' })}>
        {dictionary.app.resume}
      </button>
    {/if}
    {#if state.can({ type: 'TO_MENU' })}
      <button class="btn danger" onclick={() => send({ type: 'TO_MENU' })}>
        {dictionary.app.back_to_menu}
      </button>
    {/if}
  </div>
</footer>

<style>
  .footer {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-4);
    width: 100%;
    padding: var(--spacing-4) 0;
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-3);
    justify-content: center;
  }

  .btn {
    padding: var(--spacing-2) var(--spacing-4);
    border-radius: var(--radius-md);
    border: 1px solid var(--color-border);
    background-color: var(--color-surface);
    color: var(--color-text-primary);
    font-family: var(--font-sans);
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.1s ease;
  }

  .btn:hover {
    background-color: var(--color-surface-hover);
  }

  .btn.primary {
    background-color: var(--color-text-primary);
    color: var(--color-bg);
    border-color: var(--color-text-primary);
  }

  .btn.primary:hover {
    opacity: 0.9;
  }

  .btn.success {
    background-color: var(--color-success);
    color: var(--color-bg);
    border-color: var(--color-success);
  }

  .btn.warning {
    background-color: var(--color-warning);
    color: var(--color-bg);
    border-color: var(--color-warning);
  }

  .btn.danger {
    background-color: var(--color-error);
    color: var(--color-bg);
    border-color: var(--color-error);
  }
</style>
