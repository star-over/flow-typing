<script lang="ts">
  import { dictionary } from '@/lib/i18n';
  import { resolve } from '$app/paths';
  import UserMenu from '@/components/auth/UserMenu.svelte';
  import Wordmark from '@/components/ui/Wordmark.svelte';

  interface Props {
    title: string;
  }

  const { title }: Props = $props();
</script>

<header class="header">
  <div class="top">
    <a class="brand" href={resolve('/')} aria-label={title}><Wordmark /></a>
    <nav class="nav">
      <a class="nav-link" href={resolve('/settings')}>{$dictionary.app.settings}</a>
      <a class="nav-link" href={resolve('/stats')}>{$dictionary.app.stats}</a>
      <UserMenu />
    </nav>
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

  .brand {
    font-size: 1.5rem;
    text-decoration: none;
    line-height: 1;
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
    background: var(--header-nav-link-hover-background);
  }
</style>
