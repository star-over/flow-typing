<script lang="ts">
  import { getContext } from 'svelte';
  import { dictionary } from '@/lib/i18n';
  import { settings } from '@/lib/settings';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import type { AuthStore } from '@/lib/auth/auth-store.svelte';
  import { formatSessionRow, type SessionsStore } from '@/lib/session-history/sessions-store.svelte';
  import { createProgressionStore } from '@/lib/repertoire/progression-store.svelte';

  const auth = getContext<AuthStore>('auth');
  const sessions = getContext<SessionsStore>('sessions');

  // Подписка на детальный прогресс ступени живёт, пока открыт /stats (store создаётся
  // здесь, в странице, а не в layout) — $effect внутри владеет ею и отпишется на уходе.
  const progression = createProgressionStore({
    authStore: auth,
    symbolLayoutId: () => $settings.symbolLayoutId,
  });
  const detail = $derived(progression.detail);

  const t = $derived($dictionary.stats_sessions);
  const tp = $derived($dictionary.stats_progression);

  // listMine отдаёт старые→новые (_creationTime asc); в таблице — новые сверху.
  const rows = $derived(
    sessions.list
      .map((session) => formatSessionRow({ session, locale: $settings.interfaceLanguage }))
      .reverse(),
  );

  function fill({ template, values }: { template: string; values: Record<string, string | number> }): string {
    return Object.entries(values).reduce((s, [k, val]) => s.replace(`{${k}}`, String(val)), template);
  }

  const pct = (n: number) => Math.round(n * 100);
</script>

<div class="stats-page">
  <h2 class="screen-title">{t.title}</h2>

  {#if auth.state.status === 'guest'}
    <p class="muted">{t.guest}</p>
  {:else if auth.state.status === 'loading'}
    <!-- ждём auth/данные: ничего не рендерим, чтобы не мигать «пусто» -->
  {:else}
    <!-- ── Прогресс ступени: входные данные решения о росте репертуара ── -->
    {#if detail}
      <section class="progression">
        <h3 class="section-title">{tp.title}</h3>
        <p class="prog-meta">
          {fill({ template: tp.step, values: { current: detail.openedSteps, max: detail.totalSteps } })}
          · {fill({ template: tp.ready, values: { ready: detail.readyCount, total: detail.totalOnStep } })}
        </p>

        {#if detail.totalOnStep === 0}
          <p class="muted">{tp.all_open}</p>
        {:else}
          <p class="muted prog-intro">{fill({ template: tp.intro, values: { debt: detail.debtLimit } })}</p>

          <table class="grid symbols">
            <thead>
              <tr>
                <th>{tp.headers.symbol}</th>
                <th class="num">{tp.headers.exposures}<span class="target">{fill({ template: tp.target_exposures, values: { min: detail.params.minExposures } })}</span></th>
                <th class="num">{tp.headers.accuracy}<span class="target">{fill({ template: tp.target_accuracy, values: { min: pct(detail.params.minFirstTryAccuracy) } })}</span></th>
                <th class="num">{tp.headers.latency}<span class="target">{detail.latencyThresholdMs > 0 ? fill({ template: tp.target_latency, values: { max: Math.round(detail.latencyThresholdMs) } }) : tp.none}</span></th>
                <th>{tp.headers.status}</th>
              </tr>
            </thead>
            <tbody>
              {#each detail.symbols as s (s.symbol)}
                <tr>
                  <td class="sym">{s.symbol}</td>
                  <td class="num" class:gap={s.gaps.exposure}>{s.exposures}</td>
                  <td class="num" class:gap={s.gaps.accuracy}>{s.firstTryAccuracy === null ? tp.none : `${pct(s.firstTryAccuracy)}%`}</td>
                  <td class="num" class:gap={s.gaps.latency}>{s.latencyEwmaMs === null ? tp.none : Math.round(s.latencyEwmaMs)}</td>
                  <td>
                    {#if s.ready}
                      <span class="status-ready">✓ {tp.status_ready}</span>
                    {:else}
                      <span class="tags">
                        {#if s.gaps.exposure}<span class="tag">{tp.gap_exposures}</span>{/if}
                        {#if s.gaps.accuracy}<span class="tag">{tp.gap_accuracy}</span>{/if}
                        {#if s.gaps.latency}<span class="tag">{tp.gap_latency}</span>{/if}
                      </span>
                    {/if}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>

          <p class="prog-status">
            {#if detail.maturingNeeded === 0}
              {tp.ready_to_advance}
            {:else}
              {fill({ template: tp.maturing, values: { count: detail.maturingNeeded } })}
            {/if}
          </p>
          <p class="muted small">
            {#if detail.repertoireMedianLatencyMs > 0}
              {fill({ template: tp.median_note, values: { median: Math.round(detail.repertoireMedianLatencyMs), threshold: Math.round(detail.latencyThresholdMs), k: detail.params.latencyK } })}
            {:else}
              {tp.median_cold}
            {/if}
          </p>
          <p class="muted small">{tp.rhythm_note}</p>
        {/if}
      </section>
    {/if}

    <!-- ── История сеансов ── -->
    {#if rows.length === 0}
      <p class="muted">{t.empty}</p>
    {:else}
      <table class="grid sessions">
        <thead>
          <tr>
            <th>{t.headers.date}</th>
            <th class="num">{t.headers.duration}</th>
            <th class="num">{t.headers.cpm}</th>
            <th class="num">{t.headers.accuracy}</th>
            <th class="num">{t.headers.rhythm}</th>
            <th class="num">{t.headers.latency}</th>
          </tr>
        </thead>
        <tbody>
          {#each rows as row (row.id)}
            <tr>
              <td>{row.date}</td>
              <td class="num">{row.elapsedSeconds} {t.units.duration}</td>
              <td class="num">{row.cpm} {t.units.cpm}</td>
              <td class="num">{row.accuracy}{t.units.accuracy}</td>
              <td class="num">{row.rhythm}</td>
              <td class="num">{row.latencyMedianMs} {t.units.latency}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  {/if}

  <button type="button" class="btn" onclick={() => goto(resolve('/'))}>
    {$dictionary.settings.back_button}
  </button>
</div>

<style>
  /* inline-стили временной технической страницы: глобальные примитивы + нейтральная
     палитра напрямую, без theme-контракта — как лендинг. */
  .stats-page {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-6);
  }

  .screen-title {
    font-size: var(--font-size-2xl);
    font-weight: var(--font-weight-bold);
  }

  .section-title {
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-bold);
    margin-bottom: var(--spacing-2);
  }

  .muted {
    color: var(--color-text-secondary);
  }

  .small {
    font-size: var(--font-size-sm);
  }

  /* ── Прогресс ступени ── */
  .progression {
    width: 100%;
    max-width: 40rem;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
  }

  .prog-meta {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
  }

  .prog-intro {
    font-size: var(--font-size-sm);
    line-height: var(--line-height-normal);
    max-width: 52ch;
  }

  .prog-status {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
    margin-top: var(--spacing-1);
  }

  /* ── Таблицы ── */
  .grid {
    border-collapse: collapse;
    font-size: var(--font-size-sm);
    font-variant-numeric: tabular-nums;
  }

  .symbols {
    width: 100%;
  }

  .grid th,
  .grid td {
    padding: var(--spacing-2) var(--spacing-4);
    border-bottom: 1px solid var(--color-border);
    text-align: left;
    white-space: nowrap;
  }

  .grid th {
    color: var(--color-text-secondary);
    font-weight: var(--font-weight-semibold);
    vertical-align: bottom;
  }

  .grid td {
    color: var(--color-text-primary);
  }

  .grid .num {
    text-align: right;
  }

  /* Цель под заголовком столбца — мелким вторичным, на новой строке. */
  .target {
    display: block;
    font-size: 0.6875rem;
    font-weight: var(--font-weight-regular);
    color: var(--color-text-secondary);
  }

  .sym {
    font-family: var(--font-mono);
    font-weight: var(--font-weight-semibold);
  }

  /* «не дотягивает» — спокойно: значение вторичным тоном, акцента-цвета нет
     (насыщенность зарезервирована под визуализацию движения). Вердикт несёт статус. */
  .gap {
    color: var(--color-text-secondary);
  }

  .status-ready {
    color: var(--color-text-secondary);
  }

  /* Невыполненные условия — нейтральные чипы (граница, не заливка) в духе «плоско, глубина границей». */
  .tags {
    display: inline-flex;
    flex-wrap: wrap;
    gap: var(--spacing-1);
  }

  .tag {
    font-size: 0.6875rem;
    padding: 0 var(--spacing-2);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-2);
    color: var(--color-text-secondary);
  }

  .btn {
    padding: var(--spacing-2) var(--spacing-4);
    border-radius: var(--radius-3);
    border: 1px solid var(--color-border);
    background: var(--color-surface);
    color: var(--color-text-primary);
    cursor: pointer;
  }

  .btn:hover {
    background: var(--color-surface-hover);
  }

  .btn:focus-visible {
    outline: var(--focus-ring-width) solid var(--color-text-primary);
    outline-offset: var(--focus-ring-offset);
  }
</style>
