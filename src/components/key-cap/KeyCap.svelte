<script lang="ts">
  import type {
    KeyCapHomeKeyMarker,
    KeyCapNavigationRole,
    KeyCapSymbolSize,
    KeyCapUnitWidth,
  } from '@/interfaces/types';

  interface Props {
    symbol: string;
    keyCapId?: string;
    pressResult?: 'NONE' | 'CORRECT' | 'ERROR';
    visibility?: 'VISIBLE' | 'INVISIBLE';
    home?: boolean;
    fingerId?: string;
    unitWidth?: KeyCapUnitWidth;
    symbolSize?: KeyCapSymbolSize;
    homeKeyMarker?: KeyCapHomeKeyMarker;
    navigationRole?: KeyCapNavigationRole;
  }

  const {
    symbol,
    keyCapId,
    pressResult = 'NONE',
    visibility = 'VISIBLE',
    home = false,
    fingerId,
    unitWidth = '1U',
    symbolSize = 'MD',
    homeKeyMarker = 'NONE',
    navigationRole = 'NONE',
  }: Props = $props();

  const unitMultiplier = $derived(parseFloat(unitWidth));
</script>

<div
  class="keycap size-{symbolSize} marker-{homeKeyMarker}"
  class:CORRECT={pressResult === 'CORRECT'}
  class:ERROR={pressResult === 'ERROR'}
  class:home={home}
  class:INVISIBLE={visibility === 'INVISIBLE'}
  class:role-target={navigationRole === 'TARGET'}
  class:role-path={navigationRole === 'PATH'}
  data-finger-id={fingerId}
  data-keycap-id={keyCapId}
  style:--unit-multiplier={unitMultiplier}
>
  <span class="keycap-label">{symbol}</span>

  <div class="keycap-marker"></div>

  <!-- Center point anchor used by HandsScene positioning logic -->
  <div class="keycap-center-point"></div>
</div>

<style>
  .keycap {
    --keycap-unit: 2.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    flex-shrink: 0;
    box-sizing: border-box;
    border-radius: var(--radius-2);
    height: 2rem;
    width: calc(var(--keycap-unit) * var(--unit-multiplier, 1));
    padding: 0 var(--spacing-2);
    background: transparent;
    border: 1px solid transparent;
    color: var(--keycap-color);
    font-weight: 200;
    user-select: none;
  }

  .keycap.INVISIBLE {
    visibility: hidden;
  }

  /* --- Symbol size --- */
  .size-MD .keycap-label { font-size: 0.9375rem; }
  .size-SM .keycap-label { font-size: 0.8125rem; }
  .size-XS .keycap-label { font-size: 0.6875rem; }

  /* --- Per-position fill/border/color --- */
  .keycap[data-finger-id="L1"] {
    background: var(--keycap-l1-background);
    border: var(--keycap-l1-border);
    color: var(--keycap-l1-color);
  }
  .keycap[data-finger-id="R1"] {
    background: var(--keycap-r1-background);
    border: var(--keycap-r1-border);
    color: var(--keycap-r1-color);
  }
  .keycap[data-finger-id="L2"] {
    background: var(--keycap-l2-background);
    border: var(--keycap-l2-border);
    color: var(--keycap-l2-color);
  }
  .keycap[data-finger-id="R2"] {
    background: var(--keycap-r2-background);
    border: var(--keycap-r2-border);
    color: var(--keycap-r2-color);
  }
  .keycap[data-finger-id="L3"] {
    background: var(--keycap-l3-background);
    border: var(--keycap-l3-border);
    color: var(--keycap-l3-color);
  }
  .keycap[data-finger-id="R3"] {
    background: var(--keycap-r3-background);
    border: var(--keycap-r3-border);
    color: var(--keycap-r3-color);
  }
  .keycap[data-finger-id="L4"] {
    background: var(--keycap-l4-background);
    border: var(--keycap-l4-border);
    color: var(--keycap-l4-color);
  }
  .keycap[data-finger-id="R4"] {
    background: var(--keycap-r4-background);
    border: var(--keycap-r4-border);
    color: var(--keycap-r4-color);
  }
  .keycap[data-finger-id="L5"] {
    background: var(--keycap-l5-background);
    border: var(--keycap-l5-border);
    color: var(--keycap-l5-color);
  }
  .keycap[data-finger-id="R5"] {
    background: var(--keycap-r5-background);
    border: var(--keycap-r5-border);
    color: var(--keycap-r5-color);
  }

  /* --- Home key ring --- */
  .keycap.home {
    box-shadow: var(--keycap-home-ring);
  }

  /* --- Navigation role (overridden by press result below) --- */
  .keycap.role-path {
    box-shadow: var(--keycap-path-ring);
    font-weight: 700;
  }

  /* --- Navigation role TARGET — per-position --- */
  .keycap[data-finger-id="L1"].role-target {
    background: var(--keycap-l1-target-background);
    color: var(--keycap-l1-target-color);
    box-shadow: var(--keycap-l1-target-ring);
  }
  .keycap[data-finger-id="R1"].role-target {
    background: var(--keycap-r1-target-background);
    color: var(--keycap-r1-target-color);
    box-shadow: var(--keycap-r1-target-ring);
  }
  .keycap[data-finger-id="L2"].role-target {
    background: var(--keycap-l2-target-background);
    color: var(--keycap-l2-target-color);
    box-shadow: var(--keycap-l2-target-ring);
  }
  .keycap[data-finger-id="R2"].role-target {
    background: var(--keycap-r2-target-background);
    color: var(--keycap-r2-target-color);
    box-shadow: var(--keycap-r2-target-ring);
  }
  .keycap[data-finger-id="L3"].role-target {
    background: var(--keycap-l3-target-background);
    color: var(--keycap-l3-target-color);
    box-shadow: var(--keycap-l3-target-ring);
  }
  .keycap[data-finger-id="R3"].role-target {
    background: var(--keycap-r3-target-background);
    color: var(--keycap-r3-target-color);
    box-shadow: var(--keycap-r3-target-ring);
  }
  .keycap[data-finger-id="L4"].role-target {
    background: var(--keycap-l4-target-background);
    color: var(--keycap-l4-target-color);
    box-shadow: var(--keycap-l4-target-ring);
  }
  .keycap[data-finger-id="R4"].role-target {
    background: var(--keycap-r4-target-background);
    color: var(--keycap-r4-target-color);
    box-shadow: var(--keycap-r4-target-ring);
  }
  .keycap[data-finger-id="L5"].role-target {
    background: var(--keycap-l5-target-background);
    color: var(--keycap-l5-target-color);
    box-shadow: var(--keycap-l5-target-ring);
  }
  .keycap[data-finger-id="R5"].role-target {
    background: var(--keycap-r5-target-background);
    color: var(--keycap-r5-target-color);
    box-shadow: var(--keycap-r5-target-ring);
  }

  /* `border-color: transparent` снимает тонкий border кластера
     (`--keycap-{pos}-border`) из-под target-ring: правило (0,2,0) объявлено
     ниже per-position-заливки (тоже (0,2,0)) и перебивает её border. Ширину
     не трогаем — клетка не меняет размер, border лишь становится невидимым. */
  .keycap.role-target {
    border-color: transparent;
    font-weight: 900;
  }

  /* --- Press result (заливка + кольцо перекрывают navigation role) ---
     Класс продублирован (`.CORRECT.CORRECT`) намеренно: поднимает specificity
     до (0,3,0), чтобы перебить per-position-target
     `.keycap[data-finger-id="…"].role-target` (тоже 0,3,0) по заливке / цвету /
     границе — result объявлен ниже по исходнику и выигрывает.
     CORRECT перекрывает и `box-shadow`: кольцо становится зелёным в тон заливке
     (единый зелёный отклик), а не остаётся янтарным target-ring. ERROR ниже
     `box-shadow` не трогает — там target-ring цели осознанно переживает результат. */
  .keycap.CORRECT.CORRECT {
    background: var(--keycap-correct-background);
    color: var(--keycap-correct-color);
    border: var(--keycap-correct-border);
    box-shadow: var(--keycap-correct-ring);
    font-weight: 800;
  }

  .keycap.ERROR.ERROR {
    background: var(--keycap-error-background);
    color: var(--keycap-error-color);
    border: var(--keycap-error-border);
    font-weight: 800;
  }

  .keycap:active {
    transform: translateY(1px);
  }

  /* --- Home key marker --- */
  .keycap-marker {
    position: absolute;
    bottom: 2px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--keycap-marker-background);
    border-radius: 9999px;
  }

  .marker-BAR .keycap-marker {
    width: 0.75rem;
    height: 0.125rem;
  }

  .marker-DOT .keycap-marker {
    width: 0.25rem;
    height: 0.25rem;
  }

  .marker-NONE .keycap-marker {
    visibility: hidden;
  }

  /* JS anchor used by HandsScene positioning logic — не масштабируется намеренно. */
  .keycap-center-point {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 2px;
    height: 2px;
    pointer-events: none;
  }
</style>
