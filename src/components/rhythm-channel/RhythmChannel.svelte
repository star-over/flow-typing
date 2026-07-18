<!--
  RhythmChannel — «канал ритма»: тихий рецептор ритм-сигнала под курсором FlowLine.

  Форма — «дорожка к сейчас» (research §7): маркер-кромка сбегает к неподвижному
  рецептору по центру (та же вертикаль внимания, что и курсор FlowLine — связь
  визуальная, размещением; интеграции с полем ввода нет, канал независим и отключаем).
  Момент «нажми» = кромка проходит рецептор (он вспыхивает зелёным). Тап в зоне держит
  темп; правее центра — частишь, левее — тормозишь.

  Цвет несёт «в зоне / вне зоны», сторону несёт позиция: зелёный = держишь темп; маркер
  вне зоны (в любую сторону) — на ступень мягче ошибки набора, но виден (DESIGN «Правило
  мягкости ритма»). Конкретный цвет — за темой.
  Куда нажал, фиксируется в момент тапа (`tapZone`), а не там, куда кромка улетела
  после прыжка: этим красится маркер и заливка-состояние полосы.

  Глупый UI: вся механика — в чистой модели `@/lib/rhythm-channel` (заморожена,
  research §11). Компонент ведёт rAF-падение и держит изменяемое состояние. Beat =
  инкремент `beatIndex` (продвижение курсора в trainingMachine на верный символ).

  prefers-reduced-motion: непрерывное падение заменяется дискретным шагом на нажатие
  (кромка оседает за интервал одним вычислением); CSS-переходы выключены.
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

  // Живые величины (обновляются каждый кадр) от позиции кромки.
  const markerPct = $derived(Math.max(0, Math.min(100, (rhythm.level / MAX_LEVEL) * 100)));
  // Дорожка-след от рецептора (центр) к маркеру: масштаб половины дорожки [0…1].
  const trailRight = $derived(Math.max(0, Math.min(1, (markerPct - 50) / 50)));
  const trailLeft = $derived(Math.max(0, Math.min(1, (50 - markerPct) / 50)));
  // Рецептор «сейчас» вспыхивает, пока кромка проходит близко к центру.
  const anchorLit = $derived(Math.abs(rhythm.level - ZONE_CENTER) < 0.04);

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
  <div class="track state-{rhythm.tapZone}">
    <!-- Заливка-состояние: тап вне зоны подтягивает янтарь со стороны сноса. -->
    <div class="wash"></div>
    <!-- Пояс-допуск: края растворяются в прозрачность (граница мягкая, не абсолютная). -->
    <div class="zone" style="left:{zoneLeftPct}%; width:{zoneWidthPct}%"></div>
    <!-- Дорожка-след живой позиции: масштабируется трансформом от центра к кромке. -->
    <div class="trail trail-right" style="transform:scaleX({trailRight})"></div>
    <div class="trail trail-left" style="transform:scaleX({trailLeft})"></div>
    <!-- Рецептор «сейчас» под курсором FlowLine. -->
    <div class="anchor" class:lit={anchorLit}></div>
    <!-- Маркер-кромка: слой во всю ширину едет трансформом (не layout-свойством). -->
    <div class="sweep" style="transform:translateX({markerPct}%)">
      <div class="marker"></div>
    </div>
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
    height: 1rem;
    border: var(--rhythm-channel-track-border);
    border-radius: var(--radius-3);
    background: var(--rhythm-channel-track-background);
    overflow: hidden;
  }

  .wash {
    position: absolute;
    inset: 0;
    opacity: 0;
    transition: opacity var(--motion-duration-base) var(--motion-ease-standard);
  }
  .track.state-above .wash {
    opacity: 1;
    background: linear-gradient(90deg, transparent 42%, var(--rhythm-channel-state-fill));
  }
  .track.state-below .wash {
    opacity: 1;
    background: linear-gradient(270deg, transparent 42%, var(--rhythm-channel-state-fill));
  }

  /* Мягкий пояс-допуск: цвет держится в середине, левый/правый края уходят в
     прозрачность — граница читается как коридор, а не жёсткий гейт. */
  .zone {
    position: absolute;
    top: 0;
    bottom: 0;
    background: linear-gradient(
      90deg,
      transparent,
      var(--rhythm-channel-zone-fill) 30%,
      var(--rhythm-channel-zone-fill) 70%,
      transparent
    );
  }

  /* Дорожка-след: две половины, каждая закреплена у центра и растёт scaleX к кромке. */
  .trail {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 50%;
  }
  .trail-right {
    left: 50%;
    transform-origin: left center;
    background: linear-gradient(90deg, transparent, var(--rhythm-channel-trail));
  }
  .trail-left {
    right: 50%;
    transform-origin: right center;
    background: linear-gradient(270deg, transparent, var(--rhythm-channel-trail));
  }

  /* Рецептор «сейчас»: неподвижная вертикаль по центру, вспыхивает зелёным на проходе. */
  .anchor {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 50%;
    width: 2px;
    transform: translateX(-50%);
    background: var(--rhythm-channel-anchor);
    transition:
      background-color var(--motion-duration-fast) var(--motion-ease-standard),
      box-shadow var(--motion-duration-fast) var(--motion-ease-standard);
  }
  .anchor.lit {
    background: var(--rhythm-channel-marker-in);
    box-shadow: 0 0 0 4px var(--rhythm-channel-zone-fill);
  }

  .sweep {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    width: 100%;
  }
  .marker {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    width: 3px;
    transform: translateX(-50%);
    transition: background-color var(--motion-duration-fast) var(--motion-ease-standard);
  }
  /* Цвет маркера — по зоне тапа: в зоне зелёный (держишь), вне — янтарь (в любую сторону). */
  .track.state-in .marker {
    background: var(--rhythm-channel-marker-in);
  }
  .track.state-above .marker,
  .track.state-below .marker {
    background: var(--rhythm-channel-marker-outside);
  }

  @media (prefers-reduced-motion: reduce) {
    .wash,
    .anchor,
    .marker {
      transition: none;
    }
  }
</style>
