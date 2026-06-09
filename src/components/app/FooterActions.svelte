<script lang="ts">
  import type { StateFrom } from 'xstate';
  import type { appMachine, AppEvent } from '@/machines/app.machine';
  import type { Dictionary, SymbolLayoutId } from '@/interfaces/types';

  interface Props {
    state: StateFrom<typeof appMachine>;
    send: (event: AppEvent) => void;
    dictionary: Dictionary;
    symbolLayoutId: SymbolLayoutId;
  }

  const { state, send, dictionary, symbolLayoutId }: Props = $props();
</script>

<footer class="footer">
  <div class="actions">
    {#if state.can({ type: 'START_TRAINING', symbolLayoutId })}
      <button type="button" class="btn primary" onclick={() => send({ type: 'START_TRAINING', symbolLayoutId })}>
        {dictionary.app.start_training}
      </button>
    {/if}
    {#if state.can({ type: 'PAUSE' })}
      <button type="button" class="btn warning" onclick={() => send({ type: 'PAUSE' })}>
        {dictionary.app.pause}
      </button>
    {/if}
    {#if state.can({ type: 'RESUME' })}
      <button type="button" class="btn success" onclick={() => send({ type: 'RESUME' })}>
        {dictionary.app.resume}
      </button>
    {/if}
    {#if state.can({ type: 'TO_MENU' })}
      <button type="button" class="btn danger" onclick={() => send({ type: 'TO_MENU' })}>
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
    border-radius: var(--radius-3);
    border: var(--footer-actions-btn-border);
    background: var(--footer-actions-btn-background);
    color: var(--footer-actions-btn-color);
    font-family: var(--font-sans);
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.1s ease;
  }

  .btn:hover {
    background: var(--footer-actions-btn-hover-background);
  }

  .btn.primary {
    background: var(--footer-actions-btn-primary-background);
    color: var(--footer-actions-btn-primary-color);
    border: var(--footer-actions-btn-primary-border);
  }

  .btn.primary:hover {
    opacity: 0.9;
  }

  .btn.success {
    background: var(--footer-actions-btn-success-background);
    color: var(--footer-actions-btn-success-color);
    border: var(--footer-actions-btn-success-border);
  }

  .btn.warning {
    background: var(--footer-actions-btn-warning-background);
    color: var(--footer-actions-btn-warning-color);
    border: var(--footer-actions-btn-warning-border);
  }

  .btn.danger {
    background: var(--footer-actions-btn-danger-background);
    color: var(--footer-actions-btn-danger-color);
    border: var(--footer-actions-btn-danger-border);
  }
</style>
