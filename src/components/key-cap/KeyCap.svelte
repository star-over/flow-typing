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
    /* Системный «ров»: полоска цвета фона (--color-gap = фон) по контуру отделяет
       клавишу от пальца под ней. Один для ВСЕХ клавиш, роль ни при чём. Роль-
       специфичный внутренний ободок (маркер дома / цвет маршрута) роли докладывают
       через --kc-inner-ring; box-shadow — список теней, поэтому композиция корректна. */
    box-shadow: var(--kc-inner-ring, 0 0 0 0 transparent), 0 0 0 0.15rem var(--color-gap);
    color: var(--color-keycap-label);
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
    background: var(--color-keycap-group-1-background);
    border: 1px solid var(--color-keycap-group-1-border);
    color: var(--color-keycap-label);
  }
  .keycap[data-finger-id="R1"] {
    background: var(--color-keycap-group-1-background);
    border: 1px solid var(--color-keycap-group-1-border);
    color: var(--color-keycap-label);
  }
  .keycap[data-finger-id="L2"] {
    background: var(--color-keycap-group-2-background);
    border: 1px solid var(--color-keycap-group-2-border);
    color: var(--color-keycap-label);
  }
  .keycap[data-finger-id="R2"] {
    background: var(--color-keycap-group-2-background);
    border: 1px solid var(--color-keycap-group-2-border);
    color: var(--color-keycap-label);
  }
  .keycap[data-finger-id="L3"] {
    background: var(--color-keycap-group-3-background);
    border: 1px solid var(--color-keycap-group-3-border);
    color: var(--color-keycap-label);
  }
  .keycap[data-finger-id="R3"] {
    background: var(--color-keycap-group-3-background);
    border: 1px solid var(--color-keycap-group-3-border);
    color: var(--color-keycap-label);
  }
  .keycap[data-finger-id="L4"] {
    background: var(--color-keycap-group-4-background);
    border: 1px solid var(--color-keycap-group-4-border);
    color: var(--color-keycap-label);
  }
  .keycap[data-finger-id="R4"] {
    background: var(--color-keycap-group-4-background);
    border: 1px solid var(--color-keycap-group-4-border);
    color: var(--color-keycap-label);
  }
  .keycap[data-finger-id="L5"] {
    background: var(--color-keycap-group-5-background);
    border: 1px solid var(--color-keycap-group-5-border);
    color: var(--color-keycap-label);
  }
  .keycap[data-finger-id="R5"] {
    background: var(--color-keycap-group-5-background);
    border: 1px solid var(--color-keycap-group-5-border);
    color: var(--color-keycap-label);
  }

  /* --- Home key marker (внутренний ободок; внешний ров — системный, на базе) --- */
  .keycap.home {
    --kc-inner-ring: inset 0 0 0 0.1rem var(--color-keycap-label);
  }

  /* --- Navigation role PATH — per-position внутренний ободок цветом маршрута
         пальца-владельца (ADR 0028); внешний ров системный (на базе).
         Перекрывается press result ниже. --- */
  .keycap.role-path {
    font-weight: 700;
  }
  .keycap[data-finger-id="L1"].role-path { --kc-inner-ring: inset 0 0 0 0.14rem var(--color-route-1); }
  .keycap[data-finger-id="R1"].role-path { --kc-inner-ring: inset 0 0 0 0.14rem var(--color-route-1); }
  .keycap[data-finger-id="L2"].role-path { --kc-inner-ring: inset 0 0 0 0.14rem var(--color-route-2); }
  .keycap[data-finger-id="R2"].role-path { --kc-inner-ring: inset 0 0 0 0.14rem var(--color-route-2); }
  .keycap[data-finger-id="L3"].role-path { --kc-inner-ring: inset 0 0 0 0.14rem var(--color-route-3); }
  .keycap[data-finger-id="R3"].role-path { --kc-inner-ring: inset 0 0 0 0.14rem var(--color-route-3); }
  .keycap[data-finger-id="L4"].role-path { --kc-inner-ring: inset 0 0 0 0.14rem var(--color-route-4); }
  .keycap[data-finger-id="R4"].role-path { --kc-inner-ring: inset 0 0 0 0.14rem var(--color-route-4); }
  .keycap[data-finger-id="L5"].role-path { --kc-inner-ring: inset 0 0 0 0.14rem var(--color-route-5); }
  .keycap[data-finger-id="R5"].role-path { --kc-inner-ring: inset 0 0 0 0.14rem var(--color-route-5); }

  /* --- Navigation role TARGET — per-position заливка (внешний ров — на базе) --- */
  .keycap[data-finger-id="L1"].role-target {
    background: var(--color-target-1);
    color: var(--color-on-dense);
  }
  .keycap[data-finger-id="R1"].role-target {
    background: var(--color-target-1);
    color: var(--color-on-dense);
  }
  .keycap[data-finger-id="L2"].role-target {
    background: var(--color-target-2);
    color: var(--color-on-dense);
  }
  .keycap[data-finger-id="R2"].role-target {
    background: var(--color-target-2);
    color: var(--color-on-dense);
  }
  .keycap[data-finger-id="L3"].role-target {
    background: var(--color-target-3);
    color: var(--color-on-dense);
  }
  .keycap[data-finger-id="R3"].role-target {
    background: var(--color-target-3);
    color: var(--color-on-dense);
  }
  .keycap[data-finger-id="L4"].role-target {
    background: var(--color-target-4);
    color: var(--color-on-dense);
  }
  .keycap[data-finger-id="R4"].role-target {
    background: var(--color-target-4);
    color: var(--color-on-dense);
  }
  .keycap[data-finger-id="L5"].role-target {
    background: var(--color-target-5);
    color: var(--color-on-dense);
  }
  .keycap[data-finger-id="R5"].role-target {
    background: var(--color-target-5);
    color: var(--color-on-dense);
  }

  /* `border-color: transparent` снимает тонкий border кластера
     (`--keycap-{pos}-border`) из-под target-ring: правило (0,2,0) объявлено
     ниже per-position-заливки (тоже (0,2,0)) и перебивает её border. Ширину
     не трогаем — клетка не меняет размер, border лишь становится невидимым. */
  .keycap.role-target {
    border-color: transparent;
    font-weight: 900;
  }

  /* --- Press result (заливка перекрывает navigation role) ---
     Класс продублирован (`.CORRECT.CORRECT`) намеренно: поднимает specificity
     до (0,3,0), чтобы перебить per-position-target
     `.keycap[data-finger-id="…"].role-target` (тоже 0,3,0) по заливке / цвету /
     границе — result объявлен ниже по исходнику и выигрывает.
     Ров ни correct, ни error не задают: он системный (на базе `.keycap`), поэтому
     силуэт исхода совпадает по габариту с целью/путём/home автоматически. */
  .keycap.CORRECT.CORRECT {
    background: var(--color-keycap-correct-background);
    color: var(--color-on-dense);
    border: 1px solid var(--color-keycap-correct-border);
    font-weight: 800;
  }

  .keycap.ERROR.ERROR {
    background: var(--color-keycap-error-background);
    color: var(--color-keycap-error-foreground);
    border: 1px solid var(--color-keycap-error-border);
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
    background: var(--color-keycap-marker);
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
