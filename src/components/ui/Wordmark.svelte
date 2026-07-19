<!-- cSpell:ignore yping -->
<script lang="ts">
  /**
   * Wordmark — логотип FlowTyping «буква в блочном курсоре».
   *
   * Анатомия (повторяет механику тренажёра):
   *  - «F» несёт засечку home-ряда (как клавиши F/J) — знак слепой печати;
   *  - «Flow» — набранное (плотное);
   *  - «T» — текущий символ внутри блочного курсора (инвертирован);
   *  - «yping» — предстоящее (затухает, opacity из токена).
   *
   * Масштабируется через font-size контейнера: все размеры в em.
   * Цвета — только через контракт-токены (см. Wordmark.contract.ts).
   */

  interface Props {
    /** Затухание «предстоящей» части. false — сплошной цвет (для мелких размеров). */
    fadePending?: boolean;
  }

  const { fadePending = true }: Props = $props();
</script>

<span class="wordmark" class:fade-pending={fadePending} translate="no">
  <span class="glyph-f">F<span class="homing-bar" aria-hidden="true"></span></span><span>low</span><span class="caret">T</span><span class="pending">yping</span>
</span>

<style>
  .wordmark {
    display: inline-flex;
    align-items: center;
    font-family: 'Geist Mono', ui-monospace, monospace;
    font-weight: 600;
    letter-spacing: -0.04em;
    line-height: 1;
    color: var(--color-text-primary);
    white-space: nowrap;
  }

  .glyph-f {
    position: relative;
    display: inline-block;
  }

  /* Засечка home-ряда: зазор от базовой линии = 0.12em (выверено по иконке сайта) */
  .homing-bar {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    bottom: -0.12em;
    width: 0.46em;
    height: 0.1em;
    border-radius: 999px;
    background: var(--color-path-highlight);
  }

  /* Блочный курсор на текущем символе */
  .caret {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.13em 0.07em;
    margin: 0 0.07em;
    border-radius: 0.14em;
    background: var(--color-brand-accent);
    color: var(--color-cursor-foreground);
  }

  .pending {
    opacity: 1;
  }

  .fade-pending .pending {
    opacity: 0.38;
  }
</style>
