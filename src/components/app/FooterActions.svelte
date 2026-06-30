<script lang="ts">
  import type { StateFrom } from 'xstate';
  import type { appMachine, AppEvent } from '@/machines/app.machine';
  import type { Dictionary, SymbolLayoutId } from '@/interfaces/types';
  import { inState } from '@/lib/state-utils';

  interface Props {
    state: StateFrom<typeof appMachine>;
    send: (event: AppEvent) => void;
    dictionary: Dictionary;
    symbolLayoutId: SymbolLayoutId;
  }

  const { state, send, dictionary, symbolLayoutId }: Props = $props();

  const isVisible = $derived(
    inState({ snapshot: state, value: 'training' }) ||
    inState({ snapshot: state, value: 'sessionComplete' })
  );

  // Пауза переехала в шапку (рядом с таймером): во время набора низ принадлежит
  // рукам, без панели управления. Поэтому футер рисуем только когда есть что
  // показать — иначе в `running` остался бы пустой sticky-бар у нижней кромки.
  const hasActions = $derived(
    state.can({ type: 'START_TRAINING', symbolLayoutId }) ||
    state.can({ type: 'RESUME' }) ||
    state.can({ type: 'TO_MENU' })
  );
</script>

{#if isVisible && hasActions}
  <footer class="footer">
    <div class="actions">
      {#if state.can({ type: 'START_TRAINING', symbolLayoutId })}
        <button type="button" class="btn primary" onclick={() => send({ type: 'START_TRAINING', symbolLayoutId })}>
          {dictionary.app.start_again}
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
{/if}

<style>
  .footer {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-4);
    width: 100%;
    padding: var(--spacing-4) 0;
    /* Сцена тренировки растягивается (flex:1) и прижимает футер к низу .main —
       футер не должен сжиматься/обрезаться, иначе кнопки управления пропадут. */
    flex-shrink: 0;
    /* Руки сцены намеренно уходят за нижнюю кромку; на невысоких окнах это тянет
       документ вниз и футер уехал бы под обрез. sticky держит управление у низа
       видимой области (на высоком экране — no-op: футер и так в естественном низу). */
    position: sticky;
    bottom: 0;
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

  .btn.danger {
    background: var(--footer-actions-btn-danger-background);
    color: var(--footer-actions-btn-danger-color);
    border: var(--footer-actions-btn-danger-border);
  }
</style>
