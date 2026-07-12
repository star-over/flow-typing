<!--
  Tech-debt note: MenuScreen намеренно не имеет рядом MenuScreen.contract.ts.
  Компонент пока тонкий и повторно использует существующие токены лендинга
  (`--landing-cta-*`). Когда он стабилизируется — выделить собственные `--menu-screen-*`
  токены и завести контракт на общих условиях (docs/06 §6.2).
  Запись в очереди: docs/backlog.md → «MenuScreen.contract.ts».
-->
<script lang="ts">
  import type { Dictionary } from '@/interfaces/types';

  interface Props {
    dictionary: Dictionary;
    onStart: () => void;
  }

  const { dictionary, onStart }: Props = $props();
</script>

<div class="menu-screen">
  <button type="button" class="start-btn" onclick={onStart}>
    {dictionary.app.start_training}
  </button>
</div>

<style>
  .menu-screen {
    display: flex;
    flex-direction: column;
    width: 100%;
    max-width: 23rem;
  }

  /* Бренд-янтарная CTA — те же токены, что у primary-CTA лендинга
     (`--landing-cta-*`), чтобы «Начать тренировку» выглядела одинаково на `/`
     и на `/train`. */
  .start-btn {
    width: 100%;
    padding: var(--spacing-3) var(--spacing-4);
    border-radius: var(--radius-3);
    border: var(--landing-cta-border);
    background: var(--landing-cta-background);
    color: var(--landing-cta-color);
    font-family: var(--font-sans);
    font-size: 0.9375rem;
    font-weight: 600;
    cursor: pointer;
  }

  .start-btn:hover {
    background: var(--landing-cta-hover-background);
  }

  .start-btn:focus-visible {
    outline: 2px solid var(--landing-cta-background);
    outline-offset: 2px;
  }
</style>
