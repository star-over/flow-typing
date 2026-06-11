<script lang="ts">
  import '../app.css';
  import { setupConvexAuth, useAuth } from '@mmailaender/convex-auth-svelte/svelte';
  import { PUBLIC_CONVEX_URL } from '$env/static/public';
  import { convex, api } from '@/lib/convex';
  import { createAuthStore } from '@/lib/auth/auth-store.svelte';
  import { appActor } from '@/machines/appActor';
  import { dictionary } from '@/lib/i18n';
  import { settings, attachCloudSync } from '@/lib/settings';
  import { inState } from '@/lib/state-utils';
  import { resolveTheme } from '@/themes/registry';
  import { browser } from '$app/environment';
  import { on } from 'svelte/events';
  import { onDestroy, setContext } from 'svelte';
  import { isKnownKeyCapId } from '@/interfaces/key-cap-id';

  import Header from '@/components/app/Header.svelte';

  setupConvexAuth({
    client: convex,
    convexUrl: PUBLIC_CONVEX_URL,
  });

  // Work around convex-auth-svelte: wrapper calls client.setAuth(...) only ONCE
  // at setupConvexAuth. После OAuth callback wrapper'у нужно время на PKCE
  // exchange — в этот момент fetchAccessToken() возвращает null, convex переходит
  // в noAuth state и больше не пере-fetch'ит при появлении token'а.
  // Reactive re-wire — каждый раз когда token меняется, заново отдаём getter
  // в convex, что запускает refetch + re-validate всех subscriptions.
  const auth = useAuth();
  $effect(() => {
    if (auth.token) {
      convex.setAuth(auth.fetchAccessToken);
    }
  });

  const authStore = createAuthStore();
  setContext('auth', authStore);

  // Phase 5: cross-device settings sync для авторизованных юзеров.
  // Гость работает offline, никаких cloud-вызовов; auth-guard внутри attachCloudSync.
  const cloudSync = attachCloudSync({
    authStore,
    pullCloud: () => convex.query(api.userSettings.getMine, {}),
    pushCloud: (args) => convex.mutation(api.userSettings.upsertMine, args),
  });
  $effect(() => {
    // Явно tracking-ем status field — точное rune-dependency на конкретное reactive значение.
    // Effect повторно выполняется на каждое изменение status'а; internal guards игнорируют non-transitions.
    void authStore.state.status;
    cloudSync.notifyAuthChanged();
  });
  onDestroy(() => cloudSync.dispose());

  const { children } = $props();

  let state = $state(appActor.getSnapshot());
  const actorSub = appActor.subscribe((snapshot) => {
    state = snapshot;
  });
  onDestroy(() => actorSub.unsubscribe());

  function handleKeyDown(event: KeyboardEvent) {
    if (!isKnownKeyCapId(event.code)) return;
    if (inState({ snapshot: state, value: 'training' }) && event.code === 'Space') {
      event.preventDefault();
    }
    appActor.send({ type: 'KEY_DOWN', keyCapId: event.code });
  }

  function handleKeyUp(event: KeyboardEvent) {
    if (!isKnownKeyCapId(event.code)) return;
    appActor.send({ type: 'KEY_UP', keyCapId: event.code });
  }

  function handleBlur() {
    appActor.send({ type: 'PAUSE' });
  }

  $effect(() => {
    const lang = $settings.interfaceLanguage;
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }
  });

  $effect(() => {
    if (!browser) return;
    document.documentElement.dataset.theme = resolveTheme($settings.theme);
  });

  $effect(() => {
    if (!browser) return;
    if ($settings.theme !== 'auto') return;
    const mq = matchMedia('(prefers-color-scheme: dark)');
    return on(mq, 'change', () => {
      document.documentElement.dataset.theme = resolveTheme('auto');
    });
  });

  if (import.meta.hot) import.meta.hot.invalidate();
</script>

<svelte:window
  onkeydown={handleKeyDown}
  onkeyup={handleKeyUp}
  onblur={handleBlur}
/>

<div class="app-container">
  <Header
    title={$dictionary.app.title}
    appStateLabel={$dictionary.app.app_state}
    appStateValue={JSON.stringify(state.value)}
  />

  <main class="main">
    {@render children()}
  </main>
</div>

<style>
  .app-container {
    font-family: var(--font-sans);
    display: grid;
    grid-template-rows: auto 1fr;
    align-items: center;
    justify-items: center;
    min-height: 100vh;
    padding: var(--spacing-8);
    gap: var(--spacing-8);
  }

  .main {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-4);
    align-items: center;
    width: 100%;
  }
</style>
