<!--
  MovementPath — анимация «визуализации движения» пальца дом→цель внутри кластера.

  Единственный носитель направления в сцене (ADR 0027 — дискретные стрелки упразднены):
  маркер-кончик пальца едет по пути со следом (форма A), у цели пульсирует и от него
  расходится кольцо («тап» = «кольцо + пульс»). Ведущий цикл-runway (дотяг →
  удержание/тап → быстрый возврат → пауза), предвосхищение — не реакция. Для
  вырожденного пути (цель = дом) движения нет, только тап на месте.

  «Глупый» UI: вся динамика — в чистой модели `@/lib/movement-path`. Компонент лежит
  рядом с клавиатурой внутри `.cluster-container`, мерит реальные центры клавиш пути
  (`.keycap-center-point` — те же якоря, что позиционируют кластер) и ведёт rAF.

  prefers-reduced-motion: движение отключается — статичная линия дом→цель + точка у цели
  («откуда→куда» без анимации, PRODUCT §Accessibility).

  Цвет — контракт темы: путь `--movement-path-guide` (индиго), движение по пальцу
  `--movement-path-<pos>-marker` (спектр), тело бусины-ядра `--movement-path-marker-core`
  (блик/терминатор выводятся из него сферической огранкой — см. секцию стилей ниже).
-->
<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { on } from 'svelte/events';
  import type { FingerId, KeyCapId } from '@/interfaces/types';
  import {
    type Point,
    pointAlong,
    polylinePath,
    reachFraction,
    runwayAtTime,
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

  // Ядро точки — сферическая бусина: блик / тело / терминатор выводятся из одного цвета
  // тела `--movement-path-marker-core` через `oklch(from …)` (см. секцию стилей). Тело
  // контрастно фону и гамме пальца, чтобы движение было заметно; идентичность — в ободке (stroke).
  const uid = $props.id();
  const coreGradId = `marker-core-grad-${uid}`;

  let svgEl = $state<SVGSVGElement | null>(null);

  let points = $state<Point[]>([]);
  let box = $state({ w: 0, h: 0 });
  let keySize = $state({ w: 40, h: 34 });
  // Общая rAF-метка времени: один и тот же `t` во всех обработчиках кадра → синхронные кластеры.
  let now = $state(0);
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
    const tickFrame = (t: number) => {
      if (!reduceMotion) now = t;
      raf = requestAnimationFrame(tickFrame);
    };
    raf = requestAnimationFrame(tickFrame);

    return () => { cancelAnimationFrame(raf); ro.disconnect(); offMq(); };
  });

  // --- Производные для рендера ---
  const hasPath = $derived(points.length >= 2);
  const frame = $derived(runwayAtTime({ timeMs: now, speed: 1 }));
  // reduced-motion: статичная линия дом→цель + точка у цели (frac=1, без тапа).
  const frac = $derived(reduceMotion ? 1 : reachFraction(frame));
  const tapT = $derived(reduceMotion ? 0 : tapIntensity(frame));

  // Вся геометрия движения смещается вниз от центра клавиши, чтобы не перекрывать label
  // (label центрирован в верхней части, движение идёт по нижней).
  const drop = $derived(keySize.h * 0.3);
  const renderPoints = $derived(points.map((p) => ({ x: p.x, y: p.y + drop })));
  const len = $derived(totalLength(renderPoints));
  const guidePath = $derived(polylinePath(renderPoints));
  const targetPoint = $derived<Point>(renderPoints[renderPoints.length - 1] ?? { x: 0, y: 0 });
  const dotPoint = $derived(pointAlong({ points: renderPoints, t: frac }));

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
  <defs>
    <!-- Сферическая огранка ядра: блик (св.-верх), тело, терминатор — из одного цвета
         тела `--movement-path-marker-core`. Светлые темы дают тёмное тело → бронза;
         тёмные — светлое тело → жемчужина. Уникальный id на экземпляр кластера. -->
    <radialGradient id={coreGradId} cx="34%" cy="30%" r="72%">
      <stop class="mc-specular" offset="0%" />
      <stop class="mc-upper" offset="22%" />
      <stop class="mc-body" offset="55%" />
      <stop class="mc-edge" offset="100%" />
    </radialGradient>
  </defs>

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

    <!-- Кончик пальца: сферическая бусина-ядро (заметна на фоне пальца/цели) +
         пальцевый ободок и гало (идентичность). Ниже центра клавиши — не прячет label. -->
    <circle class="halo" cx={dotPoint.x} cy={dotPoint.y} r={keySize.h * 0.42} style:fill={markerColor} />
    <circle
      class="dot"
      cx={dotPoint.x}
      cy={dotPoint.y}
      r={dotRadius}
      fill="url(#{coreGradId})"
      style:stroke={markerColor}
    />
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

  /* Точка-кончик: сферическая бусина-ядро (fill = радиальный градиент) + пальцевый ободок
     (stroke inline). Ободок несёт идентичность пальца, бусина — заметность движения. */
  .dot {
    fill-opacity: 0.9;
    stroke-width: 2;
  }

  /* Сферическая огранка ядра из одного цвета тела `--movement-path-marker-core`:
     блик — светлее и почти без хромы (тёплый белый блик), тело — как есть,
     терминатор — темнее. Один рецепт даёт бронзу на светлых темах (тёмное тело)
     и жемчужину на тёмных (светлое тело — блик упирается в белый). */
  .mc-specular { stop-color: oklch(from var(--movement-path-marker-core) calc(l + 0.37) calc(c * 0.30) h); }
  .mc-upper    { stop-color: oklch(from var(--movement-path-marker-core) calc(l + 0.22) calc(c * 0.80) h); }
  .mc-body     { stop-color: var(--movement-path-marker-core); }
  .mc-edge     { stop-color: oklch(from var(--movement-path-marker-core) calc(l - 0.18) c h); }
</style>
