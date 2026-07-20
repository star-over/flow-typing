<script lang="ts">
  import { resolve } from '$app/paths';
  import type { SessionStats } from '@/lib/stats-calculator';
  import type { Dictionary } from '@/interfaces/types';
  import { formatDurationShort } from '@/lib/timer-display';

  /** Одна точка траектории: точность прошлой сессии, старые → новые. */
  export interface AccuracyTrendPoint {
    accuracy: number;
  }

  interface Props {
    stats: SessionStats;
    /** Точность прошлых сессий (БЕЗ текущей), старые → новые. Пусто — траектории нет. */
    trend: readonly AccuracyTrendPoint[];
    /** Дельта точности к прошлой сессии; undefined — прошлой нет. */
    accuracyDelta: number | undefined;
    /** Дельта ритма к своей недавней норме; undefined — истории мало или ритма нет. */
    rhythmDelta: number | undefined;
    /** Самая частая путаница сессии, уже переведённая в символы. */
    confusion: { from: string; to: string; count: number } | undefined;
    dictionary: Dictionary;
  }

  const { stats, trend, accuracyDelta, rhythmDelta, confusion, dictionary }: Props = $props();

  const t = $derived(dictionary.stats_card);

  function fill({ template, values }: { template: string; values: Record<string, string | number> }): string {
    return Object.entries(values).reduce((s, [key, val]) => s.replace(`{${key}}`, String(val)), template);
  }

  // Презентационное округление: точность с одним знаком (95.5 vs 100 информативно),
  // остальное — целыми. Сырые значения приходят из stats-calculator.
  const display = $derived({
    accuracy: stats.accuracy.toFixed(1),
    rhythm: stats.rhythm === undefined ? t.none : String(Math.round(stats.rhythm)),
    pace: stats.paceInMotion === undefined ? t.none : String(Math.round(stats.paceInMotion)),
    duration: formatDurationShort(stats.elapsedSeconds),
    exposures: stats.exposures,
    misses: stats.misses,
    clean: stats.exposures - stats.misses,
  });

  /** Дельта → строка. Направление несёт глиф, не цвет: хром не красим (DESIGN.md),
   *  и глиф остаётся различим при дальтонизме. */
  function deltaText({ value, template }: { value: number; template: string }): string {
    return fill({
      template,
      values: {
        arrow: value >= 0 ? t.delta_up : t.delta_down,
        value: Math.abs(value).toFixed(1),
      },
    });
  }

  const accuracyDeltaText = $derived(
    accuracyDelta === undefined ? undefined : deltaText({ value: accuracyDelta, template: t.delta_previous }),
  );
  const rhythmDeltaText = $derived(
    rhythmDelta === undefined ? undefined : deltaText({ value: rhythmDelta, template: t.delta_baseline }),
  );

  // ── Траектория ────────────────────────────────────────────────────────────
  // Точность за прошлые сессии + текущая последней точкой. Рисуем, только когда
  // точек хватает, чтобы линия что-то значила: на одной-двух это не траектория.
  const MIN_TREND_POINTS = 4;
  const VIEW_W = 320;
  const VIEW_H = 56;
  const PAD = 7; // радиус кольца точки-сегодня: чтобы не срезалось краем viewBox

  const trendPoints = $derived([...trend.map((p) => p.accuracy), stats.accuracy]);
  const showTrend = $derived(trendPoints.length >= MIN_TREND_POINTS);

  const trendGeometry = $derived.by(() => {
    const values = trendPoints;
    const min = Math.min(...values);
    const max = Math.max(...values);
    // Плоская история (все значения равны) — рисуем по центру, без деления на ноль.
    const span = max - min;
    const x = (i: number) => PAD + (i * (VIEW_W - 2 * PAD)) / Math.max(1, values.length - 1);
    const y = (v: number) => (span === 0 ? VIEW_H / 2 : PAD + (1 - (v - min) / span) * (VIEW_H - 2 * PAD));
    return {
      polyline: values.map((v, i) => `${x(i)},${y(v)}`).join(' '),
      lastX: x(values.length - 1),
      lastY: y(values[values.length - 1] ?? min),
    };
  });

  const trendAria = $derived(
    fill({
      template: t.trend_aria,
      values: { values: trendPoints.map((v) => v.toFixed(1)).join(', ') },
    }),
  );

  // ── Пояснения (i) ─────────────────────────────────────────────────────────
  // Раскрытие по клику: то, что открывается только под курсором, не существует
  // ни для клавиатуры, ни для пальца на экране.
  type MetricKey = 'accuracy' | 'rhythm' | 'volume' | 'pace';
  let openInfo = $state<MetricKey | null>(null);
  const toggleInfo = (key: MetricKey) => (openInfo = openInfo === key ? null : key);
</script>

<section class="stats-display" aria-labelledby="session-stats-title">
  <h2 class="sr-only" id="session-stats-title">{t.title}</h2>

  <!-- ── Ярус 1: точность ── -->
  <div class="hero">
    <div class="hero-main">
      <p class="label">
        {t.accuracy}
        <button
          type="button"
          class="info"
          aria-expanded={openInfo === 'accuracy'}
          aria-controls="info-accuracy"
          aria-label={fill({ template: t.info_open, values: { metric: t.accuracy } })}
          onclick={() => toggleInfo('accuracy')}
        >i</button>
      </p>
      <p class="value hero-value">
        {display.accuracy}<span class="unit">{t.units.accuracy}</span>
      </p>
      {#if accuracyDeltaText}
        <p class="note delta">{accuracyDeltaText}</p>
      {/if}
    </div>

    {#if showTrend}
      <div class="trend">
        <svg class="trend-svg" viewBox="0 0 {VIEW_W} {VIEW_H}" role="img" aria-label={trendAria}>
          <polyline
            points={trendGeometry.polyline}
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            opacity="0.45"
          />
          <!-- Сегодня — кольцо, а не тень: язык колец клавиш (дом / путь / цель). -->
          <circle cx={trendGeometry.lastX} cy={trendGeometry.lastY} r="3.5" fill="currentColor" />
          <circle
            cx={trendGeometry.lastX}
            cy={trendGeometry.lastY}
            r="7"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            opacity="0.35"
          />
        </svg>
        <p class="note trend-caption">
          {fill({ template: t.trend_caption, values: { count: trendPoints.length } })}
        </p>
      </div>
    {/if}

    <p class="note derive">
      {fill({
        template: t.derive,
        values: { clean: display.clean, exposures: display.exposures, misses: display.misses },
      })}
    </p>

    {#if openInfo === 'accuracy'}
      <p class="info-body hero-info" id="info-accuracy">
        {t.info.accuracy.how}
        <b>{t.info_means_label}:</b>
        {t.info.accuracy.means}
      </p>
    {/if}
  </div>

  <!-- ── Ярусы 2 и 3: ритм крупнее, объём и темп стопкой ── -->
  <div class="grid">
    <div class="cell cell-rhythm">
      <p class="label">
        {t.rhythm}
        <button
          type="button"
          class="info"
          aria-expanded={openInfo === 'rhythm'}
          aria-controls="info-rhythm"
          aria-label={fill({ template: t.info_open, values: { metric: t.rhythm } })}
          onclick={() => toggleInfo('rhythm')}
        >i</button>
      </p>
      <p class="value rhythm-value">{display.rhythm}</p>
      {#if rhythmDeltaText}
        <p class="note delta">{rhythmDeltaText}</p>
      {/if}
      {#if openInfo === 'rhythm'}
        <p class="info-body" id="info-rhythm">
          {t.info.rhythm.how}
          <b>{t.info_means_label}:</b>
          {t.info.rhythm.means}
        </p>
      {/if}
    </div>

    <div class="cell">
      <p class="label">
        {t.volume}
        <button
          type="button"
          class="info"
          aria-expanded={openInfo === 'volume'}
          aria-controls="info-volume"
          aria-label={fill({ template: t.info_open, values: { metric: t.volume } })}
          onclick={() => toggleInfo('volume')}
        >i</button>
      </p>
      <p class="value">
        {fill({
          template: t.volume_value,
          values: { exposures: display.exposures, duration: display.duration },
        })}
      </p>
      {#if openInfo === 'volume'}
        <p class="info-body" id="info-volume">
          {t.info.volume.how}
          <b>{t.info_means_label}:</b>
          {t.info.volume.means}
        </p>
      {/if}
    </div>

    <div class="cell cell-pace">
      <p class="label">
        {t.pace}
        <button
          type="button"
          class="info"
          aria-expanded={openInfo === 'pace'}
          aria-controls="info-pace"
          aria-label={fill({ template: t.info_open, values: { metric: t.pace } })}
          onclick={() => toggleInfo('pace')}
        >i</button>
      </p>
      <!-- Единица — только при числе: «— зн/мин» читается как единица измерения
           прочерка. Нет замеров латентности — есть только прочерк. -->
      <p class="value">
        {display.pace}{#if stats.paceInMotion !== undefined}<span class="unit">{t.units.pace}</span>{/if}
      </p>
      {#if openInfo === 'pace'}
        <p class="info-body" id="info-pace">
          {t.info.pace.how}
          <b>{t.info_means_label}:</b>
          {t.info.pace.means}
        </p>
      {/if}
    </div>
  </div>

  <!-- ── Подвал: что унести с экрана + путь к истории ── -->
  <div class="foot">
    {#if confusion}
      <p class="note confusion">
        {fill({
          template: t.confusion,
          values: { from: confusion.from, to: confusion.to, count: confusion.count },
        })}
      </p>
    {/if}
    <!-- Путь к истории — прямо из момента интереса к ней: раньше подробная
         статистика доставалась только из выпадающего меню аватара. -->
    <a class="more" href={resolve('/stats')}>{t.more}</a>
  </div>
</section>

<style>
  .stats-display {
    width: 100%;
    max-width: 640px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-4);
  }

  /* ── Общий словарь ────────────────────────────────────────────────────────
   * ИДЁТ ПЕРВЫМ, до ярусных правил, и это не стилистика: `.value` и
   * `.hero-value` — одна специфичность, поэтому решает порядок в файле. Стоя
   * ниже, базовый `.value` молча перебивал бы размеры ярусов, и вся иерархия
   * схлопывалась бы в один кегль. Модификаторы — только ПОСЛЕ базы. */
  .label {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  }

  .value {
    font-size: var(--font-size-2xl);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary);
    /* Числа — данные: цифры обязаны стоять в колонку, как в таблице /stats. */
    font-variant-numeric: tabular-nums;
    line-height: 1.2;
    letter-spacing: -0.02em;
  }

  .unit {
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-regular);
    color: var(--color-text-secondary);
    margin-left: var(--spacing-1);
    letter-spacing: normal;
    /* Единица не отрывается от числа: «72 зн/мин» рвалось пополам. */
    white-space: nowrap;
  }

  .note {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    font-variant-numeric: tabular-nums;
  }

  /* ── Ярус 1 ──────────────────────────────────────────────────────────────
   * Сетка, а не flex-wrap: иначе траектория срывается под число и повисает.
   * Слева число и дельта, справа траектория, строка вывода — под обоими. */
  .hero {
    padding: var(--spacing-6);
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--spacing-3) var(--spacing-6);
    align-items: end;
  }

  @media (min-width: 560px) {
    .hero {
      grid-template-columns: auto 1fr;
      grid-template-areas: 'main trend' 'derive derive';
    }
    .hero-main { grid-area: main; }
    .trend { grid-area: trend; justify-self: end; }
    .derive { grid-area: derive; }
    /* Пояснение — во всю ширину своей неявной строкой под выводом. */
    .hero-info { grid-column: 1 / -1; }
  }

  .hero-main {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-1);
    min-width: 0;
  }

  .hero-value {
    font-size: 3rem;
  }

  /* ── Траектория ── */
  .trend {
    min-width: 0;
    width: 100%;
    max-width: 320px;
  }

  .trend-svg {
    display: block;
    width: 100%;
    height: 56px;
    color: var(--color-text-secondary);
  }

  .trend-caption {
    margin-top: var(--spacing-1);
    text-align: right;
    font-size: var(--font-size-xs);
  }

  /* ── Ярусы 2 и 3 ─────────────────────────────────────────────────────────
   * Ритм занимает две строки слева — вес ему даёт размер и место, не цвет.
   * Ячейки разделены линиями и своего фона не имеют: вложенные карточки
   * против «плоско по умолчанию» (DESIGN.md). */
  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    border-top: 1px solid var(--color-border);
  }

  .cell {
    padding: var(--spacing-4) var(--spacing-6);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-1);
    min-width: 0;
  }

  .cell-rhythm {
    grid-row: span 2;
    border-right: 1px solid var(--color-border);
    justify-content: center;
  }

  .cell-pace {
    border-top: 1px solid var(--color-border);
  }

  .rhythm-value {
    font-size: 2.25rem;
  }

  @media (max-width: 520px) {
    .grid { grid-template-columns: 1fr; }
    .cell-rhythm {
      grid-row: auto;
      border-right: 0;
      border-bottom: 1px solid var(--color-border);
    }
  }

  .foot {
    padding: var(--spacing-3) var(--spacing-6);
    border-top: 1px solid var(--color-border);
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-3);
  }

  /* ── Кнопка (i) и пояснение ── */
  .info {
    font: inherit;
    font-size: 0.6875rem;
    font-weight: var(--font-weight-bold);
    font-style: italic;
    width: 1.125rem;
    height: 1.125rem;
    padding: 0;
    margin-left: var(--spacing-1);
    border: 1px solid var(--color-border);
    border-radius: 50%;
    background: transparent;
    color: var(--color-text-secondary);
    cursor: pointer;
    vertical-align: middle;
    line-height: 1;
    transition: background-color var(--motion-duration-fast) ease, color var(--motion-duration-fast) ease;
  }

  .info:hover {
    background: var(--color-surface-hover);
  }

  .info:focus-visible {
    outline: var(--focus-ring-width) solid currentColor;
    outline-offset: var(--focus-ring-offset);
  }

  .info[aria-expanded='true'] {
    background: var(--color-text-primary);
    color: var(--color-surface);
  }

  /* Раскрытие — в потоке, не absolute: обрезаться нечему, и высота честная. */
  .info-body {
    font-size: var(--font-size-xs);
    line-height: var(--line-height-normal);
    color: var(--color-text-secondary);
    max-width: 46ch;
    padding: var(--spacing-2) var(--spacing-3);
    border-left: 1px solid var(--color-border);
  }

  .info-body b {
    color: var(--color-text-primary);
    font-weight: var(--font-weight-semibold);
  }

  /* ── Ссылка на историю ── */
  .more {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-primary);
    text-decoration: none;
    border-bottom: 1px solid var(--color-border);
    padding-bottom: 1px;
    transition: border-color var(--motion-duration-fast) ease;
  }

  .more:hover {
    border-bottom: 1px solid var(--color-text-primary);
  }

  .more:focus-visible {
    outline: var(--focus-ring-width) solid currentColor;
    outline-offset: var(--focus-ring-offset);
    border-radius: var(--radius);
  }

  @media (prefers-reduced-motion: reduce) {
    .info,
    .more {
      transition: none;
    }
  }
</style>
