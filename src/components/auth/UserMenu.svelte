<script lang="ts">
  import { getContext } from 'svelte';
  import { resolve } from '$app/paths';
  import Avatar from '@/components/ui/Avatar.svelte';
  import { settings } from '@/lib/settings';
  import type { AuthStore } from '@/lib/auth/auth-store.svelte';

  const auth = getContext<AuthStore>('auth');

  // Override из настроек поверх оригинала провайдера; пустой override → имя провайдера.
  const displayName = $derived.by(() => {
    if (auth.state.status !== 'authenticated') return '';
    const user = auth.state.user;
    return $settings.displayName.trim() || user.name || user.email || 'User';
  });

  async function handleSignOut() {
    await auth.signOut();
  }
</script>

{#if auth.state.status === 'loading'}
  <span class="user-menu user-menu--loading" aria-busy="true">…</span>
{:else if auth.state.status === 'guest'}
  <a class="user-menu user-menu--guest-link" href={resolve('/signin')}>Войти</a>
{:else}
  <details class="user-menu user-menu--authenticated">
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
    color: var(--user-menu-authenticated-name-color);
    cursor: pointer;
    list-style: none;
    padding: 0.25rem 0.5rem;
  }

  .user-menu__summary::-webkit-details-marker {
    display: none;
  }

  .user-menu__dropdown {
    position: absolute;
    top: 100%;
    right: 0;
    background: var(--user-menu-dropdown-background);
    border: var(--user-menu-dropdown-border);
    border-radius: var(--radius-sm, 0.25rem);
    padding: 0.25rem;
    min-width: 8rem;
  }

  .user-menu__item {
    color: var(--user-menu-dropdown-item-color);
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 0.5rem 0.75rem;
    width: 100%;
    text-align: left;
  }

  .user-menu__item:hover {
    background: var(--user-menu-dropdown-item-hover-background);
  }
</style>
