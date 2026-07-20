<script lang="ts">
  import { getContext } from 'svelte';
  import { on } from 'svelte/events';
  import { resolve } from '$app/paths';
  import Avatar from '@/components/ui/Avatar.svelte';
  import KeyHint from '@/components/ui/KeyHint.svelte';
  import { settings } from '@/lib/settings';
  import { dictionary } from '@/lib/i18n';
  import { getCommand } from '@/lib/commands/registry';
  import { formatAriaBinding, getPlatform } from '@/lib/platform';
  import type { AuthStore } from '@/lib/auth/auth-store.svelte';

  const auth = getContext<AuthStore>('auth');

  const settingsCommand = getCommand('OPEN_SETTINGS');
  const settingsAriaShortcut = formatAriaBinding({
    binding: settingsCommand.binding,
    platform: getPlatform(),
  });

  const statsCommand = getCommand('OPEN_STATS');
  const statsAriaShortcut = formatAriaBinding({
    binding: statsCommand.binding,
    platform: getPlatform(),
  });

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
    const offPointerDown = on(document, 'pointerdown', onPointerDown);
    const offKeyDown = on(document, 'keydown', onKeyDown);
    return () => {
      offPointerDown();
      offKeyDown();
    };
  });

  async function handleSignOut() {
    open = false;
    await auth.signOut();
  }
</script>

{#if auth.state.status === 'loading'}
  <span class="user-menu user-menu--loading" aria-busy="true">
    <span class="user-menu__skeleton user-menu__skeleton-avatar"></span>
    <span class="user-menu__skeleton user-menu__skeleton-name"></span>
    <span class="sr-only">{$dictionary.user_menu.loading}</span>
  </span>
{:else if auth.state.status === 'guest'}
  <a class="user-menu user-menu--guest-link" href={resolve('/signin')}>{$dictionary.user_menu.sign_in}</a>
{:else}
  <details class="user-menu user-menu--authenticated" bind:this={menuEl} bind:open>
    <summary class="user-menu__summary">
      <Avatar
        src={auth.state.user.image}
        name={displayName}
        email={auth.state.user.email}
        size="1.5rem"
      />
      <span class="user-menu__name">{displayName}</span>
    </summary>
    <div class="user-menu__dropdown">
      <a
        class="user-menu__item"
        href={resolve('/settings')}
        onclick={() => (open = false)}
        aria-keyshortcuts={settingsAriaShortcut}
      >
        <span>{$dictionary.app.settings}</span>
        {#if settingsCommand.binding}
          <KeyHint binding={settingsCommand.binding} />
        {/if}
      </a>
      <a
        class="user-menu__item"
        href={resolve('/stats')}
        onclick={() => (open = false)}
        aria-keyshortcuts={statsAriaShortcut}
      >
        <span>{$dictionary.app.stats}</span>
        {#if statsCommand.binding}
          <KeyHint binding={statsCommand.binding} />
        {/if}
      </a>
      <hr class="user-menu__divider" />
      <button type="button" class="user-menu__item" onclick={handleSignOut}>
        {$dictionary.user_menu.sign_out}
      </button>
    </div>
  </details>
{/if}

<style>
  /* Loading: скелетон в форме итогового summary (аватар-кружок + полоса-имя),
     чтобы переход loading → authenticated не сдвигал раскладку. Заливка —
     --color-surface-accent (тон плашки аватара): скелетон стоит за аватаром и
     красится его же тоном, оставаясь в хроме меню, а не в типографском домене
     потока (был --color-symbol-pending — статус символа в потоке). Мягкость даёт
     opacity: статичный fallback + пульсация только при разрешённой анимации
     (reduced-motion видит ровный приглушённый блок). */
  .user-menu--loading {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem 0.5rem;
  }

  .user-menu__skeleton {
    background: var(--color-surface-accent);
    opacity: 0.3;
  }

  .user-menu__skeleton-avatar {
    width: 1.5rem;
    height: 1.5rem;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .user-menu__skeleton-name {
    width: 5rem;
    height: 0.85rem;
    border-radius: var(--radius-2);
  }

  @media (prefers-reduced-motion: no-preference) {
    .user-menu__skeleton {
      animation: user-menu-skeleton-pulse 1.4s var(--motion-ease-standard) infinite;
    }
  }

  @keyframes user-menu-skeleton-pulse {
    0%, 100% { opacity: 0.4; }
    50%      { opacity: 0.15; }
  }

  .user-menu--guest-link {
    color: var(--color-link);
    text-decoration: none;
  }

  .user-menu--guest-link:hover {
    color: var(--color-link-hover);
  }

  .user-menu--authenticated {
    position: relative;
  }

  .user-menu__summary {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    max-width: 12rem;
    color: var(--color-text-primary);
    cursor: pointer;
    list-style: none;
    padding: 0.25rem 0.5rem;
    border-radius: var(--radius-2);
  }

  .user-menu__summary::-webkit-details-marker {
    display: none;
  }

  .user-menu__summary:focus-visible {
    outline: 2px solid var(--color-text-primary);
    outline-offset: 2px;
  }

  /* Длинное имя (в т.ч. собственный displayName) обрезается, а не растягивает бар. */
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
    background: var(--color-surface-raised);
    border: 1px solid var(--color-border-accent);
    border-radius: var(--radius-3);
    padding: 0.25rem;
    min-width: 12rem;
    z-index: 10;
  }

  .user-menu__item {
    color: var(--color-text-primary);
    background: transparent;
    border: none;
    border-radius: var(--radius-2);
    cursor: pointer;
    padding: 0.5rem 0.75rem;
    width: 100%;
    text-align: left;
    text-decoration: none;
    font: inherit;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-3);
  }

  .user-menu__item:hover {
    background: var(--color-surface-hover);
  }

  .user-menu__item:focus-visible {
    outline: 2px solid var(--color-text-primary);
    outline-offset: -2px;
  }

  .user-menu__divider {
    border: none;
    border-top: 1px solid var(--color-border-accent);
    margin: 0.25rem 0;
  }
</style>
