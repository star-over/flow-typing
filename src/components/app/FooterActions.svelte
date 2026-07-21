<script lang="ts">
  import type { StateFrom } from 'xstate';
  import type { appMachine, AppEvent } from '@/machines/app.machine';
  import type { Dictionary, SymbolLayoutId } from '@/interfaces/types';
  import Button from '@/components/ui/Button.svelte';
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
        <Button
          type="button"
          variant="primary"
          onclick={() => send({ type: 'START_TRAINING', symbolLayoutId, durationSeconds })}
          aria-keyshortcuts={restartAriaShortcut}
        >
          {isSessionError ? dictionary.app.retry : dictionary.app.start_again}
          <KeyHint {...keyHintPropsForTrigger(restartAction.trigger)} />
        </Button>
      {/if}
      {#if state.can({ type: 'RESUME' })}
        <Button
          type="button"
          variant="success"
          onclick={() => send({ type: 'RESUME' })}
          aria-keyshortcuts={resumeAriaShortcut}
        >
          {dictionary.app.resume}
          <KeyHint {...keyHintPropsForTrigger(resumeAction.trigger)} />
        </Button>
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
</style>
