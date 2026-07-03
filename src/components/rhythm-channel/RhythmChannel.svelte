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
    BAND_WIDTH,
    forcesAt,
    initialRhythmState,
    MAX_LEVEL,
    registerBeatReducer,
    ZONE_CENTER,
  } from '@/lib/rhythm-channel';

  interface Props {
    /** Счётчик ударов: продвижение курсора печати (один на верно набранный символ). */
    beatIndex: number;
    /** Доступное имя индикатора (локализованное). */
    ariaLabel: string;
  }

  const { beatIndex, ariaLabel }: Props = $props();

  // Всё изменяемое состояние модели — в одном объекте. level/tapZone рендерятся;
  // темп/разброс/started читаются в обработчике и rAF (вне tracking-контекста, лишних
  // ре-рендеров нет). Реактивно через $state-прокси.
  let rhythm = $state(initialRhythmState());

  // Часы удара — вне модели: редьюсер чист и берёт готовый intervalMs.
  let lastBeatAt = 0;

  let reduceMotion = $state(false);

  // Засечка базового индекса: первый прогон эффекта только запоминает старт, не бьёт.
  let primed = false;
  let lastSeenIndex = 0;

  // Статичная зона — позиционные константы (доля шкалы → проценты).
  const zoneLeftPct = ((ZONE_CENTER - BAND_WIDTH / 2) / MAX_LEVEL) * 100;
  const zoneWidthPct = (BAND_WIDTH / MAX_LEVEL) * 100;
  const markerPct = $derived(Math.max(0, Math.min(100, (rhythm.level / MAX_LEVEL) * 100)));

  function registerBeat() {
    const now = performance.now();
    // Порядок оседания/приёма/фиксации-зоны/прыжка — в чистом редьюсере модели.
    rhythm = registerBeatReducer({ state: rhythm, intervalMs: now - lastBeatAt, reduceMotion });
    lastBeatAt = now;
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
      if (rhythm.started && !reduceMotion) {
        rhythm.level = applyFall({ level: rhythm.level, gravity: forcesAt(rhythm.emaIntervalMs).gravity, seconds: dt });
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
    <div class="marker z-{rhythm.tapZone}" style="left:{markerPct}%"></div>
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
