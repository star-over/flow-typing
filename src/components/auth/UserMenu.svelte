<script lang="ts">
  import { getContext } from 'svelte';
  import { resolve } from '$app/paths';
  import Avatar from '@/components/ui/Avatar.svelte';
  import { settings } from '@/lib/settings';
  import { dictionary } from '@/lib/i18n';
  import type { AuthStore } from '@/lib/auth/auth-store.svelte';

  const auth = getContext<AuthStore>('auth');

  // Override из настроек поверх оригинала провайдера; пустой override → имя провайдера.
  const displayName = $derived.by(() => {
    if (auth.state.status !== 'authenticated') return '';
    const user = auth.state.user;
    return $settings.displayName.trim() || user.name || user.email || 'User';
  });

  // Dropdown open-state нужен явно: native <details> не закрывается ни по клику
  // вне, ни по Escape — навешиваем это сами, пока меню открыто.
  let open = $state(false);
  let menuEl = $state<HTMLDetailsElement>();

  $effect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (menuEl && !menuEl.contains(event.target as Node)) open = false;
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') open = false;
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  });

  async function handleSignOut() {
    open = false;
    await auth.signOut();
  }
</script>

{#if auth.state.status === 'loading'}
  <span class="user-menu user-menu--loading" aria-busy="true">…</span>
{:else if auth.state.status === 'guest'}
  <a class="user-menu user-menu--guest-link" href={resolve('/signin')}>Войти</a>
{:else}
  <details class="user-menu user-menu--authenticated" bind:this={menuEl} bind:open>
    <summary class="user-menu__summary">
      <Avatar
        src={auth.state.user.image}
        name={displayName}
        email={auth.state.user.email}
        size="1.75rem"
      />
      <span class="user-menu__name">{displayName}</span>
    </summary>
    <div class="user-menu__dropdown">
      <a class="user-menu__item" href={resolve('/settings')} onclick={() => (open = false)}>
        {$dictionary.app.settings}
      </a>
      <a class="user-menu__item" href={resolve('/stats')} onclick={() => (open = false)}>
        {$dictionary.app.stats}
      </a>
      <hr class="user-menu__divider" />
      <button type="button" class="user-menu__item" onclick={handleSignOut}>
        Выйти
      </button>
    </div>
  </details>
{/if}

<style>
  .user-menu--loading {
    color: var(--user-menu-loading-color);
  }

  .user-menu--guest-link {
    color: var(--user-menu-guest-link-color);
    text-decoration: none;
  }

  .user-menu--guest-link:hover {
    color: var(--user-menu-guest-link-hover-color);
  }

  .user-menu--authenticated {
    position: relative;
  }

  .user-menu__summary {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    max-width: 12rem;
    color: var(--user-menu-authenticated-name-color);
    cursor: pointer;
    list-style: none;
    padding: 0.25rem 0.5rem;
    border-radius: var(--radius-2);
  }

  .user-menu__summary::-webkit-details-marker {
    display: none;
  }

  .user-menu__summary:focus-visible {
    outline: 2px solid var(--user-menu-authenticated-name-color);
    outline-offset: 2px;
  }

  /* Длинное имя (в т.ч. кастомный displayName) обрезается, а не растягивает бар. */
  .user-menu__name {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .user-menu__dropdown {
    position: absolute;
    top: calc(100% + 0.25rem);
    right: 0;
    display: flex;
    flex-direction: column;
    background: var(--user-menu-dropdown-background);
    border: var(--user-menu-dropdown-border);
    border-radius: var(--radius-3);
    padding: 0.25rem;
    min-width: 9rem;
    z-index: 10;
  }

  .user-menu__item {
    color: var(--user-menu-dropdown-item-color);
    background: transparent;
    border: none;
    border-radius: var(--radius-2);
    cursor: pointer;
    padding: 0.5rem 0.75rem;
    width: 100%;
    text-align: left;
    text-decoration: none;
    font: inherit;
  }

  .user-menu__item:hover {
    background: var(--user-menu-dropdown-item-hover-background);
  }

  .user-menu__item:focus-visible {
    outline: 2px solid var(--user-menu-dropdown-item-color);
    outline-offset: -2px;
  }

  .user-menu__divider {
    border: none;
    border-top: var(--user-menu-dropdown-border);
    margin: 0.25rem 0;
  }
</style>
