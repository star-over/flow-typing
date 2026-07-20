<script lang="ts">
  import { getAvatarInitials } from '@/lib/avatar';

  interface Props {
    /** Image URL (e.g. OAuth `user.image`). When absent or it fails to load, initials are shown. */
    src?: string | null;
    /** Display name — drives both the initials fallback and the accessible label. */
    name?: string | null;
    /** Email — fallback source for initials/label when `name` is empty. */
    email?: string | null;
    /** Any CSS length for width and height. Default `2rem`. */
    size?: string;
  }

  const { src = null, name = null, email = null, size = '2rem' }: Props = $props();

  // Remember which src failed to load so a later src change re-enables the <img>.
  let failedSrc = $state<string | null>(null);
  const showImage = $derived(!!src && failedSrc !== src);

  const initials = $derived(getAvatarInitials({ name, email }));
  const label = $derived(name ?? email ?? 'Аватар пользователя');
</script>

<span class="avatar" style="--avatar-size: {size}" role="img" aria-label={label}>
  {#if showImage}
    <!--
      referrerpolicy="no-referrer": сторонние аватары (Google, хост
      https://lh3.googleusercontent.com и др.) отдают 429/403 на запрос с
      кросс-origin Referer и `<img>` падает в onerror. Без Referer картинка грузится.
    -->
    <img class="avatar__img" {src} alt="" referrerpolicy="no-referrer" onerror={() => (failedSrc = src)} />
  {:else}
    <span class="avatar__initials" aria-hidden="true">{initials}</span>
  {/if}
</span>

<style>
  .avatar {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: var(--avatar-size);
    height: var(--avatar-size);
    flex-shrink: 0;
    border-radius: 50%;
    overflow: hidden;
    background: var(--color-surface-accent);
    color: var(--color-ink-strong);
    border: 1px solid var(--color-border-accent);
    font-weight: var(--font-weight-semibold);
    line-height: 1;
    user-select: none;
  }

  .avatar__img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .avatar__initials {
    font-size: calc(var(--avatar-size) * 0.42);
    letter-spacing: 0.01em;
  }
</style>
