<script lang="ts">
  import { getContext } from 'svelte';
  import { dictionary } from '@/lib/i18n';
  import { settings } from '@/lib/settings';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import type { AuthStore } from '@/lib/auth/auth-store.svelte';
  import { formatSessionRow, type SessionsStore } from '@/lib/sessions/sessions-store.svelte';

  const auth = getContext<AuthStore>('auth');
  const sessions = getContext<SessionsStore>('sessions');

  const t = $derived($dictionary.stats_sessions);
  // listMine отдаёт старые→новые (_creationTime asc); в таблице — новые сверху.
  const rows = $derived(
    sessions.list
      .map((session) => formatSessionRow({ session, locale: $settings.interfaceLanguage }))
      .reverse(),
  );
</script>

<div class="stats-page">
  <h2 class="screen-title">{t.title}</h2>

  {#if auth.state.status === 'guest'}
    <p class="muted">{t.guest}</p>
  {:else if auth.state.status === 'loading'}
    <!-- ждём auth/данные: ничего не рендерим, чтобы не мигать «пусто» -->
  {:else if rows.length === 0}
    <p class="muted">{t.empty}</p>
  {:else}
    <table class="sessions">
      <thead>
        <tr>
          <th>{t.headers.date}</th>
          <th class="num">{t.headers.duration}</th>
          <th class="num">{t.headers.cpm}</th>
          <th class="num">{t.headers.accuracy}</th>
        </tr>
      </thead>
      <tbody>
        {#each rows as row (row.id)}
          <tr>
            <td>{row.date}</td>
            <td class="num">{row.durationSeconds}{t.units.duration}</td>
            <td class="num">{row.cpm} {t.units.cpm}</td>
            <td class="num">{row.accuracy}{t.units.accuracy}</td>
          </tr>
        {/each}
      </tbody>
    </table>
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
    font-size: 1.5rem;
    font-weight: 700;
  }

  .muted {
    color: var(--color-text-secondary);
  }

  .sessions {
    border-collapse: collapse;
    font-size: var(--font-size-sm);
    font-variant-numeric: tabular-nums;
  }

  .sessions th,
  .sessions td {
    padding: var(--spacing-2) var(--spacing-4);
    border-bottom: 1px solid var(--color-border);
    text-align: left;
    white-space: nowrap;
  }

  .sessions th {
    color: var(--color-text-secondary);
    font-weight: var(--font-weight-semibold);
  }

  .sessions td {
    color: var(--color-text-primary);
  }

  .sessions .num {
    text-align: right;
  }

  .btn {
    padding: var(--spacing-2) var(--spacing-4);
    border-radius: var(--radius-3);
    border: var(--settings-page-btn-border);
    background: var(--settings-page-btn-background);
    color: var(--settings-page-btn-color);
    cursor: pointer;
  }

  .btn:hover {
    background: var(--settings-page-btn-hover-background);
  }
</style>
