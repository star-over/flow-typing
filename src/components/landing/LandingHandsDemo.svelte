<script lang="ts">
  /**
   * LandingHandsDemo — живая визуализация движения для лендинга.
   *
   * Намеренно развязан с XState/session-pipeline (см. дизайн-бриф): это
   * самодостаточная демонстрация, а не встроенный тренажёр. Повторно использует
   * `KeyCap` ради верных цветов пальцев / маркеров / target-состояния из тем;
   * путь и движущийся «кончик пальца» рисует SVG-overlay в тех же px-координатах.
   *
   * Цикл «дом → цель → дом» проигрывается ровно, как метроном (North Star).
   * При `prefers-reduced-motion` анимация не запускается — показывается
   * статичный информативный кадр (цель подсвечена, путь нарисован, палец дома).
   */
  import { onMount } from 'svelte';
  import { on } from 'svelte/events';
  import KeyCap from '@/components/key-cap/KeyCap.svelte';

  interface Props {
    /** Доступное описание анимации (role="img"). */
    label: string;
  }
  const { label }: Props = $props();

  type FingerId =
    | 'L1' | 'L2' | 'L3' | 'L4' | 'L5'
    | 'R1' | 'R2' | 'R3' | 'R4' | 'R5';

  // Раскладка: три буквенных ряда, обе руки. Палец на клавишу — по слепому методу.
  const ROWS: { char: string; finger: FingerId }[][] = [
    [
      { char: 'Q', finger: 'L5' }, { char: 'W', finger: 'L4' }, { char: 'E', finger: 'L3' },
      { char: 'R', finger: 'L2' }, { char: 'T', finger: 'L2' },
      { char: 'Y', finger: 'R2' }, { char: 'U', finger: 'R2' }, { char: 'I', finger: 'R3' },
      { char: 'O', finger: 'R4' }, { char: 'P', finger: 'R5' },
    ],
    [
      { char: 'A', finger: 'L5' }, { char: 'S', finger: 'L4' }, { char: 'D', finger: 'L3' },
      { char: 'F', finger: 'L2' }, { char: 'G', finger: 'L2' },
      { char: 'H', finger: 'R2' }, { char: 'J', finger: 'R2' }, { char: 'K', finger: 'R3' },
      { char: 'L', finger: 'R4' }, { char: ';', finger: 'R5' },
    ],
    [
      { char: 'Z', finger: 'L5' }, { char: 'X', finger: 'L4' }, { char: 'C', finger: 'L3' },
      { char: 'V', finger: 'L2' }, { char: 'B', finger: 'L2' },
      { char: 'N', finger: 'R2' }, { char: 'M', finger: 'R2' }, { char: ',', finger: 'R3' },
      { char: '.', finger: 'R4' }, { char: '/', finger: 'R5' },
    ],
  ];

  // Цикл «дом → цель → дом». Все цели — в верхнем ряду (движение вверх и назад),
  // руки чередуются ради ритма, пальцы разные ради разнообразия цвета.
  const SEQUENCE = [
    { home: 'D', target: 'E' },
    { home: 'J', target: 'U' },
    { home: 'S', target: 'W' },
    { home: ';', target: 'P' },
    { home: 'F', target: 'R' },
    { home: 'L', target: 'O' },
  ] as const;

  // --- Геометрия в px. rootPx считывается с :root, чтобы координаты совпадали
  //     с rem-размерами KeyCap (2.25rem × 2rem) при любом базовом размере шрифта.
  let rootPx = $state(16);
  const KEY_W = $derived(2.25 * rootPx);
  const KEY_H = $derived(2 * rootPx);
  const GAP = $derived(0.375 * rootPx);
  const STAGGER = $derived(0.32 * KEY_W);
  const HAND_GAP = $derived(0.5 * KEY_W);
  const PAD = $derived(rootPx);

  interface PlacedKey {
    char: string;
    finger: FingerId;
    row: number;
    col: number;
    x: number;
    y: number;
    cx: number;
    cy: number;
  }

  const keys = $derived.by<PlacedKey[]>(() => {
    const out: PlacedKey[] = [];
    ROWS.forEach((r, row) =>
      r.forEach((k, col) => {
        const x = PAD + row * STAGGER + col * (KEY_W + GAP) + (col >= 5 ? HAND_GAP : 0);
        const y = PAD + row * (KEY_H + GAP);
        out.push({ ...k, row, col, x, y, cx: x + KEY_W / 2, cy: y + KEY_H / 2 });
      }),
    );
    return out;
  });

  const boardW = $derived(PAD * 2 + 2 * STAGGER + 10 * (KEY_W + GAP) - GAP + HAND_GAP);
  const boardH = $derived(PAD * 2 + 3 * (KEY_H + GAP) - GAP);

  const keyByChar = (ch: string): PlacedKey | undefined => keys.find((k) => k.char === ch);

  let stepIndex = $state(0);
  let t = $state(0); // 0 — палец дома, 1 — на цели
  let reduced = $state(false);

  // SEQUENCE — кортеж (`as const`), поэтому SEQUENCE[0] определён без assertion;
  // числовой индекс может дать undefined — падаем на первый шаг.
  const step = $derived(SEQUENCE[stepIndex] ?? SEQUENCE[0]);
  const homeKey = $derived(keyByChar(step.home));
  const targetKey = $derived(keyByChar(step.target));

  // Квадратичная кривая Безье home → control → target, выгнутая вверх (дотягивание пальца).
  const ctrl = $derived.by(() => {
    if (!homeKey || !targetKey) return { x: 0, y: 0 };
    return {
      x: (homeKey.cx + targetKey.cx) / 2,
      y: Math.min(homeKey.cy, targetKey.cy) - KEY_H * 1.1,
    };
  });

  const pathD = $derived(
    homeKey && targetKey
      ? `M ${homeKey.cx} ${homeKey.cy} Q ${ctrl.x} ${ctrl.y} ${targetKey.cx} ${targetKey.cy}`
      : '',
  );

  const dot = $derived.by(() => {
    if (!homeKey || !targetKey) return { x: 0, y: 0 };
    const mt = 1 - t;
    return {
      x: mt * mt * homeKey.cx + 2 * mt * t * ctrl.x + t * t * targetKey.cx,
      y: mt * mt * homeKey.cy + 2 * mt * t * ctrl.y + t * t * targetKey.cy,
    };
  });

  // Позиция пальца (цифра '1'..'5') → --color-finger-N. Ветку 'b'→base держим для
  // безопасности, хотя цели этого компонента — не большие пальцы. Букву руки
  // роняем намеренно — цвет позиционный (--color-finger-N одинаков для L/R).
  const dotColor = $derived.by(() => {
    if (!targetKey) return 'transparent';
    const pos = targetKey.finger.charAt(1).toLowerCase(); // '1'..'5' | 'b'
    return `var(--color-finger-${pos === 'b' ? 'base' : pos})`;
  });

  // Длительности фаз кадра (мс) — спокойные, как метроном.
  const OUT = 520;
  const HOLD = 200;
  const BACK = 460;
  const REST = 360;
  const TOTAL = OUT + HOLD + BACK + REST;
  const easeOut = (p: number) => 1 - Math.pow(1 - p, 3);

  let fitEl = $state<HTMLDivElement>();
  let fitWidth = $state(0);
  // Реактивно: пересчитывается при изменении ширины колонки (fitWidth) или
  // собственного размера доски (boardW, зависит от rootPx). Никаких гонок по времени.
  const scale = $derived(fitWidth > 0 ? Math.min(1, fitWidth / boardW) : 1);

  onMount(() => {
    rootPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Прямой замер ширины колонки. ResizeObserver в некоторых средах не шлёт
    // initial-callback, поэтому не полагаемся только на него: меряем сразу,
    // на следующем кадре (после раскладки) и на resize окна. RO — бонус для
    // изменений контейнера без resize окна.
    const measure = () => {
      if (fitEl) fitWidth = fitEl.clientWidth;
    };
    measure();
    requestAnimationFrame(measure);
    const offResize = on(window, 'resize', measure);
    const ro = new ResizeObserver(measure);
    if (fitEl) ro.observe(fitEl);

    let raf = 0;
    let base = 0;
    if (!reduced) {
      const tick = (now: number) => {
        if (!base) base = now;
        let e = now - base;
        if (e >= TOTAL) {
          base = now;
          e = 0;
          stepIndex = (stepIndex + 1) % SEQUENCE.length;
        }
        if (e < OUT) t = easeOut(e / OUT);
        else if (e < OUT + HOLD) t = 1;
        else if (e < OUT + HOLD + BACK) t = 1 - easeOut((e - OUT - HOLD) / BACK);
        else t = 0;
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      offResize();
    };
  });

  // Кольцо (home-ring) — только у дома текущего шага, как у любой клавиши.
  // BAR-засечка на F/J статична — это физический ориентир слепого метода.
  const isHome = (k: PlacedKey): boolean => k.char === step.home;
  const marker = (k: PlacedKey): 'BAR' | 'NONE' => (k.char === 'F' || k.char === 'J' ? 'BAR' : 'NONE');
</script>

<figure class="demo" role="img" aria-label={label}>
  <div class="fit" bind:this={fitEl} style:height="{boardH * scale}px">
    <div
      class="board"
      aria-hidden="true"
      style:width="{boardW}px"
      style:height="{boardH}px"
      style:transform="scale({scale})"
    >
      {#each keys as k (k.char + k.row + k.col)}
        <div class="key" style:left="{k.x}px" style:top="{k.y}px">
          <KeyCap
            symbol={k.char}
            fingerId={k.finger}
            home={isHome(k)}
            homeKeyMarker={marker(k)}
            navigationRole={k.char === step.target ? 'TARGET' : 'NONE'}
          />
        </div>
      {/each}

      <svg
        class="overlay"
        viewBox="0 0 {boardW} {boardH}"
        style:width="{boardW}px"
        style:height="{boardH}px"
      >
        {#if pathD}
          <path class="trail" d={pathD} />
          <circle class="tip" cx={dot.x} cy={dot.y} r={KEY_H * 0.18} style:fill={dotColor} />
        {/if}
      </svg>
    </div>
  </div>
</figure>

<style>
  .demo {
    margin: 0;
    width: 100%;
  }

  .fit {
    width: 100%;
    display: flex;
    justify-content: center;
    /* Доска масштабируется через transform (visual), но её layout-бокс остаётся
       собственной шириной. Скрываем его, чтобы на узких экранах он не распирал
       страницу и не блокировал схлопывание min-width флекс-колонки.
       Клавиши/кольца/дуга смещены внутрь на PAD, поэтому не обрезаются. */
    overflow: hidden;
  }

  .board {
    position: relative;
    /* Доска — флекс-элемент .fit; без этого она бы СЖИМАЛАСЬ под ширину
       колонки, а абсолютные клавиши (в собственных координатах) вылезли бы за
       панель. Держим собственный размер; видимый масштаб даёт transform. */
    flex-shrink: 0;
    transform-origin: top center;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-4);
  }

  .key {
    position: absolute;
  }

  .overlay {
    position: absolute;
    inset: 0;
    pointer-events: none;
    overflow: visible;
  }

  .trail {
    fill: none;
    stroke: var(--color-path-highlight);
    stroke-width: 2;
    stroke-linecap: round;
    stroke-dasharray: 2 6;
    opacity: 0.75;
  }

  .tip {
    filter: drop-shadow(0 0 0.35rem var(--color-path-highlight));
  }
</style>
