<script lang="ts">
  import type { StateFrom } from 'xstate';
  import type { appMachine, AppEvent } from '@/machines/app.machine';
  import type { Dictionary, SymbolLayoutId } from '@/interfaces/types';
  import KeyHint from '@/components/ui/KeyHint.svelte';
  import { formatAriaTrigger, getPlatform } from '@/lib/platform';
  import { getUserAction, keyHintPropsForTrigger } from '@/lib/user-actions/user-actions';
  import { inState } from '@/lib/state-utils';

  interface Props {
    state: StateFrom<typeof appMachine>;
    send: (event: AppEvent) => void;
    dictionary: Dictionary;
    symbolLayoutId: SymbolLayoutId;
    durationSeconds: number;
  }

  const { state, send, dictionary, symbolLayoutId, durationSeconds }: Props = $props();

  const isVisible = $derived(
    inState({ snapshot: state, value: 'training' }) ||
    inState({ snapshot: state, value: 'sessionComplete' }) ||
    inState({ snapshot: state, value: 'sessionError' })
  );

  // На экране сетевой ошибки та же кнопка START_TRAINING значит «Повторить», а не
  // «Начать тренировку»: действие одно (перезапуск сессии), подпись честнее к контексту.
  const isSessionError = $derived(inState({ snapshot: state, value: 'sessionError' }));

  // Пауза переехала в шапку (рядом с таймером): во время набора низ принадлежит
  // рукам, без панели управления. Поэтому футер рисуем только когда есть что
  // показать — иначе в `running` остался бы пустой sticky-бар у нижней кромки.
  const hasActions = $derived(
    state.can({ type: 'START_TRAINING', symbolLayoutId, durationSeconds }) ||
    state.can({ type: 'RESUME' })
  );

  // Кнопка «Начать заново»/«Повторить» несёт триггер RESTART_TRAINING (Enter);
  // «Продолжить» — RESUME_TRAINING (Escape). Подсказка и aria-keyshortcuts
  // читаются из реестра действий — расхождение с диспетчером исключено.
  const restartAction = getUserAction('RESTART_TRAINING');
  const resumeAction = getUserAction('RESUME_TRAINING');
  const platform = getPlatform();
  const restartAriaShortcut = formatAriaTrigger({ trigger: restartAction.trigger, platform });
  const resumeAriaShortcut = formatAriaTrigger({ trigger: resumeAction.trigger, platform });
</script>

{#if isVisible && hasActions}
  <footer class="footer">
    <div class="actions">
      {#if state.can({ type: 'START_TRAINING', symbolLayoutId, durationSeconds })}
        <button
          type="button"
          class="btn primary"
          onclick={() => send({ type: 'START_TRAINING', symbolLayoutId, durationSeconds })}
          aria-keyshortcuts={restartAriaShortcut}
        >
          {isSessionError ? dictionary.app.retry : dictionary.app.start_again}
          <KeyHint {...keyHintPropsForTrigger(restartAction.trigger)} />
        </button>
      {/if}
      {#if state.can({ type: 'RESUME' })}
        <button
          type="button"
          class="btn success"
          onclick={() => send({ type: 'RESUME' })}
          aria-keyshortcuts={resumeAriaShortcut}
        >
          {dictionary.app.resume}
          <KeyHint {...keyHintPropsForTrigger(resumeAction.trigger)} />
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
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-2);
    padding: var(--spacing-2) var(--spacing-4);
    border-radius: var(--radius-3);
    border: 1px solid var(--color-border);
    background: var(--color-surface);
    color: var(--color-text-primary);
    font-family: var(--font-sans);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    cursor: pointer;
    transition: background-color var(--motion-duration-fast) ease;
  }

  /* Подсказка на плотной цветной кнопке — без своей плашки: контур и текст
     наследуются, иначе светлый бейдж спорит с заливкой кнопки. */
  .btn.primary :global(.key-hint),
  .btn.success :global(.key-hint) {
    background: transparent;
    border-color: currentColor;
    color: inherit;
    opacity: 0.85;
  }

  .btn:hover {
    background: var(--color-surface-hover);
  }

  .btn:focus-visible {
    outline: var(--focus-ring-width) solid var(--color-text-primary);
    outline-offset: var(--focus-ring-offset);
  }

  .btn.primary {
    background: var(--color-primary-background);
    color: var(--color-background);
    border: 1px solid var(--color-primary-background);
  }

  .btn.primary:hover {
    background: var(--color-primary-hover);
    border-color: var(--color-primary-hover);
  }

  .btn.success {
    background: var(--color-success);
    color: var(--color-background);
    border: 1px solid var(--color-success);
  }

  .btn.success:hover {
    background: var(--color-success-hover);
    border-color: var(--color-success-hover);
  }

</style>
