<!--
  MovementPath — анимация «визуализации движения» пальца дом→цель внутри кластера.

  Заменяет дискретные стрелки (`NavArrow`) настоящим движением: маркер-кончик пальца
  едет по пути со следом (форма A), у цели пульсирует и от него расходится кольцо («тап»
  = «кольцо + пульс»). Ведущий цикл-runway (дотяг → удержание/тап → быстрый возврат →
  пауза), предвосхищение — не реакция. Для вырожденного пути (цель = дом) движения нет,
  только тап на месте.

  «Глупый» UI: вся динамика — в чистой модели `@/lib/movement-path`. Компонент лежит
  рядом с клавиатурой внутри `.cluster-container`, мерит реальные центры клавиш пути
  (`.keycap-center-point` — те же якоря, что позиционируют кластер) и ведёт rAF.

  prefers-reduced-motion: движение отключается — статичная линия дом→цель + точка у цели
  («откуда→куда» без анимации, PRODUCT §Accessibility).

  Цвет — контракт темы: путь `--movement-path-guide` (индиго), движение по пальцу
  `--movement-path-<pos>-marker` (спектр), контур точки `--movement-path-marker-edge`.
-->
<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { on } from 'svelte/events';
  import type { FingerId, KeyCapId } from '@/interfaces/types';
  import {
    advanceRunway,
    initialRunwayState,
    type Point,
    pointAlong,
    polylinePath,
    reachFraction,
    tapIntensity,
    totalLength,
  } from '@/lib/movement-path';

  interface Props {
    /** Упорядоченный путь дом→…→цель (KeyCapId); для F — один элемент. */
    path: KeyCapId[];
    /** Целевой палец — задаёт цвет движения (спектр). */
    fingerId: FingerId;
  }

  const { path, fingerId }: Props = $props();

  const markerColor = $derived(`var(--movement-path-${fingerId.toLowerCase()}-marker, currentColor)`);

  let svgEl = $state<SVGSVGElement | null>(null);

  let points = $state<Point[]>([]);
  let box = $state({ w: 0, h: 0 });
  let keySize = $state({ w: 40, h: 34 });
  let runway = $state(initialRunwayState());
  let reduceMotion = $state(false);

  // --- Измерение ломаной по центрам клавиш пути (в системе координат svg) ---
  function measure() {
    const container = svgEl?.parentElement;
    if (!svgEl || !container) return;
    const svgBox = svgEl.getBoundingClientRect();
    if (svgBox.width === 0) return;
    box = { w: svgBox.width, h: svgBox.height };

    const next: Point[] = [];
    for (const id of path) {
      const anchor = container.querySelector(`[data-keycap-id="${id}"] .keycap-center-point`);
      if (!anchor) continue;
      const r = anchor.getBoundingClientRect();
      next.push({ x: r.left + r.width / 2 - svgBox.left, y: r.top + r.height / 2 - svgBox.top });
    }
    points = next;

    const firstId = path[0];
    const firstCap = firstId ? container.querySelector(`[data-keycap-id="${firstId}"]`) : null;
    if (firstCap) {
      const r = firstCap.getBoundingClientRect();
      if (r.width > 0) keySize = { w: r.width, h: r.height };
    }
  }

  // Пересъёмка при смене пути (после раскладки DOM).
  $effect(() => {
    void path;
    const raf = requestAnimationFrame(() => { void tick().then(measure); });
    return () => cancelAnimationFrame(raf);
  });

  onMount(() => {
    measure();
    const container = svgEl?.parentElement;
    const ro = new ResizeObserver(() => measure());
    if (container) ro.observe(container);

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    reduceMotion = mq.matches;
    const offMq = on(mq, 'change', () => { reduceMotion = mq.matches; });

    let raf = 0;
    let prev: number | undefined;
    const tickFrame = (t: number) => {
      if (prev === undefined) prev = t;
      const dt = Math.min(100, t - prev);
      prev = t;
      if (!reduceMotion) runway = advanceRunway({ state: runway, dtMs: dt, speed: 1 });
      raf = requestAnimationFrame(tickFrame);
    };
    raf = requestAnimationFrame(tickFrame);

    return () => { cancelAnimationFrame(raf); ro.disconnect(); offMq(); };
  });

  // --- Производные для рендера ---
  const hasPath = $derived(points.length >= 2);
  // reduced-motion: статичная линия дом→цель + точка у цели (frac=1, без тапа).
  const frac = $derived(reduceMotion ? 1 : reachFraction({ state: runway, speed: 1 }));
  const tapT = $derived(reduceMotion ? 0 : tapIntensity({ state: runway, speed: 1 }));

  const len = $derived(totalLength(points));
  const guidePath = $derived(polylinePath(points));
  const targetPoint = $derived<Point>(points[points.length - 1] ?? { x: 0, y: 0 });
  const dotPoint = $derived(pointAlong({ points, t: frac }));

  // Тап = «кольцо + пульс»: точка раздувается + кольцо расходится.
  const dotScale = $derived(1 + 0.4 * Math.sin(Math.PI * tapT));
  const dotRadius = $derived(keySize.h * 0.2 * dotScale);
  const tapRingRadius = $derived(keySize.w * (0.42 + 0.5 * tapT));
  const showTapRing = $derived(tapT > 0.001);
  // След тянется, пока идёт дотяг/удержание/возврат; в паузе исчезает.
  const showTrail = $derived(hasPath && frac > 0.01);
</script>

<svg
  class="movement-path"
  bind:this={svgEl}
  viewBox={`0 0 ${box.w} ${box.h}`}
  preserveAspectRatio="none"
  aria-hidden="true"
>
  {#if points.length >= 1}
    {#if hasPath}
      <path class="guide" d={guidePath} />
      {#if showTrail}
        <path
          class="trail"
          d={guidePath}
          style:stroke={markerColor}
          stroke-dasharray={len}
          stroke-dashoffset={len * (1 - frac)}
        />
      {/if}
    {/if}

    {#if showTapRing}
      <circle
        class="tap-ring"
        cx={targetPoint.x}
        cy={targetPoint.y}
        r={tapRingRadius}
        style:stroke={markerColor}
        style:opacity={0.55 * (1 - tapT)}
      />
    {/if}

    <!-- Кончик пальца: чуть прозрачная заливка (символ клавиши просвечивает). -->
    <circle class="halo" cx={dotPoint.x} cy={dotPoint.y} r={keySize.h * 0.42} style:fill={markerColor} />
    <circle class="dot" cx={dotPoint.x} cy={dotPoint.y} r={dotRadius} style:fill={markerColor} />
  {/if}
</svg>

<style>
  .movement-path {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    overflow: visible;
    z-index: 5;
  }

  /* Линия-маршрут дом→цель — тонкий индиго-пунктир (путь виден и в паузе). */
  .guide {
    fill: none;
    stroke: var(--movement-path-guide);
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-dasharray: 2 5;
    opacity: 0.4;
  }

  /* Яркий след за маркером (цвет пальца). */
  .trail {
    fill: none;
    stroke-width: 3.5;
    stroke-linecap: round;
    stroke-linejoin: round;
    opacity: 0.9;
  }

  /* Кольцо тапа — расходится от точки и гаснет. */
  .tap-ring {
    fill: none;
    stroke-width: 2.5;
  }

  .halo { opacity: 0.22; }

  /* Точка-кончик: полупрозрачная заливка + контур (тема-зависимый highlight). */
  .dot {
    fill-opacity: 0.82;
    stroke: var(--movement-path-marker-edge);
    stroke-width: 1.25;
  }
</style>
