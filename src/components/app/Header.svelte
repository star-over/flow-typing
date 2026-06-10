<script lang="ts">
  import { dictionary } from '@/lib/i18n';
  import { resolve } from '$app/paths';
  import UserMenu from '@/components/auth/UserMenu.svelte';

  interface Props {
    title: string;
    appStateLabel: string;
    appStateValue: string;
  }

  const { title, appStateLabel, appStateValue }: Props = $props();
</script>

<header class="header">
  <div class="top">
    <h1 class="title">{title}</h1>
    <nav class="nav">
      <a class="nav-link" href={resolve('/settings')}>{$dictionary.app.settings}</a>
      <a class="nav-link" href={resolve('/stats')}>{$dictionary.app.stats}</a>
      <UserMenu />
    </nav>
  </div>
  <div class="debug">
    <span class="label">{appStateLabel}:</span>
    <code class="value">{appStateValue}</code>
  </div>
</header>

<style>
  .header {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-2);
    width: 100%;
    padding: var(--spacing-4) 0;
  }

  .top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-6);
    width: 100%;
  }

  .title {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--header-title-color);
  }

  .nav {
    display: flex;
    gap: var(--spacing-3);
  }

  .nav-link {
    font-size: 0.875rem;
    color: var(--header-title-color);
    text-decoration: none;
    padding: var(--spacing-1) var(--spacing-2);
    border-radius: var(--radius-2);
  }

  .nav-link:hover {
    background: var(--header-debug-background);
  }

  .debug {
    font-size: 0.75rem;
    color: var(--header-debug-color);
    font-family: var(--font-mono);
  }

  .label {
    margin-right: var(--spacing-1);
  }

  .value {
    background: var(--header-debug-background);
    padding: var(--spacing-1) var(--spacing-2);
    border-radius: var(--radius-2);
  }
</style>
