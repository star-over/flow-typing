<!--
  RhythmChannel — «канал ритма»: тихий лидирующий ритм-сигнал под FlowLine.

  Статичная зелёная зона по центру; маркер-кромка мгновенно прыгает вверх на верном
  нажатии и плавно оседает под «гравитацией». Тап, когда кромка в центре зоны, держит
  текущий темп; выше центра — частишь, ниже — тормозишь. Цвет маркера фиксируется в
  момент тапа (куда реально нажал), а не там, куда кромка улетела после прыжка.

  Глупый UI: вся механика — в чистой модели `@/lib/rhythm-channel`. Компонент только
  ведёт rAF-падение и держит изменяемое состояние. Beat = инкремент `beatIndex`
  (продвижение курсора в trainingMachine на каждый верно набранный символ).

  prefers-reduced-motion: непрерывное падение заменяется дискретным шагом на каждое нажатие
  (кромка оседает за прошедший интервал одним вычислением, без поэтапной анимации).
  Модель и формулы: docs/research/rhythm-visualization.md §11.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { on } from 'svelte/events';
  import {
    applyFall,
    applyJump,
    BAND_WIDTH,
    forcesAt,
    initialRhythmState,
    isBeatAccepted,
    MAX_LEVEL,
    updateTempo,
    ZONE_CENTER,
    zoneOf,
    type RhythmZone,
  } from '@/lib/rhythm-channel';

  interface Props {
    /** Счётчик ударов: продвижение курсора печати (один на верно набранный символ). */
    beatIndex: number;
    /** Доступное имя индикатора (локализованное). */
    ariaLabel: string;
  }

  const { beatIndex, ariaLabel }: Props = $props();

  // Рендерится напрямую — реактивно.
  let level = $state(ZONE_CENTER);
  let tapZone = $state<RhythmZone>('in');

  // Состояние модели вне рендера (читается в обработчике/rAF) — обычные let.
  const seed = initialRhythmState();
  let emaIntervalMs = seed.emaIntervalMs;
  let varianceEma = seed.varianceEma;
  let lastBeatAt = 0;
  let started = false;

  let reduceMotion = $state(false);

  // Засечка базового индекса: первый прогон эффекта только запоминает старт, не бьёт.
  let primed = false;
  let lastSeenIndex = 0;

  // Статичная зона — позиционные константы (доля шкалы → проценты).
  const zoneLeftPct = ((ZONE_CENTER - BAND_WIDTH / 2) / MAX_LEVEL) * 100;
  const zoneWidthPct = (BAND_WIDTH / MAX_LEVEL) * 100;
  const markerPct = $derived(Math.max(0, Math.min(100, (level / MAX_LEVEL) * 100)));

  function registerBeat() {
    const now = performance.now();
    if (started) {
      const intervalMs = now - lastBeatAt;
      // Reduced-motion: кромка не падает поэтапно — оседаем за прошедший интервал
      // одним дискретным шагом перед чтением зоны (гравитация — та, что «действовала»).
      if (reduceMotion) {
        level = applyFall({ level, gravity: forcesAt(emaIntervalMs).gravity, seconds: intervalMs / 1000 });
      }
      if (isBeatAccepted({ intervalMs, emaIntervalMs })) {
        const updated = updateTempo({ emaIntervalMs, varianceEma, intervalMs });
        emaIntervalMs = updated.emaIntervalMs;
        varianceEma = updated.varianceEma;
      }
    }
    // Зона фиксируется по позиции ДО прыжка — это «куда нажал».
    tapZone = zoneOf({ level });
    level = applyJump({ level, jumpHeight: forcesAt(emaIntervalMs).jumpHeight });
    lastBeatAt = now;
    started = true;
  }

  $effect(() => {
    const idx = beatIndex;
    if (!primed) {
      primed = true;
      lastSeenIndex = idx;
      return;
    }
    if (idx > lastSeenIndex) registerBeat();
    lastSeenIndex = idx;
  });

  onMount(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    reduceMotion = mq.matches;
    const offMqChange = on(mq, 'change', () => { reduceMotion = mq.matches; });

    let raf = 0;
    let prev: number | undefined;
    const tick = (t: number) => {
      if (prev === undefined) prev = t;
      const dt = Math.min(0.1, (t - prev) / 1000); // зажим кадра 100 мс (вкладка ушла в фон)
      prev = t;
      // Падение работает после первого удара (до него — покой в центре). При
      // reduced-motion поэтапное падение выключено: оседание дискретно на нажатие.
      if (started && !reduceMotion) {
        level = applyFall({ level, gravity: forcesAt(emaIntervalMs).gravity, seconds: dt });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      offMqChange();
    };
  });
</script>

<div class="rhythm-channel" role="img" aria-label={ariaLabel}>
  <div class="track">
    <div class="zone" style="left:{zoneLeftPct}%; width:{zoneWidthPct}%"></div>
    <div class="marker z-{tapZone}" style="left:{markerPct}%"></div>
  </div>
</div>

<style>
  .rhythm-channel {
    display: flex;
    justify-content: center;
    width: 100%;
  }

  .track {
    position: relative;
    width: min(36rem, 80vw);
    height: 0.625rem;
    border: var(--rhythm-channel-track-border);
    border-radius: var(--radius-2);
    background: var(--rhythm-channel-track-background);
    overflow: hidden;
  }

  /* Зелёная зона — герой: мягкая заливка + крепкие кромки через inset-тень
     (не border-left/right, чтобы крепкая кромка зоны не читалась как accent-полоса). */
  .zone {
    position: absolute;
    top: 0;
    bottom: 0;
    background: var(--rhythm-channel-zone-fill);
    box-shadow:
      inset 1.5px 0 0 var(--rhythm-channel-zone-edge),
      inset -1.5px 0 0 var(--rhythm-channel-zone-edge);
  }

  /* Маркер-кромка: тонкая вертикаль, цвет — по зоне в момент тапа. */
  .marker {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 2px;
    transform: translateX(-50%);
    transition: background-color 120ms ease;
  }
  .marker.z-in {
    background: var(--rhythm-channel-marker-in);
  }
  .marker.z-above {
    background: var(--rhythm-channel-marker-above);
  }
  .marker.z-below {
    background: var(--rhythm-channel-marker-below);
  }

  @media (prefers-reduced-motion: reduce) {
    .marker {
      transition: none;
    }
  }
</style>
