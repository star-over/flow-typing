<script lang="ts">
  import { resolve } from '$app/paths';
  import UserMenu from '@/components/auth/UserMenu.svelte';
  import Wordmark from '@/components/ui/Wordmark.svelte';

  interface Props {
    title: string;
  }

  const { title }: Props = $props();
</script>

<header class="header">
  <div class="bar">
    <a class="brand" href={resolve('/')} aria-label={title}><Wordmark /></a>
    <UserMenu />
  </div>
</header>

<style>
  .header {
    width: 100%;
    border-bottom: var(--header-border);
  }

  /* Inner row ограничен по ширине, чтобы бренд и меню не разъезжались по краям
     широкого экрана; сама полоса и нижняя граница — во всю ширину окна. */
  .bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-6);
    width: 100%;
    max-width: 64rem;
    margin: 0 auto;
    padding: var(--spacing-3) var(--spacing-8);
  }

  .brand {
    display: inline-flex;
    font-size: 1.5rem;
    text-decoration: none;
    line-height: 1;
    border-radius: var(--radius-2);
  }

  .brand:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 4px;
  }
</style>
