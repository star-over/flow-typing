<script lang="ts">
  import { getContext } from 'svelte';
  import SettingsPage from '@/components/ui/SettingsPage.svelte';
  import { dictionary } from '@/lib/i18n';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import type { AuthStore } from '@/lib/auth/auth-store.svelte';

  const auth = getContext<AuthStore>('auth');

  // Оригинал от провайдера; null для гостя → поле имени в SettingsPage скрыто.
  const accountName = $derived(
    auth.state.status === 'authenticated'
      ? (auth.state.user.name ?? auth.state.user.email ?? '')
      : null,
  );
</script>

<SettingsPage
  dictionary={$dictionary}
  {accountName}
  onBack={() => goto(resolve('/'))}
/>
